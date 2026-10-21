import { styled } from "@mui/material/styles";

export const NewRequest = styled("div")({
  display: "grid",
  gap: 8,
  "& strong": { fontSize: 15, color: "var(--heading)" },
  "& p": { margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 },
  "& small": { fontSize: 12, color: "var(--muted)" },
  "& .MuiButton-root": { marginTop: 6, minHeight: 46, borderRadius: 14, fontWeight: 800 },
});
