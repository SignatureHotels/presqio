import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { KioskPairing, KioskRecord } from "@presqio/lib";
import { ApiRequestError, errorMessage } from "@/api/client";
import { kiosksAdminApi } from "@/api/kiosk";
import { Icon, SectionHeader } from "@/components";
import { useAdmin } from "@/hooks/use-admin";

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return minutes < 2 ? "just now" : minutes < 60 ? `${minutes} min ago` : minutes < 48 * 60 ? `${Math.round(minutes / 60)} h ago` : `${Math.round(minutes / 1440)} days ago`;
};

/** Shared check-in devices (a tablet at the entrance), one per branch or more. */
export function KiosksPanel() {
  const { organization, businessId, branches } = useAdmin();
  const organizationId = organization?.id ?? "";
  const [kiosks, setKiosks] = useState<KioskRecord[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pairing, setPairing] = useState<KioskPairing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId || !businessId) return;
    try {
      setKiosks(await kiosksAdminApi.list(organizationId, businessId));
    } catch (caught) {
      // branch managers don't manage kiosks
      if (caught instanceof ApiRequestError && caught.status === 403) setHidden(true);
      else setError(errorMessage(caught));
    }
  }, [organizationId, businessId]);
  useEffect(() => { void load(); }, [load]);

  async function act<T>(run: () => Promise<T>, after?: (value: T) => void) {
    setBusy(true); setError("");
    try {
      const value = await run();
      after?.(value);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;
  const active = (kiosks ?? []).filter((k) => k.status !== "REVOKED");
  return (
    <section className="card card-pad" style={{ marginTop: 16 }}>
      <SectionHeader
        title="Kiosks"
        subtitle="A shared tablet or phone at the entrance. Staff type their employee ID and take a selfie; no personal phone needed."
      />
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <div className="policy-list">
        {kiosks && !active.length && <p className="muted sm">No kiosks yet. Good for shops, factories and sites where not everyone has a smartphone.</p>}
        {active.map((k) => (
          <div className="policy" key={k.id}>
            <div>
              <b>{k.name}</b>
              <p>{k.branchName} · {k.status === "PAIRING" ? "waiting to be paired" : `last seen ${ago(k.lastSeenAt)}`}</p>
            </div>
            <span className={k.status === "ACTIVE" ? "chip success" : "chip"}>{k.status === "ACTIVE" ? "Paired" : "Not paired"}</span>
            <button className="btn" disabled={busy} onClick={() => void act(() => kiosksAdminApi.repair(organizationId, businessId, k.id), setPairing)}>
              {k.status === "ACTIVE" ? "Pair a new device" : "New code"}
            </button>
            <button className="btn" disabled={busy}
              onClick={() => window.confirm(`Sign out "${k.name}"? It stops working at once.`) && void act(() => kiosksAdminApi.revoke(organizationId, businessId, k.id))}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <Button sx={{ mt: 1 }} startIcon={<Icon name="plus" className="tiny" />} disabled={busy || !branches.length} onClick={() => setAdding(true)}>Add kiosk</Button>

      {adding && (
        <AddKiosk busy={busy} onClose={() => setAdding(false)}
          onAdd={(name, branchId) => act(() => kiosksAdminApi.create(organizationId, businessId, { name, branchId }), (p) => { setAdding(false); setPairing(p); })} />
      )}
      {pairing && <PairingDialog pairing={pairing} onClose={() => setPairing(null)} />}
    </section>
  );
}

function AddKiosk({ busy, onClose, onAdd }: { busy: boolean; onClose: () => void; onAdd: (name: string, branchId: string) => Promise<void> }) {
  const { branches } = useAdmin();
  const [name, setName] = useState("Entrance kiosk");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={(e) => { e.preventDefault(); void onAdd(name.trim(), branchId); }}>
        <DialogTitle>Add a kiosk</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Name" value={name} onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { minLength: 2, maxLength: 60 } }}
              helperText="So you can tell devices apart, e.g. Front gate tablet" />
            <TextField select required label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}
              helperText="Check-ins on this device are recorded at this branch.">
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || name.trim().length < 2 || !branchId}>Create and get code</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function PairingDialog({ pairing, onClose }: { pairing: KioskPairing; onClose: () => void }) {
  const link = `${window.location.origin}/kiosk`;
  const [copied, setCopied] = useState(false);
  const minutes = Math.max(1, Math.round((Date.parse(pairing.expiresAt) - Date.now()) / 60_000));
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Pair “{pairing.kiosk.name}”</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>On the tablet or phone at {pairing.kiosk.branchName}:</Typography>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Open <b>{link}</b></li>
            <li>Enter this code:</li>
          </ol>
          <Typography component="div" sx={{ fontSize: 40, fontWeight: 800, letterSpacing: "0.12em", textAlign: "center", fontFamily: "monospace" }}>
            {pairing.code}
          </Typography>
          <Button variant="outlined" onClick={() => void navigator.clipboard?.writeText(`${link}?code=${pairing.code}`).then(() => setCopied(true)).catch(() => undefined)}>
            {copied ? "Link copied" : "Copy a link with the code"}
          </Button>
          <Alert severity="info">
            The code works once and expires in {minutes} minutes. Allow the camera when asked, and keep the device plugged in;
            the screen stays on while the kiosk is open.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={onClose}>Done</Button></DialogActions>
    </Dialog>
  );
}
