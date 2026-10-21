import { styled } from "@mui/material/styles";

export const Timeline = styled("div")({
  marginTop: 15,
});

export const TimelineItem = styled("div")({
  display: "flex",
  gap: 10,
  padding: "10px 0",
  "& strong": { fontSize: 12 },
  "& p": { margin: "5px 0 0", fontSize: 11, color: "var(--muted)" },
});

export const TimelineIcon = styled("span")({
  borderRadius: "50%",
  width: 28,
  height: 28,
  background: "var(--success-soft)",
  color: "var(--muted)",
  display: "grid",
  placeItems: "center",
});
