import { styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";

export const Hero = styled("div")({
  display: "grid",
  justifyItems: "center",
  gap: 6,
  textAlign: "center",
  padding: "6px 0 4px",
  "& .avatar": {
    width: 72,
    height: 72,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "var(--primary-soft)",
    color: "var(--primary-dark)",
    fontWeight: 800,
    fontSize: 24,
  },
  "& h2": { margin: "6px 0 0", fontFamily: displayFont, fontSize: 21, color: "var(--heading)" },
  "& p": { margin: 0, color: "var(--muted)", fontSize: 13 },
});

export const Lines = styled("dl")({
  margin: 0,
  "& div": {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    padding: "13px 0",
    borderBottom: "1px solid var(--line-soft)",
    fontSize: 14,
  },
  "& div:last-of-type": { borderBottom: 0 },
  "& dt": { color: "var(--muted)" },
  "& dd": { margin: 0, fontWeight: 700, textAlign: "right" },
});

export const Note = styled("p")({
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--muted)",
  textAlign: "center",
});
