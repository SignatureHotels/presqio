import { styled } from "@mui/material/styles";

/** A titled block of label/value pairs laid out as a responsive grid. */
export const DetailSection = styled("section")({
  marginTop: 22,
  "& h3": {
    margin: "0 0 10px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "var(--muted)",
  },
  "& dl": {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: 10,
  },
  "& dl > div": {
    padding: "10px 12px",
    border: "1px solid var(--line-soft)",
    borderRadius: 10,
    minWidth: 0,
  },
  "& dt": { color: "var(--muted)", fontSize: 12, marginBottom: 4 },
  "& dd": { margin: 0, fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" },
  "& .salary-lines": { display: "grid", gap: 2, fontWeight: 400, fontSize: 13 },
  "& .salary-lines span": { display: "flex", justifyContent: "space-between", gap: 8 },
});

/** Sign-in details to hand to the employee. */
export const CodeBox = styled("div")({
  marginTop: 18,
  padding: 16,
  borderRadius: 14,
  border: "1px dashed var(--primary)",
  background: "var(--primary-tint)",
  display: "grid",
  gap: 8,
  "& .code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: 3,
    color: "var(--heading)",
  },
  "& dl": {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "4px 14px",
    fontSize: 13,
  },
  "& dt": { color: "var(--muted)" },
  "& dd": { margin: 0, fontWeight: 700, overflowWrap: "anywhere" },
  "& small": { color: "var(--muted)" },
});

export const PhotoBox = styled("figure")({
  margin: "18px 0 0",
  display: "flex",
  gap: 14,
  alignItems: "center",
  "& img": {
    width: 96,
    height: 96,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid var(--line-soft)",
  },
  "& figcaption": { fontSize: 13, color: "var(--muted)", lineHeight: 1.5 },
});
