import { styled } from "@mui/material/styles";
import { headingFont, media } from "@/theme/media";

export const Metrics = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  margin: "18px 0",
  [media.phone]: { gap: 8 },
});

export const Metric = styled("div")({
  background: "var(--neutral-soft)",
  padding: 21,
  borderRadius: 12,
  "& strong": { fontSize: 26, fontFamily: headingFont },
  "& span": {
    display: "block",
    fontSize: 12,
    color: "var(--muted)",
    marginTop: 6,
  },
  [media.phone]: {
    padding: "14px 10px",
    "& strong": { fontSize: 24 },
    "& span": { fontSize: 10, lineHeight: 1.6 },
  },
});
