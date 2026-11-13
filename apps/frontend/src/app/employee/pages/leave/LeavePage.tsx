import { useEffect, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import type { EmployeeLeaveOptions, LeaveDay } from "@presqio/lib";
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
  const [options, setOptions] = useState<EmployeeLeaveOptions | null>(null);
  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    employeeApi.leaves().then(setLeaves).catch((caught) => setError(errorMessage(caught)));
    employeeApi.leaveOptions().then(setOptions).catch(() => setOptions({ year: 0, types: [], holidays: [] }));
  }, []);
  const types = options?.types ?? [];
  const chosen = types.find((t) => t.id === typeId);
  const holidayOn = options?.holidays.find((h) => h.date === date);
  // the only type left with room: pick it for them
  useEffect(() => {
    if (!typeId && types.length === 1) setTypeId(types[0].id);
  }, [types, typeId]);

  async function take(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const leave = await employeeApi.takeLeave({ date, reason: reason.trim() || undefined, typeId: typeId || undefined });
      setLeaves((current) => [leave, ...(current ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
      setNotice(`${leave.typeName ?? "Leave"} saved for ${dayTitle(leave.date)}.`);
      setReason("");
      void employeeApi.leaveOptions().then(setOptions).catch(() => undefined);   // balances changed
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
      void employeeApi.leaveOptions().then(setOptions).catch(() => undefined);
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
          {types.length > 0 && (
            <TextField select label="Kind of leave" value={typeId} onChange={(e) => setTypeId(e.target.value)}
              helperText={chosen ? (chosen.paid ? "Paid leave" : "Unpaid: this day isn't paid") : "Choose one"}>
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id} disabled={t.remaining === 0}>
                  {t.name} · {t.remaining === null ? "no limit" : t.remaining === 0 ? `none left in ${options?.year}` : `${t.remaining} of ${t.allowed} left`}
                  {!t.paid && " (unpaid)"}
                </MenuItem>
              ))}
            </TextField>
          )}
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
          {holidayOn && <Alert severity="info">{holidayOn.name} is a holiday. No leave is needed that day.</Alert>}
          <Button type="submit" variant="contained" disabled={busy || !date || date < today || !!holidayOn || (types.length > 0 && !chosen)}>
            {busy ? "Saving…" : "Take leave"}
          </Button>
        </LeaveForm>
      </Panel>

      {types.some((t) => t.allowed !== null) && (
        <>
          <SectionTitle>Your leave in {options?.year}</SectionTitle>
          <Panel>
            {types.filter((t) => t.allowed !== null).map((t) => (
              <p key={t.id} className="balance"><strong>{t.name}</strong> · {t.used} used, {t.remaining} of {t.allowed} left</p>
            ))}
          </Panel>
        </>
      )}

      <SectionTitle>Upcoming</SectionTitle>
      {leaves && upcoming.length === 0 && <Empty>No leave planned.</Empty>}
      <DayList>
        {upcoming.map((leave) => (
          <LeaveRow key={leave.id} leave={leave} today={today} onCancel={() => void cancel(leave)} />
        ))}
      </DayList>

      {!!options?.holidays.length && (
        <>
          <SectionTitle>Holidays</SectionTitle>
          <DayList>
            {options.holidays.slice(0, 8).map((h) => {
              const d = new Date(`${h.date}T00:00:00Z`);
              return (
                <DayRow key={h.id}>
                  <div className="date">
                    <strong>{d.getUTCDate()}</strong>
                    <small>{d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase()}</small>
                  </div>
                  <div className="info">
                    <strong>{h.name}</strong>
                    <small>{d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })}</small>
                  </div>
                  <span className="chip">Holiday</span>
                </DayRow>
              );
            })}
          </DayList>
        </>
      )}

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
        <small>{[leave.typeName, leave.reason].filter(Boolean).join(" · ") || "Leave"}</small>
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
