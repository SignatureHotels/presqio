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
import type { ShiftRecord, Weekday } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { useAdmin } from "@/hooks/use-admin";
import { zoneLabel } from "@/utils/dates";
import { DayPicker, DayToggle } from "./ShiftDialog.style";

const DAYS: { day: Weekday; label: string }[] = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 7, label: "Sun" },
];
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

/** Create a shift (shift = null) or edit one. */
export function ShiftDialog({
  shift,
  onClose,
}: {
  shift: ShiftRecord | null;
  onClose: () => void;
}) {
  const { actions, notify, timezone } = useAdmin();
  const [draft, setDraft] = useState({
    name: shift?.name ?? "",
    start: shift?.start ?? "09:00",
    end: shift?.end ?? "18:00",
    breakMinutes: String(shift?.breakMinutes ?? 60),
    graceMinutes: String(shift?.graceMinutes ?? 10),
    workingDays: shift?.workingDays ?? ([1, 2, 3, 4, 5, 6] as Weekday[]),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const zone = zoneLabel(timezone);

  function toggle(day: Weekday) {
    setDraft((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((d) => d !== day)
        : [...current.workingDays, day].sort((a, b) => a - b),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const breakMinutes = Number(draft.breakMinutes);
    const graceMinutes = Number(draft.graceMinutes);
    const duration = (minutes(draft.end) - minutes(draft.start) + 1440) % 1440;
    if (draft.name.trim().length < 2) return setError("Enter a shift name.");
    if (!duration) return setError("Start and end times must be different.");
    if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes >= duration)
      return setError("The break must be shorter than the shift.");
    if (!Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 120)
      return setError("Late grace must be between 0 and 120 minutes.");
    if (!draft.workingDays.length) return setError("Choose at least one working day.");
    setBusy(true);
    setError("");
    const request = {
      name: draft.name.trim(),
      start: draft.start,
      end: draft.end,
      breakMinutes,
      graceMinutes,
      workingDays: draft.workingDays,
    };
    try {
      if (shift) await actions.updateShift(shift.id, request);
      else await actions.createShift(request);
      notify(`${request.name} ${shift ? "updated" : "created"}.`);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={save} noValidate>
        <DialogTitle>{shift ? "Edit shift" : "New shift"}</DialogTitle>
        <DialogContent className="dialog-fields">
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            required
            label="Shift name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <div className="form-columns">
            {(["start", "end"] as const).map((field) => (
              <TextField
                key={field}
                required
                type="time"
                label={`${field === "start" ? "Starts" : "Ends"} (${zone})`}
                value={draft[field]}
                onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={field === "end" && draft.end < draft.start ? "Ends the next day" : " "}
              />
            ))}
          </div>
          <div className="form-columns">
            <TextField
              type="number"
              label="Unpaid break (minutes)"
              value={draft.breakMinutes}
              onChange={(event) => setDraft({ ...draft, breakMinutes: event.target.value })}
            />
            <TextField
              type="number"
              label="Late grace (minutes)"
              value={draft.graceMinutes}
              onChange={(event) => setDraft({ ...draft, graceMinutes: event.target.value })}
              helperText="Check-ins within this are on time"
            />
          </div>
          <DayPicker>
            <legend>Working days</legend>
            {DAYS.map(({ day, label }) => (
              <DayToggle
                key={day}
                type="button"
                selected={draft.workingDays.includes(day)}
                aria-pressed={draft.workingDays.includes(day)}
                onClick={() => toggle(day)}
              >
                {label}
              </DayToggle>
            ))}
          </DayPicker>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={busy}>
            {busy ? "Saving…" : shift ? "Save changes" : "Create shift"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
