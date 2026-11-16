import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import type { AttemptOutcome } from "@presqio/lib";
import { errorText, rejectionText, useT } from "@/i18n";
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
  const t = useT();
  const verb = action === "CHECK_IN" ? t("action.checkIn") : t("action.checkOut");
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
            ? t("check.cameraOff")
            : t("check.cameraFail"),
        );
      });
    const stopWatch = watchBestFix(setFix, setGpsError);
    startAttempt().catch((caught) => setError(errorText(caught)));
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
        setCameraError(t("check.cameraResume")),
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
      return setError(errorText(caught));
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
      setError(errorText(caught));
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
    await startAttempt().catch((caught) => setError(errorText(caught)));
  }

  // Check-out happens at the home branch's perimeter; check-in at any of the employee's sites.
  const sites = [profile?.branch, ...(action === "CHECK_IN" ? (profile?.otherSites ?? []) : [])].filter(
    (b): b is NonNullable<typeof b> => Boolean(b?.radius),
  );
  const measured = fix
    ? sites
        .map((b) => ({ b, d: distanceMetres(fix.latitude, fix.longitude, b.latitude, b.longitude) }))
        .sort((x, y) => Number(y.d <= y.b.radius) - Number(x.d <= x.b.radius) || x.d - y.d)[0]
    : undefined;
  const branch = measured?.b ?? profile?.branch;
  const distance = measured ? measured.d : null;
  const anywhere = Boolean(profile?.checkInAnywhere);
  const gpsGood = fix ? fix.accuracy <= (branch?.radius ? branch.maxAccuracy : anywhere ? 100 : 0) : false;
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
              <h2>{outcome.action === "CHECK_IN" ? t("check.checkedIn") : t("check.checkedOut")}</h2>
              <div className="time">{outcome.time}</div>
              {outcome.earlyMinutes ? (
                <p>{t("check.earlyRecorded", { duration: earlyLabel(outcome.earlyMinutes) })}</p>
              ) : null}
              <p>
                {outcome.offsite
                  ? t("check.offsiteRecorded")
                  : t("check.atSite", { site: outcome.branchName ?? branch?.name ?? "", distance: outcome.distance ?? 0 })}{" "}
                {t("check.selfieSaved")}
              </p>
            </>
          ) : (
            <>
              <h2>{t("check.notRecorded")}</h2>
              <p>{rejectionText(outcome)}</p>
            </>
          )}
        </Result>
        <Actions>
          {outcome.accepted ? (
            <Button variant="contained" onClick={() => navigate("/employee", { replace: true })}>
              {t("check.done")}
            </Button>
          ) : (
            <>
              <Button variant="contained" onClick={() => void retry()}>
                {t("check.tryAgain")}
              </Button>
              <Button onClick={() => navigate("/employee")}>{t("check.backHome")}</Button>
            </>
          )}
        </Actions>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar>
        <Link to="/employee" aria-label={t("check.back")}>
          <Icon name="back" />
        </Link>
        <h1>{verb}</h1>
      </TopBar>
      {!secure && (
        <Alert severity="warning">
          {t("check.insecure")}
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Viewfinder>
        {/* The camera stays mounted so "Try again" reuses it; the captured photo sits on top. */}
        <video ref={video} playsInline muted aria-label={t("check.preview")} />
        {photo && <img src={photo} alt={t("check.yourSelfie")} />}
        {!photo && phase === "ready" && <Guide />}
        {phase === "sending" && <Scan />}
        {(cameraError || (phase === "preparing" && secure)) && (
          <div className="placeholder">
            {cameraError || t("check.openingCamera")}
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
            <Icon name="map" className="tiny" /> {t("check.findingLocation")}
          </Chip>
        ) : (
          <>
            <Chip tone={gpsGood ? "ok" : "wait"}>
              <Icon name="map" className="tiny" /> {t("check.gps", { metres: Math.round(fix.accuracy) })}
              {!gpsGood && ` ${t("check.improving")}`}
            </Chip>
            {distance !== null && (
              <Chip tone={inside || anywhere ? "ok" : "bad"}>
                <Icon name="pin" className="tiny" />
                {inside ? t("check.atBranch", { branch: branch?.name ?? "" }) : anywhere ? t("check.awayAllowed") : t("check.fromBranch", { metres: distance, branch: branch?.name ?? "" })}
              </Chip>
            )}
            {distance === null && anywhere && (
              <Chip tone="ok">
                <Icon name="pin" className="tiny" /> {t("check.canHere")}
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
        {phase === "sending" ? t("check.checking") : action === "CHECK_IN" ? t("check.takeIn") : t("check.takeOut")}
      </Shutter>
      <PrivacyNote>{t("check.privacy")}</PrivacyNote>
    </Screen>
  );
}
