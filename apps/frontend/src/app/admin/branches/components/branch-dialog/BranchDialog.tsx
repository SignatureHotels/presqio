import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { BranchRecord } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { useAdmin } from "@/hooks/use-admin";

type Draft = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius: string;
  maxAccuracy: string;
};

/** Add a branch (branch = null) or edit one's details and check-in perimeter. */
export function BranchDialog({
  branch,
  onClose,
}: {
  branch: BranchRecord | null;
  onClose: () => void;
}) {
  const { actions, notify } = useAdmin();
  const [draft, setDraft] = useState<Draft>({
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    latitude: branch ? String(branch.latitude) : "",
    longitude: branch ? String(branch.longitude) : "",
    radius: String(branch?.radius ?? 100),
    maxAccuracy: String(branch?.maxAccuracy ?? 50),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [key]: event.target.value });

  function locate() {
    if (!("geolocation" in navigator))
      return setError("This browser cannot share its location. Enter the coordinates instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError("Location permission was denied or unavailable. Enter the coordinates instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    const radius = Number(draft.radius);
    const maxAccuracy = Number(draft.maxAccuracy);
    if (draft.name.trim().length < 2) return setError("Enter a branch name.");
    if (draft.latitude === "" || !Number.isFinite(latitude) || Math.abs(latitude) > 90)
      return setError("Latitude must be between -90 and 90.");
    if (draft.longitude === "" || !Number.isFinite(longitude) || Math.abs(longitude) > 180)
      return setError("Longitude must be between -180 and 180.");
    if (!Number.isFinite(radius) || radius < 20 || radius > 2000)
      return setError("Perimeter radius must be between 20 and 2000 metres.");
    if (!Number.isFinite(maxAccuracy) || maxAccuracy < 5 || maxAccuracy > 500)
      return setError("Required GPS accuracy must be between 5 and 500 metres.");
    setBusy(true);
    setError("");
    const request = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      latitude,
      longitude,
      radius,
      maxAccuracy,
    };
    try {
      if (branch) {
        await actions.updateBranch(branch.id, request);
        notify(`${request.name} updated.`);
      } else {
        await actions.createBranch({ ...request, address: request.address || undefined });
        notify(`${request.name} added.`);
      }
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={save} noValidate>
        <DialogTitle>{branch ? "Manage branch & perimeter" : "Add branch"}</DialogTitle>
        <DialogContent className="dialog-fields">
          {error && <Alert severity="error">{error}</Alert>}
          <TextField autoFocus required label="Branch name" value={draft.name} onChange={set("name")} />
          <TextField label="Address (optional)" value={draft.address} onChange={set("address")} />
          <div className="form-columns">
            <TextField required label="Latitude" slotProps={{ htmlInput: { inputMode: "decimal" } }} value={draft.latitude} onChange={set("latitude")} />
            <TextField required label="Longitude" slotProps={{ htmlInput: { inputMode: "decimal" } }} value={draft.longitude} onChange={set("longitude")} />
          </div>
          <Button variant="outlined" onClick={locate} disabled={locating}>
            {locating ? "Locating…" : "Use my current location"}
          </Button>
          <div className="form-columns">
            <TextField
              required
              type="number"
              label="Perimeter radius (m)"
              value={draft.radius}
              onChange={set("radius")}
              helperText="Employees must be inside this circle"
            />
            <TextField
              required
              type="number"
              label="Required GPS accuracy (m)"
              value={draft.maxAccuracy}
              onChange={set("maxAccuracy")}
              helperText="Readings less precise than this are retried"
            />
          </div>
          {branch && (
            <Alert severity="info">
              Changing the location or radius starts a new perimeter from now. Earlier check-ins
              keep the perimeter they were checked against.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={busy}>
            {busy ? "Saving…" : branch ? "Save changes" : "Add branch"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
