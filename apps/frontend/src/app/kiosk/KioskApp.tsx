import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskInfo, KioskLookupResponse, KioskPunchResponse } from "@presqio/lib";
import { ApiRequestError, errorMessage } from "@/api/client";
import { kioskApi, kioskToken } from "@/api/kiosk";
import { captureSelfie, openFrontCamera, showStream, stopStream } from "@/app/employee/utils/capture";
import { KioskRoot } from "./KioskApp.style";

type Phase = "loading" | "pair" | "idle" | "confirm" | "sending" | "result";
/** A confirm screen left alone goes back to the keypad, so the next person never sees someone else. */
const CONFIRM_TIMEOUT_MS = 30_000;
const RESULT_MS = 5_000;

const clock = (timeZone: string, now: Date) => ({
  time: now.toLocaleTimeString("en-IN", { timeZone, hour: "numeric", minute: "2-digit" }),
  date: now.toLocaleDateString("en-IN", { timeZone, weekday: "long", day: "numeric", month: "long" }),
});
const twelve = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const key = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** A shared check-in device at a branch entrance: type your ID, take a selfie, done. */
export function KioskApp() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<KioskInfo | null>(null);
  const [digits, setDigits] = useState("");
  const [person, setPerson] = useState<KioskLookupResponse | null>(null);
  const [result, setResult] = useState<KioskPunchResponse | null>(null);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    document.title = "Check-in kiosk · Presqio";
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const signedOut = useCallback((caught: unknown) => {
    if (caught instanceof ApiRequestError && caught.status === 401) {
      kioskToken.clear();
      setInfo(null);
      setPhase("pair");
      setError(caught.message);
      return true;
    }
    return false;
  }, []);

  // Paired already? Ask the server who this kiosk is.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!kioskToken.get()) {
      setPhase("pair");
      if (code) void pair(code);
      return;
    }
    kioskApi.me().then((me) => { setInfo(me); setPhase("idle"); })
      .catch((caught) => { if (!signedOut(caught)) { setError(errorMessage(caught)); setPhase("idle"); } });
    // run once on load
  }, []);

  // Keep the screen awake while the kiosk is paired.
  useEffect(() => {
    if (!info) return;
    let lock: { release: () => Promise<void> } | null = null;
    const ask = () => (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } })
      .wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => undefined);
    void ask();
    const again = () => document.visibilityState === "visible" && void ask();
    document.addEventListener("visibilitychange", again);
    return () => { document.removeEventListener("visibilitychange", again); void lock?.release().catch(() => undefined); };
  }, [info]);

  // The camera opens once and stays on, so each check-in is instant.
  useEffect(() => {
    if (!info || !window.isSecureContext) return;
    let cancelled = false;
    openFrontCamera()
      .then((s) => { if (cancelled) stopStream(s); else stream.current = s; })
      .catch((e: DOMException) => !cancelled && setCameraError(
        e.name === "NotAllowedError" ? "Camera permission is off. Allow the camera for this site, then reload." : "This device's camera couldn't be opened."));
    return () => { cancelled = true; stopStream(stream.current); stream.current = null; };
  }, [info]);

  useEffect(() => {
    if (phase === "confirm" && video.current && stream.current) void showStream(video.current, stream.current).catch(() => undefined);
    if (phase === "confirm") {
      const timer = setTimeout(reset, CONFIRM_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "result") {
      const timer = setTimeout(reset, RESULT_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  function reset() {
    setDigits(""); setPerson(null); setResult(null); setError(""); setPhase("idle");
  }

  async function pair(code: string) {
    setError("");
    try {
      const paired = await kioskApi.pair(code);
      kioskToken.set(paired.token);
      setInfo(paired.kiosk);
      window.history.replaceState(null, "", window.location.pathname);
      setPhase("idle");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const employeeCode = () => {
    const typed = digits.trim().toUpperCase();
    const prefix = info?.employeeIdPrefix ?? "";
    // people may type the whole ID or just the number after the prefix
    return /^\d+$/.test(typed) && prefix ? `${prefix}${typed.padStart(4, "0")}` : typed;
  };

  async function lookup() {
    if (!digits.trim()) return;
    setError("");
    try {
      setPerson(await kioskApi.lookup(employeeCode()));
      setPhase("confirm");
    } catch (caught) {
      if (!signedOut(caught)) setError(errorMessage(caught));
    }
  }

  async function punch() {
    if (!person || !video.current) return;
    let photo: string;
    try {
      photo = captureSelfie(video.current);
    } catch (caught) {
      return setError(errorMessage(caught));
    }
    setPhase("sending"); setError("");
    try {
      setResult(await kioskApi.punch({ employeeCode: person.employeeCode, action: person.action, photo, idempotencyKey: key() }));
      setPhase("result");
    } catch (caught) {
      if (!signedOut(caught)) { setResult({ accepted: false, message: errorMessage(caught) }); setPhase("result"); }
    }
  }

  const tap = (value: string) => setDigits((d) => (value === "⌫" ? d.slice(0, -1) : (d + value).slice(0, 20)));
  const { time, date } = clock(info?.timezone ?? "Asia/Kolkata", now);
  const checkIn = person?.action === "CHECK_IN";

  if (phase === "loading") return <KioskRoot><div className="center muted">Starting…</div></KioskRoot>;

  if (phase === "pair")
    return (
      <KioskRoot>
        <form className="center pair" onSubmit={(e) => { e.preventDefault(); void pair(digits); }}>
          <div className="brand">Presqio</div>
          <h1>Set up this check-in kiosk</h1>
          <p className="muted">
            An admin creates the kiosk in Presqio (Branches → Kiosks) and gets an 8-character code. Enter it here.
          </p>
          <input aria-label="Pairing code" className="code" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="XXXX-XXXX" value={digits} onChange={(e) => setDigits(e.target.value.toUpperCase().slice(0, 9))} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={digits.replace(/[^A-Z0-9]/g, "").length !== 8}>Pair kiosk</button>
        </form>
      </KioskRoot>
    );

  return (
    <KioskRoot>
      <header>
        <div>
          <strong>{info?.organizationName}</strong>
          <span className="muted"> · {info?.branchName}</span>
        </div>
        <button className="link" type="button" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen?.().catch(() => undefined)}>
          Full screen
        </button>
      </header>

      {phase === "idle" && (
        <form className="center idle" onSubmit={(e) => { e.preventDefault(); void lookup(); }}>
          <div className="clock">{time}</div>
          <div className="muted date">{date}</div>
          <label htmlFor="kiosk-id">Enter your employee ID</label>
          <div className="entry">
            {info?.employeeIdPrefix && !/^[A-Za-z]/.test(digits) && <span className="prefix">{info.employeeIdPrefix}</span>}
            <input id="kiosk-id" autoComplete="off" spellCheck={false} value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\s+/g, "").slice(0, 20))} placeholder="0001" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="keypad" role="group" aria-label="Keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((k) => (
              <button key={k} type="button" onClick={() => tap(k)} aria-label={k === "⌫" ? "Delete" : k}>{k}</button>
            ))}
            <button type="submit" className="go" disabled={!digits.trim()}>Go</button>
          </div>
          {cameraError && <p className="error">{cameraError}</p>}
        </form>
      )}

      {(phase === "confirm" || phase === "sending") && person && (
        <div className="center confirm">
          <h1>Hi {person.firstName}</h1>
          <p className="muted">
            {checkIn ? `Checking in${person.shift ? ` for ${person.shift}` : ""}` : `Checking out · in since ${person.checkedInAt ? twelve(person.checkedInAt) : "earlier"}`}
          </p>
          <div className="viewfinder">
            <video ref={video} playsInline muted aria-label="Camera preview" />
            {phase === "sending" && <div className="scan">Saving…</div>}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className={checkIn ? "primary big" : "primary big out"} type="button" disabled={phase === "sending" || Boolean(cameraError)} onClick={() => void punch()}>
            {checkIn ? "Take selfie & check in" : "Take selfie & check out"}
          </button>
          <button className="link" type="button" disabled={phase === "sending"} onClick={reset}>Not {person.firstName}? Cancel</button>
        </div>
      )}

      {phase === "result" && result && (
        <div className={`center result ${result.accepted ? "ok" : "bad"}`} role="status">
          <div className="badge" aria-hidden>{result.accepted ? "✓" : "!"}</div>
          {result.accepted ? (
            <>
              <h1>{result.action === "CHECK_IN" ? "Checked in" : "Checked out"}, {result.name.split(" ")[0]}</h1>
              <div className="clock small">{twelve(result.time)}</div>
              {result.earlyMinutes ? <p className="muted">{result.earlyMinutes} min before your shift ends. It's recorded.</p> : null}
            </>
          ) : (
            <>
              <h1>Not recorded</h1>
              <p>{result.message}</p>
            </>
          )}
          <button className="primary" type="button" onClick={reset}>Done</button>
        </div>
      )}

      <footer className="muted">Your selfie is saved with each check-in and seen only by your employer's admins.</footer>
    </KioskRoot>
  );
}
