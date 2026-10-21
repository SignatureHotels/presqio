import { useState } from "react";
import { Alert, Button } from "@mui/material";
import { authApi } from "@/api/endpoints";
import { useAuth } from "@/hooks/use-auth";

/** Reminds admins to confirm their email; inviting teammates will require it. */
export function EmailVerificationNotice() {
  const { me } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  if (!me || me.user.emailVerified) return null;
  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        state === "sent" ? undefined : (
          <Button
            color="inherit"
            size="small"
            disabled={state === "sending"}
            onClick={() => {
              setState("sending");
              authApi
                .resendVerification()
                .then(() => setState("sent"))
                .catch(() => setState("failed"));
            }}
          >
            Resend email
          </Button>
        )
      }
    >
      {state === "sent"
        ? `A new verification link was sent to ${me.user.email}.`
        : state === "failed"
          ? "We couldn't send the email. Try again in a minute."
          : `Please verify ${me.user.email} to invite teammates and export data.`}
    </Alert>
  );
}
