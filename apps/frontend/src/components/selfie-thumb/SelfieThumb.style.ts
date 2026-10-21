import { styled } from "@mui/material/styles";

export const Thumb = styled("button", {
  shouldForwardProp: (prop) => prop !== "size",
})<{ size: number }>(({ size }) => ({
  width: size,
  height: size,
  padding: 0,
  flex: "none",
  borderRadius: Math.round(size / 4),
  border: "1px solid var(--line-soft)",
  background: "var(--neutral-soft)",
  overflow: "hidden",
  cursor: "zoom-in",
  display: "grid",
  placeItems: "center",
  color: "var(--muted)",
  fontSize: 10,
  "&:disabled": { cursor: "default" },
  "& img": { width: "100%", height: "100%", objectFit: "cover", display: "block" },
}));

export const Large = styled("img")({
  display: "block",
  width: "100%",
  maxWidth: 420,
  margin: "0 auto",
  borderRadius: 16,
});
