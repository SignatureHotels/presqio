import { styled } from "@mui/material/styles";

export const BranchList = styled("div")({
  marginTop: 19,
});

export const BranchRow = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "13px 0",
  borderBottom: "1px solid var(--line-soft)",
  "&:last-of-type": { border: 0 },
});

export const RowLeft = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 11,
});

export const RowName = styled("div")({
  fontSize: 12,
  fontWeight: 800,
});

export const RowSub = styled("div")({
  fontSize: 11,
  color: "var(--muted)",
  marginTop: 4,
});

export const RowValue = styled("div")({
  fontWeight: 800,
  fontSize: 12,
});

export const Progress = styled("div")({
  background: "var(--neutral-soft)",
  width: 110,
  height: 5,
  borderRadius: 20,
  marginTop: 7,
  overflow: "hidden",
  "& span": {
    height: "100%",
    display: "block",
    background: "var(--success)",
    borderRadius: 20,
  },
});
