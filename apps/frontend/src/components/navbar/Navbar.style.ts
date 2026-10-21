import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

export const Bar = styled("header")({
  "& .brand-logo": { width: 156 },
  height: 76,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 32px",
  background: "var(--bg)",
  borderBottom: "1px solid var(--line-soft)",
  position: "sticky",
  top: 0,
  zIndex: 90,
  boxShadow: "var(--shadow-header)",
  [media.tablet]: { padding: "0 20px" },
  [media.phone]: {
    padding: "0 14px",
    height: 64,
    // Compact brand lock-up on phones.
    "& .brand-mark": { width: 32, height: 32, fontSize: 20 },
    "& .brand-logo": { width: 120 },
    "& .brand-wrap": { gap: 8 },
  },
});

export const BrandSub = styled("div")({
  fontSize: 10,
  color: "var(--muted)",
  marginTop: 3,
  fontWeight: 600,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  [media.phone]: { display: "none" },
});

export const HeaderRight = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 22,
  [media.phone]: { gap: 10 },
});

export const OrgLabel = styled("span")({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "var(--muted)",
  [media.phone]: { fontSize: 10 },
});

export const OrgDot = styled("span")({
  width: 7,
  height: 7,
  background: "var(--success)",
  borderRadius: "50%",
});

export const AvatarButton = styled("button")({
  width: 35,
  height: 35,
  borderRadius: "50%",
  background: "var(--primary-soft)",
  color: "var(--primary-dark)",
  display: "grid",
  placeItems: "center",
  fontWeight: 700,
  fontSize: 11,
  [media.phone]: { width: 28, height: 28, fontSize: 9 },
});
