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
import type { Employee } from "@/types/admin-preview";

const PHONE = /^\+?[0-9][0-9 ()-]{6,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

/** Add a new employee, or edit one when `employee` is given. */
export function EmployeeDialog({
  employee,
  onClose,
}: {
  employee?: Employee;
  onClose: () => void;
}) {
  const { branches, shifts, branchFilter, actions, notify } = useAdmin();
  const editing = Boolean(employee);
  const [draft, setDraft] = useState({
    fullName: employee?.name ?? "",
    code: employee?.code ?? "",
    branchId:
      employee?.branchId ||
      (branchFilter !== "all" ? branchFilter : (branches[0]?.id ?? "")),
    shiftId: employee?.shiftId ?? (shifts.length === 1 ? shifts[0].id : ""),
    jobTitle: employee?.role ?? "",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [key]: event.target.value });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const code = draft.code.trim().toUpperCase();
    if (draft.fullName.trim().length < 2) return setError("Enter the employee's full name.");
    if (!editing && code && !CODE.test(code))
      return setError("Employee ID can use 2–20 letters, numbers or dashes.");
    if (!draft.branchId) return setError("Choose the branch this employee works at.");
    if (draft.phone.trim() && !PHONE.test(draft.phone.trim()))
      return setError("Enter a valid phone number or leave it empty.");
    if (draft.email.trim() && !EMAIL.test(draft.email.trim()))
      return setError("Enter a valid email or leave it empty.");
    setBusy(true);
    setError("");
    try {
      if (employee) {
        await actions.updateEmployee(employee.id, {
          fullName: draft.fullName.trim(),
          branchId: draft.branchId,
          shiftId: draft.shiftId || null,
          jobTitle: draft.jobTitle.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
        });
        notify(`${draft.fullName.trim()} updated.`);
      } else {
        const created = await actions.createEmployee({
          fullName: draft.fullName.trim(),
          code: code || undefined,
          branchId: draft.branchId,
          shiftId: draft.shiftId || undefined,
          jobTitle: draft.jobTitle.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          email: draft.email.trim() || undefined,
        });
        notify(`${created.name} added as ${created.code}.`);
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
        <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
        <DialogContent className="dialog-fields">
          {!editing && (
            <p className="muted">
              They start as Pending. Share their employee ID; they sign in on their phone with
              just that ID and can check in inside their branch perimeter.
            </p>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            required
            label="Full name"
            value={draft.fullName}
            onChange={set("fullName")}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label={editing ? "Employee ID" : "Employee ID (optional)"}
            placeholder="Generated automatically, e.g. SGH0001"
            value={draft.code}
            onChange={set("code")}
            disabled={editing}
            helperText={editing ? "Employee IDs can't be changed." : undefined}
            slotProps={{ htmlInput: { maxLength: 20 } }}
          />
          <div className="form-columns">
            <TextField required select label="Branch" value={draft.branchId} onChange={set("branchId")}>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Shift" value={draft.shiftId} onChange={set("shiftId")}>
              <MenuItem value="">No shift yet</MenuItem>
              {shifts.map((shift) => (
                <MenuItem key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start}–{shift.end})
                </MenuItem>
              ))}
            </TextField>
          </div>
          <TextField
            label="Job title (optional)"
            value={draft.jobTitle}
            onChange={set("jobTitle")}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <div className="form-columns">
            <TextField type="tel" label="Phone (optional)" value={draft.phone} onChange={set("phone")} />
            <TextField type="email" label="Email (optional)" value={draft.email} onChange={set("email")} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add employee"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
