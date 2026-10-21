import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { displayFont } from "@/theme/media";

const stacked = "@media (max-width: 900px)";

const linkLook = {
  color: "var(--primary-dark)",
  fontWeight: 700,
} as const;

export const Shell = styled("div")({
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.9fr)",
  background: "var(--bg)",
  [stacked]: { gridTemplateColumns: "1fr" },
});

export const Main = styled("main")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "48px clamp(16px, 6vw, 88px)",
  gap: 28,
  [stacked]: {
    justifyContent: "flex-start",
    paddingTop: 28,
  },
});

/** Combine with className="brand-wrap". */
export const BrandLink = styled(Link)({
  alignSelf: "flex-start",
});

export const Card = styled("div")({
  width: "100%",
  maxWidth: 440,
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

export const Title = styled("h1")({
  margin: 0,
  fontFamily: displayFont,
  fontSize: 30,
  letterSpacing: -0.8,
  color: "var(--heading)",
});

export const Subtitle = styled("p")({
  margin: "-8px 0 4px",
  color: "var(--muted)",
  fontSize: 14,
  lineHeight: 1.55,
});

export const Footer = styled("div")({
  maxWidth: 440,
  fontSize: 13,
  color: "var(--muted)",
  "& a": linkLook,
});

export const Aside = styled("aside")({
  background: "var(--forest)",
  color: "var(--nav-text)",
  display: "flex",
  alignItems: "center",
  padding: "48px clamp(24px, 5vw, 72px)",
  position: "relative",
  overflow: "hidden",
  // Decorative coral ring in the corner.
  "&::after": {
    content: '""',
    position: "absolute",
    width: 420,
    height: 420,
    right: -140,
    bottom: -160,
    borderRadius: "50%",
    border: "70px solid rgba(255, 103, 120, 0.16)",
  },
  [stacked]: { display: "none" },
});

export const AsideInner = styled("div")({
  maxWidth: 440,
  position: "relative",
  zIndex: 1,
});

export const Eyebrow = styled("span")({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "var(--nav-muted)",
});

export const Quote = styled("p")({
  fontFamily: displayFont,
  fontSize: 28,
  lineHeight: 1.3,
  fontWeight: 700,
  letterSpacing: -0.6,
  margin: "14px 0 28px",
});

export const Points = styled("ul")({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 14,
  "& li": {
    display: "flex",
    gap: 12,
    alignItems: "center",
    color: "var(--nav-muted)",
    fontSize: 14,
  },
});

export const PointIcon = styled("span")({
  width: 32,
  height: 32,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "var(--nav-panel)",
  color: "var(--primary)",
  flexShrink: 0,
});

/** Shared by the auth pages rendered inside this layout. */
export const AuthForm = styled("form")({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  "& .MuiButton-root": {
    minHeight: 46,
    fontWeight: 700,
    textTransform: "none",
    fontSize: 15,
  },
});

export const AuthRow = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  "& a": linkLook,
});

export const AuthLink = styled(Link)(linkLook);
