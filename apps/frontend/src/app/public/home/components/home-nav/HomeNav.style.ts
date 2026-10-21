import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { canHover, ease, gutter, media, motionOk } from "../../HomePage.style";

export const NavBar = styled("header", {
  shouldForwardProp: (prop) => prop !== "scrolled",
})<{ scrolled: boolean }>(({ scrolled }) => ({
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  padding: `16px ${gutter}`,
  background: "color-mix(in srgb, var(--bg) 92%, transparent)",
  backdropFilter: "blur(10px)",
  borderBottom: "1px solid var(--line-soft)",
  transition: `box-shadow 0.35s ${ease}, background 0.35s ${ease}`,
  // Lifts off the page once the visitor scrolls.
  ...(scrolled && {
    background: "color-mix(in srgb, var(--bg) 82%, transparent)",
    boxShadow: "0 8px 30px rgba(23, 63, 53, 0.08)",
  }),
  "& .brand-mark": { transition: `transform 0.45s ${ease}` },
  [canHover]: {
    "& .brand-wrap:hover .brand-mark": { transform: "rotate(-8deg) scale(1.06)" },
  },
}));

/** Thin coral bar along the bottom edge of the nav showing scroll progress. */
export const ProgressBar = styled("span")({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: -1,
  height: 2,
  background: "var(--primary)",
  transformOrigin: "0 50%",
  transform: "scaleX(var(--progress, 0))",
  pointerEvents: "none",
});

export const SectionLinks = styled("nav")({
  display: "flex",
  gap: 28,
  fontWeight: 600,
  color: "var(--muted)",
  "& a": {
    position: "relative",
    padding: "4px 0",
    transition: `color 0.25s ${ease}`,
  },
  // Underline that grows from the left on hover and for the section in view.
  "& a::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    borderRadius: 2,
    background: "var(--primary)",
    transform: "scaleX(0)",
    transformOrigin: "0 50%",
  },
  "& a[aria-current='true']": { color: "var(--heading)" },
  "& a[aria-current='true']::after": { transform: "scaleX(1)" },
  [canHover]: {
    "& a:hover": { color: "var(--ink)" },
    "& a:hover::after": { transform: "scaleX(1)" },
  },
  [motionOk]: {
    "& a::after": { transition: `transform 0.35s ${ease}` },
  },
  [media.tablet]: { display: "none" },
});

export const Actions = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 18,
});

export const LoginLink = styled(Link)({
  fontWeight: 700,
  color: "var(--heading)",
  transition: `color 0.25s ${ease}`,
  "&:hover": { color: "var(--ink)" },
  [media.phone]: { display: "none" },
});
