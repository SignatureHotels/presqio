import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { authApi } from "@/api/endpoints";
import { errorMessage } from "@/api/client";
import { PasswordField } from "@/components/password-field";
import { AuthLayout, AuthForm, AuthLink } from "@/layouts/auth-layout";

const PASSWORD_MIN = 8;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < PASSWORD_MIN || password !== confirm) return;
    setBusy(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="You'll be signed out on every other device."
      footer={<Link to="/login">← Back to sign in</Link>}
    >
      {!token ? (
        <Alert severity="error">
          This reset link is incomplete. <AuthLink to="/forgot-password">Request a new one</AuthLink>.
        </Alert>
      ) : done ? (
        <>
          <Alert severity="success">Your password has been changed.</Alert>
          <Button component={Link} to="/login" variant="contained">
            Sign in
          </Button>
        </>
      ) : (
        <AuthForm onSubmit={submit} noValidate>
          {error && (
            <Alert severity="error">
              {error}{" "}
              {/expired|invalid/i.test(error) && (
                <AuthLink to="/forgot-password">Request a new link</AuthLink>
              )}
            </Alert>
          )}
          <PasswordField
            label="New password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helperText={`At least ${PASSWORD_MIN} characters`}
            error={password.length > 0 && password.length < PASSWORD_MIN}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={mismatch}
            helperText={mismatch ? "Passwords do not match" : " "}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={busy || password.length < PASSWORD_MIN || password !== confirm}
          >
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </AuthForm>
      )}
    </AuthLayout>
  );
}
