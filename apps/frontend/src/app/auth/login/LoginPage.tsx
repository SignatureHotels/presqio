import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { errorMessage } from "@/api/client";
import { PasswordField } from "@/components/password-field";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout, AuthForm, AuthRow } from "@/layouts/auth-layout";
import { landingPath, readActiveOrganizationId, resolveActiveOrganization, safeNext } from "@/utils/auth-routing";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const me = await auth.login({ email, password });
      const active = resolveActiveOrganization(me, readActiveOrganizationId());
      navigate(safeNext(params.get("next")) ?? landingPath(me, active), { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage attendance across your branches."
      footer={
        <>
          New to Presqio? <Link to="/register">Create an account</Link>
          <br />
          Employee? <Link to="/employee">Open the employee check-in</Link>
        </>
      }
    >
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
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthRow>
          <span />
          <Link to="/forgot-password">Forgot password?</Link>
        </AuthRow>
        <Button
          type="submit"
          variant="contained"
          disabled={busy || !email || !password}
        >
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}
