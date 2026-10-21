import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import { AuthProvider } from "@/providers/auth-provider";
import { theme } from "@/theme";
import { cssVariables } from "@/theme/colors";
import { globalStyles } from "@/theme/global.style";
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={[{ ":root": cssVariables }, ...globalStyles]} />
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
