import { styled } from "@mui/material/styles";

/** Larger variant of the global `.branch-avatar`; combine with className="branch-avatar". */
export const LargeBranchAvatar = styled("span")({
  "&&": { width: 43, height: 43 },
});

export const BranchTitle = styled("h2")({
  fontSize: 18,
  margin: "18px 0 4px",
  letterSpacing: -0.4,
});

export const Coordinates = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "var(--muted)",
  margin: "13px 0 20px",
  fontVariantNumeric: "tabular-nums",
});

export const CardFooter = styled("div")({
  borderTop: "1px solid var(--line-soft)",
  paddingTop: 18,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  "& strong": { display: "block", marginTop: 5, fontSize: 13 },
});
