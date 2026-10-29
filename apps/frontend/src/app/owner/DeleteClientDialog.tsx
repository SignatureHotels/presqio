import { useEffect, useState } from "react";
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import type { DeletedClient } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { ownerApi } from "@/api/owner";

/** Permanent delete of a client and all its data; the owner types the business name to confirm. */
export function DeleteClientDialog({
  client,
  onClose,
  onDeleted,
}: {
  client: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted: (result: DeletedClient) => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTyped("");
    setError("");
  }, [client?.id]);

  const matches = client !== null && typed.trim() === client.name.trim();

  async function remove() {
    if (!client || !matches) return;
    setBusy(true);
    setError("");
    try {
      onDeleted(await ownerApi.deleteClient(client.id, typed));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={client !== null} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete {client?.name} permanently?</DialogTitle>
      <DialogContent>
        <p style={{ marginTop: 0 }}>
          This removes the business and everything in it from the database: branches, employees,
          check-ins, selfies, payroll, history and their sign-in accounts. It can't be undone.
        </p>
        <p>To keep their data, suspend the workspace instead.</p>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <TextField
          fullWidth
          size="small"
          autoFocus
          label={`Type "${client?.name ?? ""}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void remove()}
        />
      </DialogContent>
      <DialogActions>
        <button className="btn" disabled={busy} onClick={onClose}>Keep client</button>
        <button className="btn danger-solid" disabled={!matches || busy} onClick={() => void remove()}>
          {busy ? "Deleting…" : "Delete forever"}
        </button>
      </DialogActions>
    </Dialog>
  );
}
