import { styled } from "@mui/material/styles";
import { narrow } from "../../OnboardingPage.style";

/** Latitude, longitude and the "Use my location" button. */
export const CoordinateRow = styled("div")({
  display: "grid",
  gridTemplateColumns: "1fr 1fr auto",
  gap: 12,
  alignItems: "start",
  "& .MuiButton-root": {
    minHeight: 56,
    textTransform: "none",
    fontWeight: 700,
  },
  [narrow]: {
    gridTemplateColumns: "1fr 1fr",
    "& .MuiButton-root": { gridColumn: "1 / -1", minHeight: 44 },
  },
});

export const MapLink = styled("a")({
  fontSize: 12,
  color: "var(--primary-dark)",
  fontWeight: 700,
});

export const SliderField = styled("div")({
  display: "grid",
  gap: 4,
});
