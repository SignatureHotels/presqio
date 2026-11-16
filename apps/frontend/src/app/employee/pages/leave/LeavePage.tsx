import { useEffect, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import type { EmployeeLeaveOptions, LeaveDay } from "@presqio/lib";
import { errorText, useT } from "@/i18n";
import { employeeApi } from "@/api/employee-client";
import { MobileShell } from "../../components/mobile-shell";
import { useEmployeeSession } from "../../context/employee-session";
import { Panel } from "../../EmployeeApp.style";
import { dayTitle, shortMonth, weekdayName } from "../../utils/time";
import { DayList, DayRow, Empty } from "../history/HistoryPage.style";
import { LeaveForm, SectionTitle } from "./LeavePage.style";

/** Days off the employee takes themselves; recorded at once, no approval. */
export function LeavePage() {
  const { profile, reload } = useEmployeeSession();
  const t = useT();
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
    employeeApi.leaves().then(setLeaves).catch((caught) => setError(errorText(caught)));
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
      setNotice(t("leave.saved", { type: leave.typeName ?? t("leave.word"), date: dayTitle(leave.date) }));
      setReason("");
      void employeeApi.leaveOptions().then(setOptions).catch(() => undefined);   // balances changed
      if (leave.date === today) void reload();
    } catch (caught) {
      setError(errorText(caught));
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
      setNotice(t("leave.cancelled", { date: dayTitle(leave.date) }));
      void employeeApi.leaveOptions().then(setOptions).catch(() => undefined);
      if (leave.date === today) void reload();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  const upcoming = (leaves ?? []).filter((leave) => leave.date >= today).reverse();
  const past = (leaves ?? []).filter((leave) => leave.date < today);

  return (
    <MobileShell title={t("leave.title")} subtitle={t("leave.subtitle")}>
      <Panel>
        <LeaveForm onSubmit={take} noValidate>
          <strong>{t("leave.take")}</strong>
          <p>{t("leave.intro")}</p>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}
          {types.length > 0 && (
            <TextField select label={t("leave.kind")} value={typeId} onChange={(e) => setTypeId(e.target.value)}
              helperText={chosen ? (chosen.paid ? t("leave.paid") : t("leave.unpaidHelp")) : t("leave.choose")}>
              {types.map((type) => (
                <MenuItem key={type.id} value={type.id} disabled={type.remaining === 0}>
                  {type.name} · {type.remaining === null ? t("leave.noLimit") : type.remaining === 0 ? t("leave.noneLeft", { year: options?.year ?? "" }) : t("leave.left", { remaining: type.remaining, allowed: type.allowed ?? "" })}
                  {!type.paid && ` ${t("leave.unpaidTag")}`}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            type="date"
            label={t("leave.day")}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
          />
          <TextField
            label={t("leave.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("leave.reasonPlaceholder")}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          {holidayOn && <Alert severity="info">{t("leave.holidayNote", { name: holidayOn.name })}</Alert>}
          <Button type="submit" variant="contained" disabled={busy || !date || date < today || !!holidayOn || (types.length > 0 && !chosen)}>
            {busy ? t("leave.saving") : t("leave.take")}
          </Button>
        </LeaveForm>
      </Panel>

      {types.some((type) => type.allowed !== null) && (
        <>
          <SectionTitle>{t("leave.yours", { year: options?.year ?? "" })}</SectionTitle>
          <Panel>
            {types.filter((type) => type.allowed !== null).map((type) => (
              <p key={type.id} className="balance"><strong>{type.name}</strong> · {t("leave.used", { used: type.used, remaining: type.remaining ?? 0, allowed: type.allowed ?? 0 })}</p>
            ))}
          </Panel>
        </>
      )}

      <SectionTitle>{t("leave.upcoming")}</SectionTitle>
      {leaves && upcoming.length === 0 && <Empty>{t("leave.nonePlanned")}</Empty>}
      <DayList>
        {upcoming.map((leave) => (
          <LeaveRow key={leave.id} leave={leave} today={today} onCancel={() => void cancel(leave)} />
        ))}
      </DayList>

      {!!options?.holidays.length && (
        <>
          <SectionTitle>{t("leave.holidays")}</SectionTitle>
          <DayList>
            {options.holidays.slice(0, 8).map((h) => {
              const d = new Date(`${h.date}T00:00:00Z`);
              return (
                <DayRow key={h.id}>
                  <div className="date">
                    <strong>{d.getUTCDate()}</strong>
                    <small>{shortMonth(h.date)}</small>
                  </div>
                  <div className="info">
                    <strong>{h.name}</strong>
                    <small>{weekdayName(h.date)}</small>
                  </div>
                  <span className="chip">{t("leave.holiday")}</span>
                </DayRow>
              );
            })}
          </DayList>
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>{t("leave.earlier")}</SectionTitle>
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
  const t = useT();
  const date = new Date(`${leave.date}T00:00:00Z`);
  return (
    <DayRow>
      <div className="date">
        <strong>{date.getUTCDate()}</strong>
        <small>{shortMonth(leave.date)}</small>
      </div>
      <div className="info">
        <strong>
          {weekdayName(leave.date)}
          {leave.date === today && ` · ${t("leave.today")}`}
        </strong>
        <small>{[leave.typeName, leave.reason].filter(Boolean).join(" · ") || t("leave.word")}</small>
      </div>
      {onCancel && leave.cancellable ? (
        <Button size="small" color="error" onClick={onCancel}>
          {t("leave.cancel")}
        </Button>
      ) : (
        <span className="chip accent">{t("leave.onLeave")}</span>
      )}
    </DayRow>
  );
}
