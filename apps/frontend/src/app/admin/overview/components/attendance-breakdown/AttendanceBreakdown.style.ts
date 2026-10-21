import { styled } from "@mui/material/styles";
import { headingFont, media } from "@/theme/media";

export const DonutBox = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  margin: "19px 0 15px",
});

/** The conic-gradient segments are set inline from the live counts. */
export const Donut = styled("div")({
  width: 166,
  height: 166,
  borderRadius: "50%",
  background: "var(--neutral-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const DonutInner = styled("div")({
  height: 121,
  width: 121,
  borderRadius: "50%",
  background: "var(--surface)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  "& span": { fontSize: 10, color: "var(--muted)" },
});

export const DonutNumber = styled("strong")({
  fontSize: 27,
  fontWeight: 800,
  fontFamily: headingFont,
});

export const LegendList = styled("div")({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "11px 14px",
  padding: "0 4px",
  marginTop: 15,
  [media.phone]: { padding: 0, gap: "12px 9px" },
});

export const LegendRow = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 11,
  color: "var(--muted)",
  "& b": { marginLeft: "auto", color: "var(--ink)" },
});
