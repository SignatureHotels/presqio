import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { errorMessage } from "@/api/client";
import { useAdmin } from "@/hooks/use-admin";
import { EmployeeAvatar } from "@/components/employee-avatar";

import type { Approval } from "@presqio/lib";

export function ReviewDialog({
  approval,
  onClose,
}: {
  approval: Approval;
  onClose: () => void;
}) {
  const { employees, actions, notify } = useAdmin();
  const employee = employees.find((item) => item.id === approval.employeeId) ?? {
    name: "Former employee",
    code: "—",
  };
  const [decision, setDecision] = useState<"Approved" | "Rejected">("Approved");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError("Enter a review reason of at least 5 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await actions.decideCorrection(approval.id, { decision, reason: reason.trim() });
      notify(`${employee.name}: request ${decision.toLowerCase()}.`);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={save}>
        <DialogTitle>Review request</DialogTitle>
        <DialogContent className="dialog-fields">
          <EmployeeAvatar employee={employee} />
          <p>
            <strong>{approval.type}</strong>
            <br />
            {approval.reason}
          </p>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Decision"
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value as typeof decision)
            }
          >
            <MenuItem value="Approved">Approve request</MenuItem>
            <MenuItem value="Rejected">Reject request</MenuItem>
          </TextField>
          <TextField
            autoFocus
            required
            multiline
            rows={3}
            label="Review reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Alert severity="info">
            Your decision and reason are recorded with your name. The original check-in record is
            kept unchanged.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? "Saving…" : "Save decision"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
