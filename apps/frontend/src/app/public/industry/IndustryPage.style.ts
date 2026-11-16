import { styled } from "@mui/material/styles";
import { media } from "../home/HomePage.style";

/** "Your workspace starts with": the preset shown beside the hero. */
export const Setup = styled("aside")({
  padding: "clamp(20px, 3vw, 32px)",
  borderRadius: 24,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  boxShadow: "0 24px 60px -32px rgba(23, 63, 53, 0.35)",
  "& .eyebrow": { fontSize: 12, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--primary-dark)" },
  "& h2": { fontSize: 16, margin: "18px 0 8px" },
  "& ul": { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 },
  "& li": { display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "var(--forest-soft)", fontSize: 14 },
  "& li span": { color: "var(--muted)", textAlign: "right" },
  "& .tip": { margin: "16px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.5 },
});

export const Fixes = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
  [media.tablet]: { gridTemplateColumns: "1fr" },
  "& article": { padding: 22 },
  "& s": { display: "block", color: "var(--muted)", textDecorationColor: "var(--primary)", marginBottom: 10 },
  "& p": { margin: 0, fontWeight: 600, lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" },
  "& p .icon": { flex: "none", marginTop: 4, color: "var(--forest)" },
});
