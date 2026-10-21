import { styled } from "@mui/material/styles";

export const WeekdayPicker = styled("fieldset")({
  border: 0,
  padding: 0,
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  "& legend": { marginBottom: 8 },
});

export const WeekdayToggle = styled("button", {
  shouldForwardProp: (prop) => prop !== "selected",
})<{ selected: boolean }>(({ selected }) => ({
  minWidth: 54,
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--muted)",
  fontWeight: 700,
  ...(selected && {
    background: "var(--forest)",
    borderColor: "var(--forest)",
    color: "var(--nav-text)",
  }),
}));
