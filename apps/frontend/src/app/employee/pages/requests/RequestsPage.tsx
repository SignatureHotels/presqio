import { useEffect, useState } from "react";
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
import type { AttendanceHistoryDay, EmployeeCorrection } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { employeeApi } from "@/api/employee-client";
import { Icon } from "@/components";
import { StatusChip } from "@/components/status-chip";
import { MobileShell } from "../../components/mobile-shell";
import { Panel } from "../../EmployeeApp.style";
import { DayList, DayRow, Empty } from "../history/HistoryPage.style";
import { NewRequest } from "./RequestsPage.style";

export function RequestsPage() {
  const [requests, setRequests] = useState<EmployeeCorrection[] | null>(null);
  const [days, setDays] = useState<AttendanceHistoryDay[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    employeeApi.corrections().then(setRequests).catch((caught) => setError(errorMessage(caught)));
    employeeApi.history().then(setDays).catch(() => undefined);
  }, []);

  return (
    <MobileShell title="My requests" subtitle="Fix a missed or wrong punch">
      <Panel>
        <NewRequest>
          <strong>Missed a check-out or wrong time?</strong>
          <p>Send a correction to your admin. Your original check-in record is kept.</p>
          <Button variant="contained" startIcon={<Icon name="plus" className="tiny" />} onClick={() => setOpen(true)} disabled={!days.length}>
            New correction request
          </Button>
          {!days.length && <small>You can request a correction after your first check-in.</small>}
        </NewRequest>
      </Panel>
      {error && <Empty>{error}</Empty>}
      {requests && requests.length === 0 && <Empty>No requests yet.</Empty>}
      <DayList>
        {(requests ?? []).map((request) => (
          <DayRow key={request.id}>
            <div className="date">
              <strong>{Number(request.date.slice(8))}</strong>
              <small>
                {new Date(`${request.date}T00:00:00Z`)
                  .toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })
                  .toUpperCase()}
              </small>
            </div>
            <div className="info">
              <strong>{request.type}</strong>
              <small>{request.decisionReason ?? request.reason}</small>
            </div>
            <StatusChip status={request.status} />
          </DayRow>
        ))}
      </DayList>
      {open && (
        <CorrectionDialog
          days={days}
          onClose={() => setOpen(false)}
          onSent={(sent) => {
            setRequests((current) => [sent, ...(current ?? [])]);
            setOpen(false);
          }}
        />
      )}
    </MobileShell>
  );
}

function CorrectionDialog({
  days,
  onClose,
  onSent,
}: {
  days: AttendanceHistoryDay[];
  onClose: () => void;
  onSent: (request: EmployeeCorrection) => void;
}) {
  const [sessionId, setSessionId] = useState(days.find((d) => !d.checkOut)?.sessionId ?? days[0].sessionId);
  const [kind, setKind] = useState<"out" | "in">("out");
  const [time, setTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (reason.trim().length < 5) return setError("Please explain what happened (at least 5 characters).");
    setBusy(true);
    setError("");
    try {
      onSent(
        await employeeApi.requestCorrection({
          sessionId,
          ...(kind === "out" ? { requestedOut: time } : { requestedIn: time }),
          reason: reason.trim(),
        }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth>
      <DialogTitle>Correction request</DialogTitle>
      <DialogContent className="dialog-fields">
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select label="Day" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          {days.map((day) => (
            <MenuItem key={day.sessionId} value={day.sessionId}>
              {day.date} · {day.checkIn}–{day.checkOut ?? "no check-out"}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="What needs fixing" value={kind} onChange={(e) => setKind(e.target.value as "in" | "out")}>
          <MenuItem value="out">Check-out time (missed or wrong)</MenuItem>
          <MenuItem value="in">Check-in time</MenuItem>
        </TextField>
        <TextField
          type="time"
          label={kind === "out" ? "Correct check-out time" : "Correct check-in time"}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          multiline
          rows={3}
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Phone battery died before I could check out"
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void send()} disabled={busy}>
          {busy ? "Sending…" : "Send request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
