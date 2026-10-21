import { useEffect, useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import type { LeaveDay } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { employeeApi } from "@/api/employee-client";
import { MobileShell } from "../../components/mobile-shell";
import { useEmployeeSession } from "../../context/employee-session";
import { Panel } from "../../EmployeeApp.style";
import { dayTitle } from "../../utils/time";
import { DayList, DayRow, Empty } from "../history/HistoryPage.style";
import { LeaveForm, SectionTitle } from "./LeavePage.style";

/** Days off the employee takes themselves; recorded at once, no approval. */
export function LeavePage() {
  const { profile, reload } = useEmployeeSession();
  const today = profile?.today.date ?? "";
  const [leaves, setLeaves] = useState<LeaveDay[] | null>(null);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    employeeApi.leaves().then(setLeaves).catch((caught) => setError(errorMessage(caught)));
  }, []);

  async function take(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const leave = await employeeApi.takeLeave({ date, reason: reason.trim() || undefined });
      setLeaves((current) => [leave, ...(current ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
      setNotice(`Leave saved for ${dayTitle(leave.date)}.`);
      setReason("");
      if (leave.date === today) void reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(leave: LeaveDay) {
    setError("");
    setNotice("");
    try {
      await employeeApi.cancelLeave(leave.id);
      setLeaves((current) => (current ?? []).filter((item) => item.id !== leave.id));
      setNotice(`Leave on ${dayTitle(leave.date)} cancelled.`);
      if (leave.date === today) void reload();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const upcoming = (leaves ?? []).filter((leave) => leave.date >= today).reverse();
  const past = (leaves ?? []).filter((leave) => leave.date < today);

  return (
    <MobileShell title="Leave" subtitle="Take a day off">
      <Panel>
        <LeaveForm onSubmit={take} noValidate>
          <strong>Take leave</strong>
          <p>Pick any day. It's saved straight away and your admin can see it.</p>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}
          <TextField
            type="date"
            label="Day"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
          />
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Family function"
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <Button type="submit" variant="contained" disabled={busy || !date || date < today}>
            {busy ? "Saving…" : "Take leave"}
          </Button>
        </LeaveForm>
      </Panel>

      <SectionTitle>Upcoming</SectionTitle>
      {leaves && upcoming.length === 0 && <Empty>No leave planned.</Empty>}
      <DayList>
        {upcoming.map((leave) => (
          <LeaveRow key={leave.id} leave={leave} today={today} onCancel={() => void cancel(leave)} />
        ))}
      </DayList>

      {past.length > 0 && (
        <>
          <SectionTitle>Earlier</SectionTitle>
          <DayList>
            {past.map((leave) => (
              <LeaveRow key={leave.id} leave={leave} today={today} />
            ))}
          </DayList>
        </>
      )}
    </MobileShell>
  );
}

function LeaveRow({ leave, today, onCancel }: { leave: LeaveDay; today: string; onCancel?: () => void }) {
  const date = new Date(`${leave.date}T00:00:00Z`);
  return (
    <DayRow>
      <div className="date">
        <strong>{date.getUTCDate()}</strong>
        <small>{date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase()}</small>
      </div>
      <div className="info">
        <strong>
          {date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })}
          {leave.date === today && " · today"}
        </strong>
        <small>{leave.reason || "Leave"}</small>
      </div>
      {onCancel && leave.cancellable ? (
        <Button size="small" color="error" onClick={onCancel}>
          Cancel
        </Button>
      ) : (
        <span className="chip accent">On leave</span>
      )}
    </DayRow>
  );
}
