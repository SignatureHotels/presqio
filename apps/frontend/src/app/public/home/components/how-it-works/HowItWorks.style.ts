import { styled } from "@mui/material/styles";
import { canHover, ease, media } from "../../HomePage.style";

export const StepList = styled("ol")({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

/** Combine with className="card". */
export const StepCard = styled("li")({
  padding: 26,
  transition: `transform 0.4s ${ease}, box-shadow 0.4s ${ease}, border-color 0.4s ${ease}`,
  "& h3": {
    fontSize: 18,
    margin: "18px 0 8px",
  },
  "& p": {
    margin: 0,
    color: "var(--muted)",
    lineHeight: 1.6,
  },
  [canHover]: {
    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: "0 22px 44px rgba(23, 63, 53, 0.10)",
      borderColor: "var(--primary-soft)",
    },
    "&:hover > span:first-of-type": { transform: "rotate(-8deg) scale(1.08)" },
  },
});

export const StepNumber = styled("span")({
  width: 36,
  height: 36,
  borderRadius: 11,
  background: "var(--primary)",
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  transition: `transform 0.45s ${ease}`,
});
