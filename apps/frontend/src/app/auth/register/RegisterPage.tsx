import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { errorMessage } from "@/api/client";
import { PasswordField } from "@/components/password-field";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout, AuthForm } from "@/layouts/auth-layout";

const PASSWORD_MIN = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    organizationName: "",
    password: "",
  });
  // Kept outside `form`: only the password itself is sent to the API.
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const problems = {
    fullName: form.fullName.trim().length < 2 ? "Enter your full name" : "",
    email: !EMAIL.test(form.email.trim()) ? "Enter a valid email address" : "",
    organizationName:
      form.organizationName.trim().length < 2 ? "Enter your company or group name" : "",
    password:
      form.password.length < PASSWORD_MIN
        ? `Use at least ${PASSWORD_MIN} characters`
        : "",
  };
  const confirmProblem = !confirmPassword
    ? "Re-enter your password"
    : confirmPassword !== form.password
      ? "Passwords do not match"
      : "";
  // Show a mismatch as soon as something is typed, the empty case only after submitting.
  const showConfirmProblem = Boolean(confirmProblem) && (touched || confirmPassword.length > 0);
  const valid =
    Object.values(problems).every((problem) => !problem) && !confirmProblem && accepted;
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: event.target.value }),
    error: touched && Boolean(problems[key]),
    helperText: touched ? problems[key] : undefined,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;
    setError("");
    setBusy(true);
    try {
      await auth.register(form);
      navigate("/onboarding", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Start your free trial"
      subtitle="14 days with every feature. No card needed."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <AuthForm onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Full name" autoComplete="name" autoFocus required {...field("fullName")} />
        <TextField label="Work email" type="email" autoComplete="email" required {...field("email")} />
        <TextField
          label="Company or group name"
          autoComplete="organization"
          required
          {...field("organizationName")}
          helperText={
            (touched && problems.organizationName) ||
            "You'll add each of your branches during setup."
          }
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          required
          {...field("password")}
          helperText={
            (touched && problems.password) ||
            `At least ${PASSWORD_MIN} characters. Avoid common passwords and your name.`
          }
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={showConfirmProblem}
          helperText={showConfirmProblem ? confirmProblem : undefined}
        />
        <FormControlLabel
          control={
            <Checkbox checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          }
          label={
            <span className="sm">
              I agree to the Terms of Service and Privacy Policy, including how employee
              location and photos are processed.
            </span>
          }
        />
        {touched && !accepted && (
          <Alert severity="warning">Please accept the terms to continue.</Alert>
        )}
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? "Creating your workspace…" : "Create account"}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}
