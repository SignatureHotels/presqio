import { styled } from "@mui/material/styles";
import { ease, media } from "../../HomePage.style";

export const Chips = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 24,
  "& button": {
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "inherit",
    font: "inherit",
    fontSize: 14,
    fontWeight: 600,
    padding: "9px 14px",
    borderRadius: 999,
    cursor: "pointer",
    transition: `background 0.2s ${ease}, color 0.2s ${ease}, border-color 0.2s ${ease}`,
  },
  "& button[aria-selected='true']": { background: "var(--forest)", borderColor: "var(--forest)", color: "#fff" },
  "& button:focus-visible": { outline: "2px solid var(--primary)", outlineOffset: 2 },
});

export const Panel = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
  gap: 36,
  padding: "clamp(20px, 3vw, 36px)",
  borderRadius: 24,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  [media.tablet]: { gridTemplateColumns: "1fr", gap: 24 },
  "& h3": { fontSize: "clamp(22px, 2.4vw, 28px)", margin: "0 0 10px" },
  "& .lead": { color: "var(--muted)", lineHeight: 1.6, margin: "0 0 18px" },
  "& ul.fixes": { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 },
  "& ul.fixes li": { display: "grid", gap: 2 },
  "& ul.fixes s": { color: "var(--muted)", textDecorationColor: "var(--primary)" },
  "& .points": { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, [media.phone]: { gridTemplateColumns: "1fr" } },
  "& .points h4": { margin: "12px 0 4px", fontSize: 16 },
  "& .points p": { margin: 0, color: "var(--muted)", lineHeight: 1.5, fontSize: 14 },
  "& .more": { marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 },
});
