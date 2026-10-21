import { useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { errorMessage } from "@/api/client";
import { useEmployeeSession } from "../../context/employee-session";
import { rememberedLogin } from "../../utils/remembered-login";
import { Foot, Form, Hero, Screen } from "./SignInPage.style";

export function SignInPage() {
  const session = useEmployeeSession();
  const [employeeCode, setEmployeeCode] = useState(rememberedLogin().employeeCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await session.signIn(employeeCode);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Hero>
        <img className="brand-icon" src="/fevicon-icon.png" alt="Presqio" width={64} height={64} />
        <h1>Check in to work</h1>
        <p>Enter your employee ID to sign in.</p>
      </Hero>
      <Form onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Employee ID"
          placeholder="e.g. SGH0001"
          autoFocus
          autoCapitalize="characters"
          autoComplete="username"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value.replace(/\s+/g, "").toUpperCase())}
          helperText="Ask your admin if you don't know it"
        />
        <Button type="submit" variant="contained" disabled={busy || employeeCode.length < 2}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </Form>
      <Foot>No smartphone? Sign in on a colleague's phone, then sign out when you're done.</Foot>
    </Screen>
  );
}
