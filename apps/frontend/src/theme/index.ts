import { createTheme } from "@mui/material";
import { palette } from "./palette";
import { typography } from "./typography";
export const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 14 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 700 } } },
  },
});
