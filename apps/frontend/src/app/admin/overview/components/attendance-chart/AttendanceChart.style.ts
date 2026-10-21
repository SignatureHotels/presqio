import { styled } from "@mui/material/styles";

export const ChartArea = styled("div")({
  display: "flex",
  height: 190,
  gap: 13,
  alignItems: "end",
  marginTop: 26,
  borderBottom: "1px solid var(--line-soft)",
  paddingBottom: 3,
  position: "relative",
  // Two dashed guide lines behind the bars.
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    borderTop: "1px dashed var(--line-soft)",
    pointerEvents: "none",
  },
  "&::before": { top: "25%" },
  "&::after": { top: "65%" },
});

export const ChartItem = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "end",
  gap: 7,
  flex: 1,
  height: "100%",
  zIndex: 1,
});

export const BarPair = styled("div")({
  height: "calc(100% - 20px)",
  display: "flex",
  alignItems: "end",
  justifyContent: "center",
  gap: 5,
  width: "100%",
});

export const Bar = styled("div", {
  shouldForwardProp: (prop) => prop !== "kind",
})<{ kind: "scheduled" | "present" }>(({ kind }) => ({
  width: "30%",
  maxWidth: 27,
  minWidth: 9,
  borderRadius: "6px 6px 1px 1px",
  transition: "height 0.3s",
  background: kind === "scheduled" ? "var(--chart-scheduled)" : "var(--success)",
}));

export const AxisLabel = styled("span")({
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
  marginTop: 3,
});

export const Legend = styled("div")({
  display: "flex",
  justifyContent: "center",
  gap: 20,
  marginTop: 14,
  fontSize: 11,
  color: "var(--muted)",
});

export const LegendDot = styled("i")({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 3,
  marginRight: 5,
});
