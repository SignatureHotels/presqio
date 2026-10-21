import { keyframes, styled } from "@mui/material/styles";
import { ease, fadeUp, gutter, media, motionOk } from "../../HomePage.style";

/** Staggered page-load entrance: each hero element rises in after the previous one. */
const enter = (order: number) => ({
  [motionOk]: {
    animation: `${fadeUp} 0.9s ${ease} both`,
    animationDelay: `${120 + order * 110}ms`,
  },
});

const drawUnderline = keyframes`
  from { background-size: 0% 0.12em; }
  to { background-size: 100% 0.12em; }
`;

export const HeroSection = styled("section")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
  gap: 48,
  alignItems: "center",
  padding: `clamp(40px, 7vw, 96px) ${gutter} 72px`,
  maxWidth: 1240,
  margin: "0 auto",
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const Badge = styled("span")({
  ...enter(0),
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: 999,
  background: "var(--primary-tint)",
  color: "var(--primary-dark)",
  fontSize: 12,
  fontWeight: 700,
});

export const Headline = styled("h1")({
  ...enter(1),
  // `&&` keeps this size over the page-level heading rule.
  "&&": {
    fontSize: "clamp(38px, 5.4vw, 64px)",
    lineHeight: 1.04,
    margin: "18px 0",
    letterSpacing: "-2px",
  },
  // Coral underline that draws in under the highlighted words. Drawn as a background so it
  // follows the text when the phrase wraps onto two lines.
  "& em": {
    fontStyle: "normal",
    color: "var(--primary-dark)",
    backgroundImage: "linear-gradient(rgba(255, 103, 120, 0.35), rgba(255, 103, 120, 0.35))",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0 88%",
    backgroundSize: "100% 0.12em",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
    [motionOk]: { animation: `${drawUnderline} 0.9s ${ease} 0.75s both` },
  },
});

export const Lead = styled("p")({
  ...enter(2),
  fontSize: 18,
  lineHeight: 1.6,
  color: "var(--muted)",
  maxWidth: 540,
  margin: 0,
});

export const Actions = styled("div")({
  ...enter(3),
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 30,
});

export const Note = styled("p")({
  ...enter(4),
  marginTop: 16,
  fontSize: 13,
  color: "var(--muted)",
});
