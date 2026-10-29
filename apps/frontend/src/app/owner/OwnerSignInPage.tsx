import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { authApi } from "@/api/endpoints";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm, AuthLayout } from "@/layouts/auth-layout";

/** Presqio staff sign in to the owner console with just their email and the link it receives. */
export function OwnerSignInPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(Boolean(token));
  // Links are single-use, so StrictMode's double effect must not submit twice.
  const submitted = useRef(false);
  const { ownerSignIn } = auth;

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    ownerSignIn(token)
      .then(() => navigate("/owner", { replace: true }))
      .catch((caught) => {
        setError(errorMessage(caught));
        setBusy(false);
        navigate("/owner", { replace: true });
      });
  }, [token, ownerSignIn, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await authApi.ownerSignInLink(email);
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (token && busy)
    return (
      <AuthLayout title="Owner console" subtitle="Signing you in…">
        <span />
      </AuthLayout>
    );

  return (
    <AuthLayout title="Owner console" subtitle="For the Presqio team. We'll email you a one-tap sign-in link.">
      {sent ? (
        <>
          <Alert severity="success">
            Check {email}. If it can open the owner console, a sign-in link is on its way. It
            expires in 15 minutes.
          </Alert>
          <Button variant="text" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </>
      ) : (
        <AuthForm onSubmit={submit} noValidate>
          {error && <Alert severity="error">{error} Request a new link below.</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" variant="contained" disabled={busy || !email}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </AuthForm>
      )}
    </AuthLayout>
  );
}
