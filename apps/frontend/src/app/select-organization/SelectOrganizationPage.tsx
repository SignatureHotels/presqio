import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import type { OrganizationAccess } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { organizationsApi } from "@/api/endpoints";
import { Icon } from "@/components";
import { useAuth } from "@/hooks/use-auth";
import { landingPath } from "@/utils/auth-routing";
import {
  Body,
  CreateForm,
  Head,
  OrgCard,
  OrgCopy,
  OrgInitial,
  OrgList,
  Page,
} from "./SelectOrganizationPage.style";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" } as const;

export function SelectOrganizationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Choose an organization · Presqio";
  }, []);

  if (!auth.me) return null;
  const me = auth.me;

  function open(org: OrganizationAccess) {
    auth.setActiveOrganization(org.id);
    navigate(landingPath(me, org));
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await organizationsApi.create({ name: name.trim() });
      auth.setActiveOrganization(created.id);
      await auth.reload();
      navigate("/onboarding");
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Page>
      <Head>
        <span className="brand-wrap">
          <img className="brand-logo" src="/logo.png" alt="Presqio" width={180} height={60} />
        </span>
        <Button size="small" onClick={() => void auth.logout().then(() => navigate("/"))}>
          Sign out
        </Button>
      </Head>
      <Body>
        <h1>Choose an organization</h1>
        <p className="muted">Signed in as {me.user.email}</p>
        <OrgList>
          {me.organizations.map((org) => (
            <li key={org.id}>
              <OrgCard className="card" onClick={() => open(org)}>
                <OrgInitial>{org.name.slice(0, 1).toUpperCase()}</OrgInitial>
                <OrgCopy>
                  <strong>{org.name}</strong>
                  <span className="sm muted">
                    {ROLE_LABEL[org.role]} · {org.branchCount}{" "}
                    {org.branchCount === 1 ? "branch" : "branches"}
                    {org.onboardingStep !== "COMPLETED" && " · setup in progress"}
                  </span>
                </OrgCopy>
                <Icon name="chevron" className="tiny" />
              </OrgCard>
            </li>
          ))}
        </OrgList>
        {creating ? (
          <CreateForm className="card" onSubmit={create}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="New organization name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              helperText="For a separate company or client with its own billing and admins"
            />
            <div className="between">
              <Button onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={busy || name.trim().length < 2}>
                {busy ? "Creating…" : "Create and set up"}
              </Button>
            </div>
          </CreateForm>
        ) : (
          <Button startIcon={<Icon name="plus" className="tiny" />} onClick={() => setCreating(true)}>
            Create another organization
          </Button>
        )}
      </Body>
    </Page>
  );
}
