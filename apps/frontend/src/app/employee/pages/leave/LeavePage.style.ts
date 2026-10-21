import { styled } from "@mui/material/styles";

export const LeaveForm = styled("form")({
  display: "grid",
  gap: 14,
  "& strong": { fontSize: 15, color: "var(--heading)" },
  "& p": { margin: "-6px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 },
  "& .MuiButton-root": { minHeight: 46, borderRadius: 14, fontWeight: 800 },
});

export const SectionTitle = styled("h2")({
  margin: "6px 4px 0",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "var(--muted)",
});
