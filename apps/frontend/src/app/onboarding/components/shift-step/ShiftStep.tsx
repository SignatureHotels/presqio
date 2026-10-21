import { useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import type { CreateShiftRequest, ShiftRecord, Weekday } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { Icon } from "@/components";
import { StepFrame, StepList, StepListIcon } from "../step-frame";
import { WEEKDAYS } from "../../onboarding-options";
import { WeekdayPicker, WeekdayToggle } from "./ShiftStep.style";

const defaultDraft = (): Required<CreateShiftRequest> => ({
  name: "General shift",
  start: "09:00",
  end: "18:00",
  graceMinutes: 10,
  breakMinutes: 60,
  workingDays: [1, 2, 3, 4, 5, 6],
});

const dayLabel = (days: Weekday[]) =>
  WEEKDAYS.filter((w) => days.includes(w.day))
    .map((w) => w.short)
    .join(", ");

export function ShiftStep({
  shifts,
  onCreate,
  onContinue,
  onBack,
}: {
  shifts: ShiftRecord[];
  onCreate: (request: CreateShiftRequest) => Promise<void>;
  onContinue: () => Promise<void>;
  onBack: () => void;
}) {
  const [adding, setAdding] = useState(shifts.length === 0);
  const [draft, setDraft] = useState(defaultDraft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const overnight = draft.end < draft.start;
  const valid =
    draft.name.trim().length >= 2 &&
    draft.start !== draft.end &&
    draft.workingDays.length > 0 &&
    draft.graceMinutes >= 0 &&
    draft.breakMinutes >= 0;

  function toggleDay(day: Weekday) {
    setDraft((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((d) => d !== day)
        : [...current.workingDays, day].sort((a, b) => a - b),
    }));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (adding) {
        await onCreate({ ...draft, name: draft.name.trim() });
        setDraft(defaultDraft());
        setAdding(false);
        setBusy(false);
      } else {
        await onContinue();
      }
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  const minutes = (key: "graceMinutes" | "breakMinutes", label: string, max: number, helper: string) => (
    <TextField
      label={label}
      type="number"
      value={draft[key]}
      onChange={(event) =>
        setDraft({ ...draft, [key]: Math.max(0, Math.min(max, Number(event.target.value) || 0)) })
      }
      helperText={helper}
      slotProps={{ htmlInput: { min: 0, max } }}
    />
  );

  return (
    <StepFrame
      eyebrow="Step 3"
      title="Set your default shift"
      description="Shifts decide when an employee is on time, late or absent. Assign different shifts to people later."
      error={error}
      busy={busy}
      submitLabel={adding ? "Save shift" : "Continue"}
      submitDisabled={adding ? !valid : shifts.length === 0}
      onSubmit={submit}
      onBack={onBack}
    >
      {shifts.length > 0 && (
        <StepList>
          {shifts.map((shift) => (
            <li key={shift.id}>
              <StepListIcon>
                <Icon name="clock" className="tiny" />
              </StepListIcon>
              <div>
                <strong>{shift.name}</strong>
                <span className="sm muted">
                  {shift.start}–{shift.end}
                  {shift.overnight ? " (next day)" : ""} · {dayLabel(shift.workingDays)} · {shift.graceMinutes} min grace
                </span>
              </div>
            </li>
          ))}
        </StepList>
      )}
      {adding ? (
        <>
          <TextField
            label="Shift name"
            required
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <div className="form-columns">
            <TextField
              label="Starts at"
              type="time"
              value={draft.start}
              onChange={(event) => setDraft({ ...draft, start: event.target.value })}
            />
            <TextField
              label="Ends at"
              type="time"
              value={draft.end}
              onChange={(event) => setDraft({ ...draft, end: event.target.value })}
              helperText={overnight ? "Ends the next day (overnight shift)" : " "}
            />
          </div>
          <div className="form-columns">
            {minutes("graceMinutes", "Grace period (minutes)", 120, "Check-ins within this are on time")}
            {minutes("breakMinutes", "Unpaid break (minutes)", 240, "Deducted from worked hours")}
          </div>
          <WeekdayPicker>
            <legend className="fw7">Working days</legend>
            {WEEKDAYS.map(({ day, short }) => (
              <WeekdayToggle
                key={day}
                type="button"
                selected={draft.workingDays.includes(day)}
                aria-pressed={draft.workingDays.includes(day)}
                onClick={() => toggleDay(day)}
              >
                {short}
              </WeekdayToggle>
            ))}
          </WeekdayPicker>
          {draft.start === draft.end && (
            <Alert severity="warning">Start and end times must differ.</Alert>
          )}
          {shifts.length > 0 && <Button onClick={() => setAdding(false)}>Cancel adding shift</Button>}
        </>
      ) : (
        <Button variant="outlined" onClick={() => setAdding(true)} startIcon={<Icon name="plus" className="tiny" />}>
          Add another shift
        </Button>
      )}
    </StepFrame>
  );
}
