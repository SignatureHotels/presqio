import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import type { AttemptOutcome } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { employeeApi } from "@/api/employee-client";
import { Icon } from "@/components";
import { useEmployeeSession } from "../../context/employee-session";
import { captureSelfie, openFrontCamera, showStream, stopStream } from "../../utils/capture";
import { distanceMetres, watchBestFix, type Fix } from "../../utils/location";
import { earlyLabel } from "../../utils/time";
import {
  Actions,
  Chip,
  Chips,
  Guide,
  PrivacyNote,
  Result,
  Scan,
  Screen,
  Shutter,
  TopBar,
  Viewfinder,
} from "./CheckPage.style";

type Phase = "preparing" | "ready" | "sending" | "done";

/** Guided check-in / check-out: live selfie + GPS, decided by the server. */
export function CheckPage() {
  const { action: param } = useParams();
  const action = param === "out" ? "CHECK_OUT" : "CHECK_IN";
  const verb = action === "CHECK_IN" ? "Check in" : "Check out";
  const { profile, setProfile } = useEmployeeSession();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("preparing");
  const [fix, setFix] = useState<Fix | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null);
  const secure = window.isSecureContext;

  const startAttempt = useCallback(async () => {
    setAttemptId(null);
    const attempt = await employeeApi.startAttempt({
      action,
      idempotencyKey: crypto.randomUUID().replace(/-/g, ""),
    });
    setAttemptId(attempt.attemptId);
  }, [action]);

  // Camera, GPS and a fresh server attempt all start together when the screen opens.
  useEffect(() => {
    if (!secure) return;
    let cancelled = false;
    // In development React runs this twice; only the latest run may touch the camera or errors.
    openFrontCamera()
      .then(async (s) => {
        if (cancelled || !video.current) return stopStream(s);
        stream.current = s;
        await showStream(video.current, s);
        if (!cancelled) setPhase("ready");
      })
      .catch((e: DOMException) => {
        if (cancelled) return;
        setCameraError(
          e.name === "NotAllowedError"
            ? "Camera permission is off. Allow the camera for this site in your browser settings."
            : "We couldn't open the camera on this device.",
        );
      });
    const stopWatch = watchBestFix(setFix, setGpsError);
    startAttempt().catch((caught) => setError(errorMessage(caught)));
    return () => {
      cancelled = true;
      stopWatch();
      stopStream(stream.current);
    };
  }, [secure, startAttempt]);

  // A rejected result temporarily unmounts the video. Reattach its live stream on retry.
  useEffect(() => {
    if (phase === "ready" && video.current && stream.current) {
      void showStream(video.current, stream.current).catch(() =>
        setCameraError("Could not resume the camera. Go back and try again."),
      );
    }
  }, [phase]);

  async function submit() {
    if (!video.current || !fix || !attemptId) return;
    setError("");
    let selfie: string;
    try {
      selfie = captureSelfie(video.current);
    } catch (caught) {
      return setError(errorMessage(caught));
    }
    setPhoto(selfie);
    setPhase("sending");
    try {
      const result = await employeeApi.submitAttempt(attemptId, { ...fix, photo: selfie });
      setOutcome(result);
      if (result.accepted) {
        setProfile(result.profile);
        stopStream(stream.current);
      }
      setPhase("done");
    } catch (caught) {
      // Expired or already-used attempts: get a new one so "Try again" just works.
      setError(errorMessage(caught));
      setPhoto(null);
      setPhase("ready");
      startAttempt().catch(() => undefined);
    }
  }

  async function retry() {
    setError("");
    setOutcome(null);
    setPhoto(null);
    setPhase("ready");
    await startAttempt().catch((caught) => setError(errorMessage(caught)));
  }

  const branch = profile?.branch;
  const distance =
    fix && branch?.radius ? distanceMetres(fix.latitude, fix.longitude, branch.latitude, branch.longitude) : null;
  const gpsGood = fix && branch ? fix.accuracy <= branch.maxAccuracy : false;
  const inside = distance !== null && branch ? distance <= branch.radius : false;

  if (phase === "done" && outcome) {
    return (
      <Screen>
        <Result ok={outcome.accepted}>
          <span className="badge">
            <Icon name={outcome.accepted ? "check" : "map"} />
          </span>
          {outcome.accepted ? (
            <>
              <h2>{outcome.action === "CHECK_IN" ? "You're checked in" : "You're checked out"}</h2>
              <div className="time">{outcome.time}</div>
              {outcome.earlyMinutes ? (
                <p>
                  Recorded {earlyLabel(outcome.earlyMinutes)} before your shift ends. Your admin can see
                  this check-out time.
                </p>
              ) : null}
              <p>
                {branch?.name} · {outcome.distance} m from the branch. Your selfie was saved with this
                record.
              </p>
            </>
          ) : (
            <>
              <h2>Not recorded</h2>
              <p>{outcome.message}</p>
            </>
          )}
        </Result>
        <Actions>
          {outcome.accepted ? (
            <Button variant="contained" onClick={() => navigate("/employee", { replace: true })}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="contained" onClick={() => void retry()}>
                Try again
              </Button>
              <Button onClick={() => navigate("/employee")}>Back to home</Button>
            </>
          )}
        </Actions>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar>
        <Link to="/employee" aria-label="Back">
          <Icon name="back" />
        </Link>
        <h1>{verb}</h1>
      </TopBar>
      {!secure && (
        <Alert severity="warning">
          Camera and location only work over a secure (https) connection. Open Presqio from its https
          address.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Viewfinder>
        {/* The camera stays mounted so "Try again" reuses it; the captured photo sits on top. */}
        <video ref={video} playsInline muted aria-label="Camera preview" />
        {photo && <img src={photo} alt="Your selfie" />}
        {!photo && phase === "ready" && <Guide />}
        {phase === "sending" && <Scan />}
        {(cameraError || (phase === "preparing" && secure)) && (
          <div className="placeholder">
            {cameraError || "Opening camera…"}
          </div>
        )}
      </Viewfinder>
      <Chips aria-live="polite">
        {gpsError ? (
          <Chip tone="bad">
            <Icon name="map" className="tiny" /> {gpsError}
          </Chip>
        ) : !fix ? (
          <Chip tone="wait">
            <Icon name="map" className="tiny" /> Finding your location…
          </Chip>
        ) : (
          <>
            <Chip tone={gpsGood ? "ok" : "wait"}>
              <Icon name="map" className="tiny" /> GPS ±{Math.round(fix.accuracy)} m
              {!gpsGood && " · improving…"}
            </Chip>
            {distance !== null && (
              <Chip tone={inside ? "ok" : "bad"}>
                <Icon name="pin" className="tiny" />
                {inside ? `At ${branch?.name}` : `${distance} m from ${branch?.name}`}
              </Chip>
            )}
          </>
        )}
      </Chips>
      <Shutter
        type="button"
        onClick={() => void submit()}
        disabled={phase !== "ready" || !fix || !attemptId || Boolean(cameraError)}
      >
        <Icon name="camera" />
        {phase === "sending" ? "Checking…" : `Take selfie & ${verb.toLowerCase()}`}
      </Shutter>
      <PrivacyNote>Your location is checked once, now. Presqio doesn't track you in the background.</PrivacyNote>
    </Screen>
  );
}
