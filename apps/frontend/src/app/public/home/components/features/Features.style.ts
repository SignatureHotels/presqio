import { styled } from "@mui/material/styles";
import { canHover, ease, media } from "../../HomePage.style";

export const FeatureGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "34px 28px",
  [media.tablet]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  [media.phone]: { gridTemplateColumns: "1fr" },
});

export const Feature = styled("article")({
  "& h3": {
    fontSize: 18,
    margin: "18px 0 8px",
    transition: `color 0.3s ${ease}`,
  },
  "& p": {
    margin: 0,
    color: "var(--muted)",
    lineHeight: 1.6,
  },
  [canHover]: {
    "&:hover > span:first-of-type": {
      background: "var(--primary)",
      color: "var(--ink)",
      transform: "translateY(-3px) rotate(-6deg)",
      boxShadow: "var(--shadow-primary)",
    },
    "&:hover h3": { color: "var(--primary-dark)" },
  },
});

export const FeatureIcon = styled("span")({
  width: 44,
  height: 44,
  borderRadius: 13,
  display: "grid",
  placeItems: "center",
  background: "var(--forest-soft)",
  color: "var(--forest)",
  transition: `transform 0.45s ${ease}, background 0.3s ${ease}, color 0.3s ${ease}, box-shadow 0.3s ${ease}`,
});
