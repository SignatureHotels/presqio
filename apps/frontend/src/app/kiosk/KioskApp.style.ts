import { styled } from "@mui/material/styles";

const ink = "#f4f7f5";
const muted = "#9fb0a8";
const panel = "#17241f";
const line = "#2b3d36";
const accent = "#3fb27f";
const out = "#e0a43a";
const bad = "#f97066";

/** Full-screen, high-contrast and touch-sized: read from a step away, tapped with a thumb. */
export const KioskRoot = styled("main")({
  minHeight: "100dvh",
  background: "#0e1714",
  color: ink,
  display: "flex",
  flexDirection: "column",
  padding: "16px clamp(16px, 4vw, 48px)",
  boxSizing: "border-box",
  fontSize: 18,
  "& .muted": { color: muted },
  "& header": { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 16 },
  "& header .where": { flex: 1, minWidth: 160, textAlign: "center" },
  "& footer": { textAlign: "center", fontSize: 13, paddingTop: 12 },
  "& .center": { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", width: "100%", maxWidth: 520, margin: "0 auto" },
  "& h1": { margin: 0, fontSize: "clamp(26px, 5vw, 40px)", lineHeight: 1.15 },
  "& p": { margin: 0 },
  "& .clock": { fontSize: "clamp(56px, 13vw, 104px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  "& .clock.small": { fontSize: "clamp(40px, 9vw, 64px)" },
  "& .date": { marginTop: -6 },
  "& label": { marginTop: 18, fontSize: 20, fontWeight: 600 },
  "& .entry": { display: "flex", alignItems: "center", gap: 6, background: panel, border: `2px solid ${line}`, borderRadius: 14, padding: "6px 14px", width: "100%", maxWidth: 360, boxSizing: "border-box" },
  "& .entry:focus-within": { borderColor: accent },
  "& .prefix": { fontSize: 32, fontWeight: 700, color: muted, letterSpacing: "0.04em" },
  "& .entry input, & input.code": {
    flex: 1, minWidth: 0, background: "transparent", border: 0, outline: 0, color: ink, font: "inherit",
    fontSize: 32, fontWeight: 700, letterSpacing: "0.06em", padding: "6px 0", textTransform: "uppercase",
  },
  "& input.code": { flex: "none", background: panel, border: `2px solid ${line}`, borderRadius: 14, textAlign: "center", padding: "12px", width: "100%", maxWidth: 360 },
  "& .keypad": { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%", maxWidth: 360, marginTop: 4 },
  "& .keypad button": {
    minHeight: 64, fontSize: 28, fontWeight: 600, borderRadius: 14, border: `1px solid ${line}`, background: panel, color: ink, cursor: "pointer",
    touchAction: "manipulation",
  },
  "& .keypad button:active": { background: line },
  "& .keypad .go": { background: accent, borderColor: accent, color: "#06130d" },
  "& .keypad .go:disabled": { opacity: 0.45 },
  "& button.primary": {
    minHeight: 56, padding: "0 28px", fontSize: 20, fontWeight: 700, borderRadius: 14, border: 0, background: accent, color: "#06130d", cursor: "pointer",
  },
  "& button.primary.big": { width: "100%", maxWidth: 420, minHeight: 72, fontSize: 22 },
  "& button.primary.out": { background: out },
  "& button.primary:disabled": { opacity: 0.5, cursor: "default" },
  "& header button.link": { whiteSpace: "nowrap" },
  "& button.link": { background: "none", border: 0, color: muted, font: "inherit", fontSize: 16, textDecoration: "underline", cursor: "pointer", padding: 8 },
  "& .error": { color: bad, fontWeight: 600 },
  "& .viewfinder": { position: "relative", width: "min(78vw, 360px)", aspectRatio: "1", borderRadius: 24, overflow: "hidden", background: panel, border: `2px solid ${line}` },
  "& .viewfinder video": { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" },
  "& .scan": { position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(14,23,20,.6)", fontWeight: 700 },
  "& .result .badge": { width: 96, height: 96, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 52, fontWeight: 800 },
  "& .result.ok .badge": { background: accent, color: "#06130d" },
  "& .result.bad .badge": { background: bad, color: "#2a0603" },
  "& .pair p": { maxWidth: 420 },
  "& .brand": { fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: accent },
});
