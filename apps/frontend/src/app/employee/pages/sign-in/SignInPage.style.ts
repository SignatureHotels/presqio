import { styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";

export const Screen = styled("main")({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "max(28px, env(safe-area-inset-top)) 22px 28px",
  gap: 22,
});

export const Hero = styled("div")({
  background: "var(--forest)",
  color: "var(--nav-text)",
  borderRadius: 26,
  padding: "26px 22px",
  "& .brand-icon": {
    display: "block",
    width: 64,
    height: 64,
    objectFit: "contain",
  },
  "& h1": { fontFamily: displayFont, fontSize: 26, margin: "18px 0 6px", letterSpacing: -0.6, color: "inherit" },
  "& p": { margin: 0, color: "var(--nav-muted)", lineHeight: 1.55, fontSize: 14 },
});

export const Form = styled("form")({
  display: "flex",
  flexDirection: "column",
  gap: 14,
  "& .MuiButton-root": { minHeight: 50, fontSize: 16, fontWeight: 800, borderRadius: 14 },
});

export const Foot = styled("p")({
  margin: 0,
  textAlign: "center",
  fontSize: 14,
  color: "var(--muted)",
  "& a": { color: "var(--primary-dark)", fontWeight: 800 },
});
