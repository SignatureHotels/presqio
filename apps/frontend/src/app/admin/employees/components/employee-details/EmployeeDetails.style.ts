import { styled } from "@mui/material/styles";

export const DetailList = styled("dl")({
  margin: "25px 0",
  "& > div": {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 25,
    padding: "14px 0",
    borderBottom: "1px solid var(--line-soft)",
    fontSize: 13,
  },
  "& dt": { color: "var(--muted)" },
  "& dd": {
    margin: 0,
    textAlign: "right",
    overflowWrap: "anywhere",
  },
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
