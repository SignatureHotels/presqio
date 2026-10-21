import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

export const CheckinList = styled("ul")({
  listStyle: "none",
  margin: "14px 0 0",
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const CheckinRow = styled("li")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  alignItems: "center",
  gap: 14,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid var(--line-soft)",
  "& .who": { minWidth: 0 },
  "& .who strong": {
    display: "block",
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  "& .who small": { fontSize: 11, color: "var(--muted)" },
  "& .chip": { marginTop: 4 },
});

export const Punch = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: "var(--muted)",
  "& b": { display: "block", fontSize: 13, color: "var(--heading)", fontVariantNumeric: "tabular-nums" },
});
