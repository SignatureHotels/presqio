import { styled } from "@mui/material/styles";

/** Decorative map grid with the perimeter circle. */
export const Diagram = styled("div")({
  height: 155,
  marginTop: 22,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: "var(--neutral-soft)",
  backgroundImage:
    "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
  backgroundSize: "27px 27px",
  display: "grid",
  placeItems: "center",
  position: "relative",
});

export const Ring = styled("div")({
  border: "1px dashed var(--primary)",
  borderRadius: "50%",
  width: 120,
  height: 120,
  background: "var(--primary-tint)",
  display: "grid",
  placeItems: "center",
  position: "relative",
});

export const Center = styled("span")({
  width: 32,
  height: 32,
  border: "4px solid var(--surface)",
  borderRadius: "50%",
  background: "var(--primary)",
  color: "var(--ink)",
  display: "grid",
  placeItems: "center",
  boxShadow: "var(--shadow-primary)",
  "& .icon": { width: 14, height: 14 },
});

export const RadiusLabel = styled("span")({
  position: "absolute",
  bottom: 13,
  fontSize: 10,
  color: "var(--primary-dark)",
  fontWeight: 700,
});

export const Caption = styled("span")({
  position: "absolute",
  bottom: 8,
  right: 9,
  fontSize: 9,
  color: "var(--muted)",
  background: "var(--surface)",
  padding: "3px 6px",
  borderRadius: 4,
});
