import { styled } from "@mui/material/styles";

export const TimeOffRoot = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  ".row": { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "14px 0 8px" },
  ".starter": { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, margin: "4px 0 12px" },
  ".policy .actions, .type-form .actions": { display: "flex", gap: 8, marginLeft: "auto" },
  ".type-form": {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 12, padding: 12,
    border: "1px dashed var(--line-soft)", borderRadius: 10,
  },
  ".archived": { marginTop: 14, color: "var(--muted)", fontSize: 13, summary: { cursor: "pointer", marginBottom: 8 } },
  ".table-wrap": { overflowX: "auto" },
  "table.balances": {
    borderCollapse: "collapse", width: "100%", fontSize: 13,
    "th, td": { padding: "8px 10px", borderBottom: "1px solid var(--line-soft)", textAlign: "left", whiteSpace: "nowrap" },
    th: { fontWeight: 600, verticalAlign: "bottom" },
    "th small, td small": { display: "block", color: "var(--muted)", fontWeight: 400, fontSize: 11 },
    "td.full": { color: "#b42318", fontWeight: 600 },
  },
});
