import { styled } from "@mui/material/styles";

/** Cards for "What kind of business is it?". */
export const TypeGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: 8,
  marginTop: 10,
  "& button": {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: 2,
  },
  "& button span": { fontSize: 12, color: "var(--muted)", lineHeight: 1.35 },
  "& button:focus-visible": { outline: "2px solid var(--forest)", outlineOffset: 2 },
  "& button.selected": { borderColor: "var(--forest)", boxShadow: "inset 0 0 0 1px var(--forest)" },
});
