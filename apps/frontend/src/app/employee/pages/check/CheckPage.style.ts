import { keyframes, styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";
import { motionOk } from "../../EmployeeApp.style";

const sweep = keyframes`
  0% { top: 12%; opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { top: 86%; opacity: 0; }
`;
const pop = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
`;

export const Screen = styled("main")({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "max(16px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom))",
  gap: 16,
});

export const TopBar = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 10,
  "& a": {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid var(--line)",
    display: "grid",
    placeItems: "center",
    color: "var(--ink)",
    background: "var(--surface)",
  },
  "& h1": { margin: 0, fontFamily: displayFont, fontSize: 20, color: "var(--heading)" },
});

export const Viewfinder = styled("div")({
  position: "relative",
  aspectRatio: "1",
  borderRadius: 28,
  overflow: "hidden",
  background: "var(--forest)",
  display: "grid",
  placeItems: "center",
  "& video, & img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    // Mirror the live preview so it feels like a mirror; the saved photo is not mirrored.
    transform: "scaleX(-1)",
  },
  // The captured selfie covers the live preview.
  "& img": { position: "absolute", inset: 0, transform: "none" },
  "& .placeholder": {
    position: "absolute",
    color: "var(--nav-muted)",
    fontWeight: 700,
    padding: 24,
    textAlign: "center",
  },
});

/** Face guide ring over the camera. */
export const Guide = styled("div")({
  position: "absolute",
  inset: "12%",
  borderRadius: "50%",
  border: "3px dashed rgba(255, 255, 255, 0.75)",
  pointerEvents: "none",
});

export const Scan = styled("div")({
  position: "absolute",
  left: "18%",
  right: "18%",
  height: 3,
  borderRadius: 3,
  background: "var(--primary)",
  boxShadow: "0 0 18px var(--primary)",
  display: "none",
  [motionOk]: { display: "block", animation: `${sweep} 1.6s ease-in-out infinite alternate` },
});

export const Chips = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
});

export const Chip = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: "ok" | "wait" | "bad" }>(({ tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  background: tone === "ok" ? "var(--success-soft)" : tone === "bad" ? "var(--error-soft)" : "var(--neutral-soft)",
  color: tone === "ok" ? "var(--success-ink)" : tone === "bad" ? "var(--error-ink)" : "var(--muted)",
}));

export const Shutter = styled("button")({
  minHeight: 60,
  border: 0,
  borderRadius: 18,
  background: "var(--primary)",
  color: "var(--ink)",
  fontSize: 17,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  "&:disabled": { opacity: 0.5 },
});

export const Result = styled("section", {
  shouldForwardProp: (prop) => prop !== "ok",
})<{ ok: boolean }>(({ ok }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 10,
  padding: "20px 10px",
  "& .badge": {
    width: 92,
    height: 92,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: ok ? "var(--success-soft)" : "var(--error-soft)",
    color: ok ? "var(--success-ink)" : "var(--error-ink)",
    [motionOk]: { animation: `${pop} 0.5s ease-out both` },
    "& .icon": { width: 44, height: 44, strokeWidth: 2.2 },
  },
  "& h2": { margin: "10px 0 0", fontFamily: displayFont, fontSize: 26, color: "var(--heading)" },
  "& p": { margin: 0, color: "var(--muted)", lineHeight: 1.55, maxWidth: 320 },
  "& .time": { fontFamily: displayFont, fontSize: 40, fontWeight: 800, color: "var(--heading)" },
}));

export const Actions = styled("div")({
  display: "grid",
  gap: 10,
  "& .MuiButton-root": { minHeight: 52, borderRadius: 16, fontSize: 16, fontWeight: 800 },
});

export const PrivacyNote = styled("p")({
  margin: 0,
  textAlign: "center",
  fontSize: 12,
  color: "var(--muted)",
});
