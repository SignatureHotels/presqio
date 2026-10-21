import { styled } from "@mui/material/styles";
import { headingFont, media } from "@/theme/media";

export const TitleRow = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  [media.phone]: { flexWrap: "wrap" },
});

export const Title = styled("h2")({
  margin: 0,
  fontFamily: headingFont,
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: -0.3,
  color: "var(--heading)",
  [media.phone]: { fontSize: 14 },
});

export const Subtitle = styled("p")({
  margin: 0,
  marginTop: 5,
  fontSize: 12,
  color: "var(--muted)",
  [media.phone]: {
    fontSize: 11,
    lineHeight: 1.6,
  },
});
