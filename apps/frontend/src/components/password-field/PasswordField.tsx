import { useState } from "react";
import { Button, InputAdornment, TextField, type TextFieldProps } from "@mui/material";

/** Password input with a show/hide toggle. */
export function PasswordField(props: TextFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Button
                size="small"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? "Hide password" : "Show password"}
                sx={{ minWidth: 0, textTransform: "none", fontWeight: 700 }}
              >
                {visible ? "Hide" : "Show"}
              </Button>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
