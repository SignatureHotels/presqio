import { keyframes, styled } from "@mui/material/styles";
import { canHover, ease, headingFont, media, motionOk } from "../../HomePage.style";

/** Slow "breathing" halo around the featured plan. */
const breathe = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 103, 120, 0.22); }
  50% { box-shadow: 0 0 0 8px rgba(255, 103, 120, 0); }
`;
const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

export const Lead = styled("p")({
  margin: "-18px 0 32px",
  color: "var(--muted)",
});

export const PlanGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
  alignItems: "stretch",
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const PlanCard = styled("article", {
  shouldForwardProp: (prop) => prop !== "featured",
})<{ featured?: boolean }>(({ featured }) => ({
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  position: "relative",
  transition: `transform 0.4s ${ease}, box-shadow 0.4s ${ease}`,
  // `&&` outranks the global `.card` border.
  ...(featured && { "&&": { border: "2px solid var(--primary)" } }),
  // The halo is on a pseudo-element so it never competes with the reveal animation.
  ...(featured && {
    "&::before": {
      content: '""',
      position: "absolute",
      inset: -2,
      borderRadius: "inherit",
      pointerEvents: "none",
      [motionOk]: { animation: `${breathe} 3.2s ease-in-out 1.2s infinite` },
    },
  }),
  "& h3": {
    margin: 0,
    fontSize: 20,
  },
  [canHover]: {
    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: featured
        ? "0 26px 50px rgba(255, 103, 120, 0.20)"
        : "0 22px 44px rgba(23, 63, 53, 0.10)",
    },
  },
}));

export const Flag = styled("span")({
  position: "absolute",
  top: -12,
  right: 22,
  background: "var(--primary)",
  fontSize: 11,
  fontWeight: 800,
  padding: "5px 10px",
  borderRadius: 999,
  [motionOk]: { animation: `${bob} 2.8s ease-in-out infinite` },
});

export const PlanNote = styled("p")({
  margin: 0,
  color: "var(--muted)",
});

export const Price = styled("p")({
  fontFamily: headingFont,
  fontSize: 38,
  fontWeight: 800,
  color: "var(--heading)",
  margin: "14px 0",
  "& span": {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--muted)",
    marginLeft: 4,
  },
});

export const Limits = styled("ul")({
  listStyle: "none",
  margin: "0 0 22px",
  padding: 0,
  display: "grid",
  gap: 10,
  flex: 1,
  "& li": {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  "& .icon": { color: "var(--success)", transition: `transform 0.35s ${ease}` },
  [canHover]: {
    "& li:hover .icon": { transform: "scale(1.25)" },
  },
});
