import { useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { errorText, useT } from "@/i18n";
import { LanguagePicker } from "@/i18n/LanguagePicker";
import { useEmployeeSession } from "../../context/employee-session";
import { rememberedLogin } from "../../utils/remembered-login";
import { Foot, Form, Hero, Screen } from "./SignInPage.style";

export function SignInPage() {
  const session = useEmployeeSession();
  const t = useT();
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
      setError(errorText(caught));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Hero>
        <img className="brand-icon" src="/fevicon-icon.png" alt="Presqio" width={64} height={64} />
        <LanguagePicker tone="dark" />
        <h1>{t("signin.title")}</h1>
        <p>{t("signin.subtitle")}</p>
      </Hero>
      <Form onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label={t("signin.idLabel")}
          placeholder={t("signin.idPlaceholder")}
          autoFocus
          autoCapitalize="characters"
          autoComplete="username"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value.replace(/\s+/g, "").toUpperCase())}
          helperText={t("signin.idHelp")}
        />
        <Button type="submit" variant="contained" disabled={busy || employeeCode.length < 2}>
          {busy ? t("signin.busy") : t("signin.button")}
        </Button>
      </Form>
      <Foot>{t("signin.foot")}</Foot>
    </Screen>
  );
}
