import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { authApi } from "@/api/endpoints";
import { errorMessage } from "@/api/client";
import { AuthLayout, AuthForm } from "@/layouts/auth-layout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you sign in with and we'll send a reset link."
      footer={<Link to="/login">← Back to sign in</Link>}
    >
      {sent ? (
        <Alert severity="success">
          If an account exists for {email}, a reset link is on its way. It expires in 30
          minutes.
        </Alert>
      ) : (
        <AuthForm onSubmit={submit} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" variant="contained" disabled={busy || !email}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </AuthForm>
      )}
    </AuthLayout>
  );
}
