import { styled } from "@mui/material/styles";
import { NavLink } from "react-router-dom";

export const TabBar = styled("nav")({
  position: "fixed",
  bottom: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 460,
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "1fr",
  background: "color-mix(in srgb, var(--surface) 94%, transparent)",
  backdropFilter: "blur(12px)",
  borderTop: "1px solid var(--line-soft)",
  paddingBottom: "env(safe-area-inset-bottom)",
  zIndex: 20,
});

export const Tab = styled(NavLink)({
  display: "grid",
  justifyItems: "center",
  gap: 4,
  padding: "10px 0 12px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
  transition: "color 0.2s",
  "&.active": { color: "var(--primary-dark)" },
  "&.active .icon": { transform: "translateY(-1px)" },
  "& .icon": { transition: "transform 0.2s" },
});
