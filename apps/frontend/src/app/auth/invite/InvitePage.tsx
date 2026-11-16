import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import type { InvitationPreview } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { invitationsApi } from "@/api/team";
import { PasswordField } from "@/components/password-field";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/layouts/auth-layout";

const ROLE = { ADMIN: "an admin", MANAGER: "a branch manager", VIEWER: "a viewer" } as const;

/** The invitation link: join a workspace, creating an account first if needed. */
export function InvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const auth = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState(token ? "" : "This invitation link is incomplete. Open it from the email again.");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    invitationsApi.preview(token).then(setInvite).catch((caught) => setError(errorMessage(caught)));
  }, [token]);

  async function joined(organizationId: string) {
    await auth.reload();
    auth.setActiveOrganization(organizationId);
    navigate("/admin/overview", { replace: true });
  }

  async function accept() {
    setBusy(true); setError("");
    try {
      const { organizationId } = await invitationsApi.accept(token);
      await joined(organizationId);
    } catch (caught) {
      setError(errorMessage(caught)); setBusy(false);
    }
  }

  async function register(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const me = await auth.registerInvited({ token, fullName: name.trim(), password });
      const organization = me.organizations.find((o) => o.name === invite?.organizationName) ?? me.organizations[0];
      if (organization) auth.setActiveOrganization(organization.id);
      navigate("/admin/overview", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught)); setBusy(false);
    }
  }

  const signedInAs = auth.me?.user.email?.toLowerCase() ?? null;
  const here = `/invite?token=${encodeURIComponent(token)}`;
  return (
    <AuthLayout title={invite ? `Join ${invite.organizationName}` : "Your invitation"}>
      {error && <Alert severity="error">{error}</Alert>}
      {!invite && !error && <Alert severity="info">Opening your invitation…</Alert>}
      {invite && (
        <Stack spacing={2}>
          <Typography>
            {invite.invitedBy ?? "Someone"} invited you to {invite.organizationName} as {ROLE[invite.access]}
            {invite.branchNames.length ? ` for ${invite.branchNames.join(", ")}` : ""}.
          </Typography>

          {auth.status === "authenticated" && signedInAs === invite.email && (
            <Button variant="contained" disabled={busy} onClick={() => void accept()}>{busy ? "Joining…" : `Join ${invite.organizationName}`}</Button>
          )}

          {auth.status === "authenticated" && signedInAs !== invite.email && (
            <>
              <Alert severity="warning">You're signed in as {auth.me?.user.email}, but this invitation is for {invite.email}.</Alert>
              <Button variant="outlined" onClick={() => void auth.logout()}>Sign out and use {invite.email}</Button>
            </>
          )}

          {auth.status === "anonymous" && invite.accountExists && (
            <>
              <Typography color="text.secondary">You already have a Presqio account with {invite.email}. Sign in to accept.</Typography>
              <Button variant="contained" component={Link} to={`/login?next=${encodeURIComponent(here)}`}>Sign in to accept</Button>
            </>
          )}

          {auth.status === "anonymous" && !invite.accountExists && (
            <form onSubmit={register} noValidate>
              <Stack spacing={2}>
                <TextField label="Email" value={invite.email} disabled helperText="The invitation was sent here, so it's already verified." />
                <TextField required label="Your full name" value={name} autoFocus autoComplete="name"
                  onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 80 } }} />
                <PasswordField required label="Choose a password" value={password} autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)} helperText="At least 8 characters. Avoid your name or email." />
                <Button type="submit" variant="contained" disabled={busy || name.trim().length < 2 || password.length < 8}>
                  {busy ? "Creating your account…" : `Create account and join`}
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      )}
    </AuthLayout>
  );
}
