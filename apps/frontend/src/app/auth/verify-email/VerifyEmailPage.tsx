import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { authApi } from "@/api/endpoints";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/layouts/auth-layout";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const [error, setError] = useState(token ? "" : "This verification link is incomplete.");
  // Tokens are single-use, so StrictMode's double effect must not submit twice.
  const submitted = useRef(false);
  const { reload, status } = auth;

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        setState("done");
        if (status === "authenticated") void reload();
      })
      .catch((caught) => {
        setError(errorMessage(caught));
        setState("failed");
      });
  }, [token, reload, status]);

  return (
    <AuthLayout title="Verify your email">
      {state === "working" && <Alert severity="info">Confirming your email…</Alert>}
      {state === "done" && <Alert severity="success">Thanks, your email is verified.</Alert>}
      {state === "failed" && (
        <Alert severity="error">
          {error} Sign in and use “Resend email” to get a fresh link.
        </Alert>
      )}
      {/* Wait for the session check so the button does not flip from "Sign in" to "Go to workspace". */}
      {state !== "working" && auth.status !== "loading" && (
        <Button
          component={Link}
          to={auth.status === "authenticated" ? "/admin/overview" : "/login"}
          variant="contained"
        >
          {auth.status === "authenticated" ? "Go to workspace" : "Sign in"}
        </Button>
      )}
    </AuthLayout>
  );
}
