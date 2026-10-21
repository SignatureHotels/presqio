import type { PaletteOptions } from "@mui/material";
import { colors } from "./colors";
export const palette: PaletteOptions = {
  primary: {
    main: colors.primary,
    dark: colors.primaryDark,
    light: colors.primarySoft,
    contrastText: colors.text,
  },
  secondary: { main: colors.forest, contrastText: colors.surface },
  background: { default: colors.background, paper: colors.surface },
  text: {
    primary: colors.text,
    secondary: colors.secondaryText,
    disabled: colors.muted,
  },
  divider: colors.border,
  success: { main: colors.success, contrastText: colors.surface },
  warning: { main: colors.warning, contrastText: colors.text },
  error: { main: colors.error, contrastText: colors.text },
  info: { main: colors.forest, contrastText: colors.surface },
};
