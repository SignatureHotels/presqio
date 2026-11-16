import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material";
import type { InvitableAccess, TeamAccess, TeamMember, TeamResponse } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { teamApi } from "@/api/team";
import { Icon, SectionHeader } from "@/components";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

const ACCESS: Record<TeamAccess, { label: string; detail: string }> = {
  OWNER: { label: "Owner", detail: "Created the workspace. Can do everything." },
  ADMIN: { label: "Admin", detail: "Everything: payroll, settings, branches, shifts and the team." },
  MANAGER: { label: "Branch manager", detail: "Runs their branches: employees, attendance, approvals and the roster. No payroll or settings." },
  VIEWER: { label: "Viewer", detail: "Sees attendance and employees for their branches. Can't change anything." },
};
const MAX_EMAIL = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Owners and admins invite people and choose what each one can see and do. */
export function TeamPage() {
  const { organization, branches, notify } = useAdmin();
  const { me } = useAuth();
  const organizationId = organization?.id ?? "";
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "Removed branch";
  const scope = (ids: string[], access: TeamAccess) =>
    access === "OWNER" || access === "ADMIN" ? "All branches" : ids.length ? ids.map(branchName).join(", ") : "All branches";

  const load = useCallback(async () => {
    if (!organizationId) return;
    try { setTeam(await teamApi.list(organizationId)); } catch (caught) { setError(errorMessage(caught)); }
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  async function act(run: () => Promise<unknown>, done: string) {
    setBusy(true); setError("");
    try { await run(); notify(done); await load(); return true; }
    catch (caught) { setError(errorMessage(caught)); return false; }
    finally { setBusy(false); }
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {me && !me.user.emailVerified && (
        <Alert severity="warning" sx={{ mb: 2 }}>Verify your email to invite people. We sent you a link when you signed up.</Alert>
      )}
      <section className="card card-pad">
        <SectionHeader title="People who run this workspace" subtitle="Employees aren't listed here: they sign in on their phone with their employee ID." />
        <div className="policy-list">
          {!team && <p className="muted sm">Loading…</p>}
          {team?.members.map((m) => (
            <div className="policy" key={m.userId}>
              <div>
                <b>{m.name}{m.you ? " (you)" : ""}</b>
                <p>{m.email ?? "—"} · {scope(m.branchIds, m.access)}</p>
              </div>
              <span className={m.access === "OWNER" || m.access === "ADMIN" ? "chip success" : "chip"}>{ACCESS[m.access].label}</span>
              {m.access !== "OWNER" && !m.you && (
                <>
                  <button className="btn" disabled={busy} onClick={() => setEditing(m)}>Change</button>
                  <button className="btn" disabled={busy}
                    onClick={() => window.confirm(`Remove ${m.name}? They lose access at once.`) &&
                      void act(() => teamApi.remove(organizationId, m.userId), `${m.name} removed.`)}>
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <Button sx={{ mt: 1 }} variant="contained" startIcon={<Icon name="plus" className="tiny" />} disabled={busy || !me?.user.emailVerified}
          onClick={() => setInviting(true)}>
          Invite someone
        </Button>
      </section>

      {!!team?.invitations.length && (
        <section className="card card-pad" style={{ marginTop: 16 }}>
          <SectionHeader title="Waiting to accept" subtitle="Invitations last 7 days." />
          <div className="policy-list">
            {team.invitations.map((i) => (
              <div className="policy" key={i.id}>
                <div>
                  <b>{i.email}</b>
                  <p>{ACCESS[i.access].label} · {scope(i.branchIds, i.access)} · expires {new Date(i.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <button className="btn" disabled={busy} onClick={() => void act(() => teamApi.resend(organizationId, i.id), `Invitation sent again to ${i.email}.`)}>Resend</button>
                <button className="btn" disabled={busy} onClick={() => void act(() => teamApi.revoke(organizationId, i.id), `Invitation to ${i.email} cancelled.`)}>Cancel</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card card-pad" style={{ marginTop: 16 }}>
        <SectionHeader title="What each role can do" />
        <div className="policy-list">
          {(["ADMIN", "MANAGER", "VIEWER"] as const).map((a) => (
            <div className="policy" key={a}><div><b>{ACCESS[a].label}</b><p>{ACCESS[a].detail}</p></div></div>
          ))}
        </div>
      </section>

      {inviting && (
        <AccessDialog title="Invite someone" submit="Send invitation" busy={busy} withEmail onClose={() => setInviting(false)}
          onSave={async (v) => (await act(() => teamApi.invite(organizationId, { email: v.email, access: v.access, branchIds: v.branchIds }),
            `Invitation sent to ${v.email}.`)) && setInviting(false)} />
      )}
      {editing && (
        <AccessDialog title={`Change access · ${editing.name}`} submit="Save" busy={busy}
          initial={{ email: editing.email ?? "", access: editing.access === "OWNER" ? "ADMIN" : editing.access, branchIds: editing.branchIds }}
          onClose={() => setEditing(null)}
          onSave={async (v) => (await act(() => teamApi.update(organizationId, editing.userId, { access: v.access, branchIds: v.branchIds }),
            `${editing.name}'s access updated.`)) && setEditing(null)} />
      )}
    </>
  );
}

type AccessValues = { email: string; access: InvitableAccess; branchIds: string[] };

function AccessDialog({ title, submit, busy, withEmail = false, initial, onClose, onSave }: {
  title: string; submit: string; busy: boolean; withEmail?: boolean; initial?: AccessValues;
  onClose: () => void; onSave: (values: AccessValues) => Promise<unknown>;
}) {
  const { branches } = useAdmin();
  const [values, setValues] = useState<AccessValues>(initial ?? { email: "", access: "MANAGER", branchIds: branches.length === 1 ? [branches[0].id] : [] });
  const [error, setError] = useState("");
  const scoped = values.access !== "ADMIN";

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (withEmail && !EMAIL.test(values.email.trim())) return setError("Enter their email address.");
    if (values.access === "MANAGER" && !values.branchIds.length) return setError("Choose the branches they run.");
    setError("");
    void onSave({ ...values, email: values.email.trim().toLowerCase(), branchIds: scoped ? values.branchIds : [] });
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={save} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {withEmail && (
              <TextField required type="email" label="Email" value={values.email} autoFocus
                onChange={(e) => setValues({ ...values, email: e.target.value })} slotProps={{ htmlInput: { maxLength: MAX_EMAIL } }}
                helperText="They get an email with a link to join. If they're new to Presqio they set a password from it." />
            )}
            <RadioGroup value={values.access} onChange={(e) => setValues({ ...values, access: e.target.value as InvitableAccess })}>
              {(["MANAGER", "VIEWER", "ADMIN"] as const).map((a) => (
                <FormControlLabel key={a} value={a} control={<Radio />} sx={{ alignItems: "flex-start", mb: 1 }}
                  label={<span><b>{ACCESS[a].label}</b><Typography variant="body2" color="text.secondary">{ACCESS[a].detail}</Typography></span>} />
              ))}
            </RadioGroup>
            {scoped && (
              <TextField select label={values.access === "MANAGER" ? "Branches they run" : "Branches they can see"} value={values.branchIds}
                slotProps={{ select: { multiple: true, renderValue: (ids) => (ids as string[]).length
                  ? (ids as string[]).map((id) => branches.find((b) => b.id === id)?.name ?? "").join(", ") : "All branches" } }}
                onChange={(e) => setValues({ ...values, branchIds: typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as unknown as string[]) })}
                helperText={values.access === "VIEWER" ? "Leave empty to let them see every branch." : "They only see employees and attendance at these branches."}>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : submit}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
