import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Switch, TextField } from "@mui/material";
import type { HolidayRecord, LeaveBalancesResponse, LeaveTypeRecord } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { timeOffApi } from "@/api/time-off";
import { Icon, SectionHeader } from "@/components";
import { useAdmin } from "@/hooks/use-admin";
import { TimeOffRoot } from "./TimeOffPage.style";

/** A starting set an admin can add in one click (and change afterwards). */
const COMMON_TYPES = [
  { name: "Casual leave", paid: true, daysPerYear: 12 },
  { name: "Sick leave", paid: true, daysPerYear: 12 },
  { name: "Unpaid leave", paid: false, daysPerYear: null },
];
/** India's fixed-date national holidays; festival dates change every year, so they're added by hand. */
const NATIONAL = [
  { md: "01-26", name: "Republic Day" },
  { md: "08-15", name: "Independence Day" },
  { md: "10-02", name: "Gandhi Jayanti" },
];

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const allowance = (t: { daysPerYear: number | null }) => (t.daysPerYear === null ? "No limit" : `${t.daysPerYear} days a year`);

export function TimeOffPage() {
  const { organization, businessId, today } = useAdmin();
  const organizationId = organization?.id ?? "";
  const thisYear = Number((today ?? new Date().toISOString()).slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [types, setTypes] = useState<LeaveTypeRecord[] | null>(null);
  const [holidays, setHolidays] = useState<HolidayRecord[] | null>(null);
  const [balances, setBalances] = useState<LeaveBalancesResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId || !businessId) return;
    setError("");
    try {
      const [t, h, b] = await Promise.all([
        timeOffApi.leaveTypes(organizationId, businessId),
        timeOffApi.holidays(organizationId, businessId, year),
        timeOffApi.balances(organizationId, businessId, year),
      ]);
      setTypes(t); setHolidays(h); setBalances(b);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [organizationId, businessId, year]);
  useEffect(() => { void load(); }, [load]);

  /** Runs a change, then reloads (balances depend on types and holidays). */
  async function act(run: () => Promise<unknown>, done: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await run();
      setNotice(done);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const active = (types ?? []).filter((t) => !t.archived);
  const archived = (types ?? []).filter((t) => t.archived);
  const missingNational = NATIONAL.filter((n) => !(holidays ?? []).some((h) => h.date === `${year}-${n.md}`));

  return (
    <TimeOffRoot>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

      <div className="page-grid">
        <section className="card card-pad">
          <SectionHeader title="Leave types" subtitle="What employees choose when they take leave. Paid leave isn't loss of pay; unpaid leave is suggested as loss of pay in payroll." />
          {types && types.length === 0 && (
            <div className="starter">
              <p className="muted sm">No leave types yet, so leave has no type and every leave day needs your decision in payroll.</p>
              <Button variant="outlined" disabled={busy}
                onClick={() => void act(() => Promise.all(COMMON_TYPES.map((t) => timeOffApi.createLeaveType(organizationId, businessId, t))),
                  "Added Casual leave, Sick leave and Unpaid leave. Change them any time.")}>
                Add common types: Casual (12, paid), Sick (12, paid), Unpaid
              </Button>
            </div>
          )}
          <div className="policy-list">
            {active.map((t) => (
              <LeaveTypeRow key={t.id} type={t} busy={busy}
                onSave={(patch) => act(() => timeOffApi.updateLeaveType(organizationId, businessId, t.id, patch), `${patch.name ?? t.name} saved.`)}
                onArchive={() => act(() => timeOffApi.updateLeaveType(organizationId, businessId, t.id, { archived: true }),
                  `${t.name} archived. Leave already taken keeps it; employees can't choose it any more.`)} />
            ))}
          </div>
          <NewLeaveType busy={busy}
            onAdd={(t) => act(() => timeOffApi.createLeaveType(organizationId, businessId, t), `${t.name} added.`)} />
          {archived.length > 0 && (
            <details className="archived">
              <summary>Archived ({archived.length})</summary>
              {archived.map((t) => (
                <div className="policy" key={t.id}>
                  <div><b>{t.name}</b><p>{t.paid ? "Paid" : "Unpaid"} · {allowance(t)}</p></div>
                  <button className="btn" disabled={busy}
                    onClick={() => void act(() => timeOffApi.updateLeaveType(organizationId, businessId, t.id, { archived: false }), `${t.name} restored.`)}>
                    Restore
                  </button>
                </div>
              ))}
            </details>
          )}
        </section>

        <section className="card card-pad">
          <SectionHeader title="Holidays" subtitle="Days the whole business is off. Nobody needs leave on a holiday, and payroll pays it." />
          <div className="row">
            <TextField select size="small" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 120 }}>
              {[thisYear - 1, thisYear, thisYear + 1].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            {missingNational.length > 0 && (
              <Button size="small" disabled={busy}
                onClick={() => void act(() => Promise.all(missingNational.map((n) =>
                  timeOffApi.addHoliday(organizationId, businessId, { date: `${year}-${n.md}`, name: n.name }))),
                  `Added ${missingNational.map((n) => n.name).join(", ")} for ${year}.`)}>
                <Icon name="plus" /> Add national holidays ({missingNational.map((n) => n.name).join(", ")})
              </Button>
            )}
          </div>
          <div className="policy-list">
            {holidays && holidays.length === 0 && <p className="muted sm">No holidays for {year} yet.</p>}
            {(holidays ?? []).map((h) => (
              <div className="policy" key={h.id}>
                <div><b>{h.name}</b><p>{weekday(h.date)} {longDate(h.date)} {year}</p></div>
                {h.date < (today ?? "") ? <span className="chip">Past</span> : <span className="chip accent">Upcoming</span>}
                <button className="btn" aria-label={`Remove ${h.name}`} disabled={busy}
                  onClick={() => void act(() => timeOffApi.removeHoliday(organizationId, businessId, h.id), `${h.name} removed.`)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <NewHoliday year={year} busy={busy}
            onAdd={(h) => act(() => timeOffApi.addHoliday(organizationId, businessId, h), `${h.name} added.`)} />
        </section>
      </div>

      <section className="card card-pad">
        <SectionHeader title={`Leave balances · ${year}`} subtitle="Days taken this calendar year against each type's allowance. Cancelled leave doesn't count." />
        {!balances ? <p className="muted sm">Loading…</p> : balances.employees.length === 0 ? <p className="muted sm">No employees yet.</p> : (
          <div className="table-wrap">
            <table className="balances">
              <thead>
                <tr>
                  <th>Employee</th>
                  {balances.types.filter((t) => !t.archived).map((t) => <th key={t.id}>{t.name}<small>{allowance(t)}</small></th>)}
                  {balances.employees.some((e) => e.untyped) && <th>No type<small>before leave types</small></th>}
                </tr>
              </thead>
              <tbody>
                {balances.employees.map((e) => (
                  <tr key={e.employeeId}>
                    <td><b>{e.name}</b><small>{e.code}</small></td>
                    {balances.types.filter((t) => !t.archived).map((t) => {
                      const b = e.balances.find((x) => x.typeId === t.id)!;
                      const full = b.allowed !== null && b.used >= b.allowed;
                      return <td key={t.id} className={full ? "full" : ""}>{b.used}{b.allowed !== null && <span className="muted"> / {b.allowed}</span>}</td>;
                    })}
                    {balances.employees.some((x) => x.untyped) && <td>{e.untyped || ""}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TimeOffRoot>
  );
}

function LeaveTypeRow({ type, busy, onSave, onArchive }: {
  type: LeaveTypeRecord; busy: boolean;
  onSave: (patch: { name: string; paid: boolean; daysPerYear: number | null }) => Promise<void>; onArchive: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return <LeaveTypeForm initial={type} busy={busy} submit="Save" onCancel={() => setEditing(false)}
      onSubmit={async (t) => { await onSave(t); setEditing(false); }} />;
  return (
    <div className="policy">
      <div><b>{type.name}</b><p>{allowance(type)} per employee</p></div>
      <span className={`chip ${type.paid ? "accent" : ""}`}>{type.paid ? "Paid" : "Unpaid"}</span>
      <span className="actions">
        <button className="btn" disabled={busy} onClick={() => setEditing(true)}>Edit</button>
        <button className="btn" disabled={busy} onClick={() => void onArchive()}>Archive</button>
      </span>
    </div>
  );
}

function NewLeaveType({ busy, onAdd }: { busy: boolean; onAdd: (t: { name: string; paid: boolean; daysPerYear: number | null }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return <button className="btn primary section-action" onClick={() => setOpen(true)}><Icon name="plus" /> New leave type</button>;
  return <LeaveTypeForm busy={busy} submit="Add leave type" onCancel={() => setOpen(false)}
    onSubmit={async (t) => { await onAdd(t); setOpen(false); }} />;
}

function LeaveTypeForm({ initial, busy, submit, onSubmit, onCancel }: {
  initial?: LeaveTypeRecord; busy: boolean; submit: string;
  onSubmit: (t: { name: string; paid: boolean; daysPerYear: number | null }) => Promise<void>; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [paid, setPaid] = useState(initial?.paid ?? true);
  const [limited, setLimited] = useState(initial ? initial.daysPerYear !== null : true);
  const [days, setDays] = useState(String(initial?.daysPerYear ?? 12));
  const valid = name.trim().length >= 2 && (!limited || /^\d{1,3}$/.test(days) && Number(days) <= 366);
  return (
    <form className="type-form" onSubmit={(e) => { e.preventDefault(); if (valid) void onSubmit({ name: name.trim(), paid, daysPerYear: limited ? Number(days) : null }); }}>
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Earned leave" slotProps={{ htmlInput: { maxLength: 40 } }} autoFocus />
      <FormControlLabel control={<Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} />} label={paid ? "Paid" : "Unpaid"} />
      <FormControlLabel control={<Checkbox checked={limited} onChange={(e) => setLimited(e.target.checked)} />} label="Yearly limit" />
      {limited && <TextField size="small" type="number" label="Days per year" value={days} onChange={(e) => setDays(e.target.value)} sx={{ width: 130 }} slotProps={{ htmlInput: { min: 0, max: 366 } }} />}
      <span className="actions">
        <Button type="submit" variant="contained" disabled={busy || !valid}>{submit}</Button>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
      </span>
    </form>
  );
}

function NewHoliday({ year, busy, onAdd }: { year: number; busy: boolean; onAdd: (h: { date: string; name: string }) => Promise<void> }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && name.trim().length >= 2;
  return (
    <form className="type-form" onSubmit={(e) => { e.preventDefault(); if (valid) void onAdd({ date, name: name.trim() }).then(() => { setDate(""); setName(""); }); }}>
      <TextField size="small" type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: `${year}-01-01`, max: `${year}-12-31` } }} />
      <TextField size="small" label="Holiday" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali" slotProps={{ htmlInput: { maxLength: 60 } }} />
      <Button type="submit" variant="contained" disabled={busy || !valid}><Icon name="plus" /> Add holiday</Button>
    </form>
  );
}
