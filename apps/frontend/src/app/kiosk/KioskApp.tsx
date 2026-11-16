import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskInfo, KioskLookupResponse, KioskPunchResponse } from "@presqio/lib";
import { ApiRequestError } from "@/api/client";
import { errorText, locale, useT } from "@/i18n";
import { LanguagePicker } from "@/i18n/LanguagePicker";
import { kioskApi, kioskToken } from "@/api/kiosk";
import { captureSelfie, openFrontCamera, showStream, stopStream } from "@/app/employee/utils/capture";
import { KioskRoot } from "./KioskApp.style";

type Phase = "loading" | "pair" | "idle" | "confirm" | "sending" | "result";
/** A confirm screen left alone goes back to the keypad, so the next person never sees someone else. */
const CONFIRM_TIMEOUT_MS = 30_000;
const RESULT_MS = 5_000;

const clock = (timeZone: string, now: Date) => ({
  time: now.toLocaleTimeString(locale(), { timeZone, hour: "numeric", minute: "2-digit" }),
  date: now.toLocaleDateString(locale(), { timeZone, weekday: "long", day: "numeric", month: "long" }),
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
  const t = useT();

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
      setError(errorText(caught));
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
      .catch((caught) => { if (!signedOut(caught)) { setError(errorText(caught)); setPhase("idle"); } });
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
        e.name === "NotAllowedError" ? t("kiosk.cameraOff") : t("kiosk.cameraFail")));
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
      setError(errorText(caught));
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
      if (!signedOut(caught)) setError(errorText(caught));
    }
  }

  async function punch() {
    if (!person || !video.current) return;
    let photo: string;
    try {
      photo = captureSelfie(video.current);
    } catch (caught) {
      return setError(errorText(caught));
    }
    setPhase("sending"); setError("");
    try {
      setResult(await kioskApi.punch({ employeeCode: person.employeeCode, action: person.action, photo, idempotencyKey: key() }));
      setPhase("result");
    } catch (caught) {
      if (!signedOut(caught)) { setResult({ accepted: false, message: errorText(caught) }); setPhase("result"); }
    }
  }

  const tap = (value: string) => setDigits((d) => (value === "⌫" ? d.slice(0, -1) : (d + value).slice(0, 20)));
  const { time, date } = clock(info?.timezone ?? "Asia/Kolkata", now);
  const checkIn = person?.action === "CHECK_IN";

  if (phase === "loading") return <KioskRoot><div className="center muted">{t("kiosk.starting")}</div></KioskRoot>;

  if (phase === "pair")
    return (
      <KioskRoot>
        <form className="center pair" onSubmit={(e) => { e.preventDefault(); void pair(digits); }}>
          <div className="brand">Presqio</div>
          <LanguagePicker tone="dark" />
          <h1>{t("kiosk.setupTitle")}</h1>
          <p className="muted">{t("kiosk.setupIntro")}</p>
          <input aria-label={t("kiosk.pairCode")} className="code" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="XXXX-XXXX" value={digits} onChange={(e) => setDigits(e.target.value.toUpperCase().slice(0, 9))} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={digits.replace(/[^A-Z0-9]/g, "").length !== 8}>{t("kiosk.pair")}</button>
        </form>
      </KioskRoot>
    );

  return (
    <KioskRoot>
      <header>
        <LanguagePicker tone="dark" />
        <div className="where">
          <strong>{info?.organizationName}</strong>
          <span className="muted"> · {info?.branchName}</span>
        </div>
        <button className="link" type="button" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen?.().catch(() => undefined)}>
          {t("kiosk.fullscreen")}
        </button>
      </header>

      {phase === "idle" && (
        <form className="center idle" onSubmit={(e) => { e.preventDefault(); void lookup(); }}>
          <div className="clock">{time}</div>
          <div className="muted date">{date}</div>
          <label htmlFor="kiosk-id">{t("kiosk.enterId")}</label>
          <div className="entry">
            {info?.employeeIdPrefix && !/^[A-Za-z]/.test(digits) && <span className="prefix">{info.employeeIdPrefix}</span>}
            <input id="kiosk-id" autoComplete="off" spellCheck={false} value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\s+/g, "").slice(0, 20))} placeholder="0001" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="keypad" role="group" aria-label={t("kiosk.keypad")}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((k) => (
              <button key={k} type="button" onClick={() => tap(k)} aria-label={k === "⌫" ? t("kiosk.delete") : k}>{k}</button>
            ))}
            <button type="submit" className="go" disabled={!digits.trim()}>{t("kiosk.go")}</button>
          </div>
          {cameraError && <p className="error">{cameraError}</p>}
        </form>
      )}

      {(phase === "confirm" || phase === "sending") && person && (
        <div className="center confirm">
          <h1>{t("kiosk.hi", { name: person.firstName })}</h1>
          <p className="muted">
            {checkIn
              ? person.shift ? t("kiosk.checkingInFor", { shift: person.shift }) : t("kiosk.checkingIn")
              : t("kiosk.checkingOut", { time: person.checkedInAt ? twelve(person.checkedInAt) : "—" })}
          </p>
          <div className="viewfinder">
            <video ref={video} playsInline muted aria-label={t("check.preview")} />
            {phase === "sending" && <div className="scan">{t("kiosk.saving")}</div>}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className={checkIn ? "primary big" : "primary big out"} type="button" disabled={phase === "sending" || Boolean(cameraError)} onClick={() => void punch()}>
            {checkIn ? t("check.takeIn") : t("check.takeOut")}
          </button>
          <button className="link" type="button" disabled={phase === "sending"} onClick={reset}>{t("kiosk.notYou", { name: person.firstName })}</button>
        </div>
      )}

      {phase === "result" && result && (
        <div className={`center result ${result.accepted ? "ok" : "bad"}`} role="status">
          <div className="badge" aria-hidden>{result.accepted ? "✓" : "!"}</div>
          {result.accepted ? (
            <>
              <h1>{t(result.action === "CHECK_IN" ? "kiosk.checkedIn" : "kiosk.checkedOut", { name: result.name.split(" ")[0] })}</h1>
              <div className="clock small">{twelve(result.time)}</div>
              {result.earlyMinutes ? <p className="muted">{t("kiosk.early", { minutes: result.earlyMinutes })}</p> : null}
            </>
          ) : (
            <>
              <h1>{t("check.notRecorded")}</h1>
              <p>{result.message}</p>
            </>
          )}
          <button className="primary" type="button" onClick={reset}>{t("check.done")}</button>
        </div>
      )}

      <footer className="muted">{t("kiosk.footer")}</footer>
    </KioskRoot>
  );
}
