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
import { errorText, useT, type MessageKey } from "@/i18n";
import { shortMonth } from "../../utils/time";
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
  const t = useT();

  useEffect(() => {
    employeeApi.corrections().then(setRequests).catch((caught) => setError(errorText(caught)));
    employeeApi.history().then(setDays).catch(() => undefined);
  }, []);

  return (
    <MobileShell title={t("req.title")} subtitle={t("req.subtitle")}>
      <Panel>
        <NewRequest>
          <strong>{t("req.heading")}</strong>
          <p>{t("req.intro")}</p>
          <Button variant="contained" startIcon={<Icon name="plus" className="tiny" />} onClick={() => setOpen(true)} disabled={!days.length}>
            {t("req.new")}
          </Button>
          {!days.length && <small>{t("req.afterFirst")}</small>}
        </NewRequest>
      </Panel>
      {error && <Empty>{error}</Empty>}
      {requests && requests.length === 0 && <Empty>{t("req.none")}</Empty>}
      <DayList>
        {(requests ?? []).map((request) => (
          <DayRow key={request.id}>
            <div className="date">
              <strong>{Number(request.date.slice(8))}</strong>
              <small>{shortMonth(request.date)}</small>
            </div>
            <div className="info">
              <strong>{t(`corr.${request.type}` as MessageKey)}</strong>
              <small>{request.decisionReason ?? request.reason}</small>
            </div>
            <StatusChip status={request.status} label={t(`status.${request.status}` as MessageKey)} />
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
  const t = useT();

  async function send() {
    if (reason.trim().length < 5) return setError(t("req.explain"));
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
      setError(errorText(caught));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth>
      <DialogTitle>{t("req.dialog")}</DialogTitle>
      <DialogContent className="dialog-fields">
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select label={t("req.day")} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          {days.map((day) => (
            <MenuItem key={day.sessionId} value={day.sessionId}>
              {day.date} · {day.checkIn}–{day.checkOut ?? t("req.noOut")}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label={t("req.what")} value={kind} onChange={(e) => setKind(e.target.value as "in" | "out")}>
          <MenuItem value="out">{t("req.outOption")}</MenuItem>
          <MenuItem value="in">{t("req.inOption")}</MenuItem>
        </TextField>
        <TextField
          type="time"
          label={kind === "out" ? t("req.correctOut") : t("req.correctIn")}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          multiline
          rows={3}
          label={t("req.reason")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("req.reasonPlaceholder")}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t("req.cancel")}
        </Button>
        <Button variant="contained" onClick={() => void send()} disabled={busy}>
          {busy ? t("req.sending") : t("req.send")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
