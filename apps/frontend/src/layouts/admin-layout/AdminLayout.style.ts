import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

export const SkipLink = styled("a")({
  position: "fixed",
  left: 16,
  top: -60,
  zIndex: 1500,
  background: "var(--surface)",
  color: "var(--primary-dark)",
  padding: "12px 18px",
  borderRadius: 8,
  "&:focus": { top: 12 },
});

export const AdminView = styled("div")({
  minHeight: "calc(100vh - 76px)",
  display: "flex",
  [media.phone]: { minHeight: "calc(100dvh - 64px)" },
});

export const AdminMain = styled("main")({
  flex: 1,
  minWidth: 0,
  padding: "30px 33px 60px",
  maxWidth: 1750,
  margin: "0 auto",
  [media.wide]: { padding: 24 },
  [media.laptop]: { padding: 22 },
  [media.tablet]: { padding: "22px 18px" },
  [media.phone]: { padding: "22px 12px" },
});
