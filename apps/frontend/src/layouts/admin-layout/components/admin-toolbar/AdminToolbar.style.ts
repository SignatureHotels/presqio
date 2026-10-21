import { styled } from "@mui/material/styles";
import { headingFont, media } from "@/theme/media";

export const Toolbar = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 22,
  gap: 15,
});

export const PageIntro = styled("div")({
  flex: "1 1 280px",
});

export const Eyebrow = styled("div")({
  fontSize: 12,
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: 0.3,
  marginBottom: 5,
  [media.phone]: { fontSize: 10 },
});

export const PageTitle = styled("h1")({
  fontFamily: headingFont,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: -1.1,
  lineHeight: 1.3,
  margin: 0,
  color: "var(--heading)",
  [media.laptop]: { fontSize: 25 },
  [media.phone]: { fontSize: 23 },
});

export const PageLead = styled("p")({
  fontSize: 13,
  color: "var(--muted)",
  margin: "8px 0 0",
  [media.phone]: { lineHeight: 1.6 },
});

export const Actions = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 11,
  [media.phone]: {
    gap: 7,
    "& .btn": { padding: 10 },
    "& .circle-btn": { width: 35 },
  },
});
