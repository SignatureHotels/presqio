import { styled } from "@mui/material/styles";

export const SettingsForm = styled("form")({
  display: "grid",
  gap: 24,
  marginTop: 30,
  "& > button": { justifySelf: "start" },
});

export const SignInCode = styled("div")({
  display: "grid",
  gap: 4,
  padding: "14px 16px",
  borderRadius: 12,
  background: "var(--neutral-soft)",
  "& strong": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 20,
    letterSpacing: 1,
    color: "var(--heading)",
  },
});
