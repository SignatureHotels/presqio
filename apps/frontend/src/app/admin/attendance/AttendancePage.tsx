import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import type { AttendanceRegisterResponse, RegisterDay, RegisterEmployee } from "@presqio/lib";
import { businessApi } from "@/api/endpoints";
import { errorMessage } from "@/api/client";
import { useAdmin } from "@/hooks/use-admin";
import { SelfieThumb } from "@/components/selfie-thumb";
import type { Employee } from "@/types/admin-preview";
import { Register, SessionCard } from "./AttendancePage.style";
import { hoursLabel, registerCsv, registerTime } from "./register-utils";

function shifted(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
const dateHeading = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" });

export function AttendancePage({ onView }: { onView: (employee: Employee) => void }) {
  const { organization, businessId, today, timezone, branchFilter, search, employees } = useAdmin();
  const currentDate = today ?? new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [from, setFrom] = useState(() => shifted(currentDate, -6));
  const [to, setTo] = useState(currentDate);
  const [range, setRange] = useState({ from, to });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AttendanceRegisterResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<{ employee: RegisterEmployee; day: RegisterDay } | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const organizationId = organization?.id ?? "";
  const lastQuery = useRef("");
  const registerScroll = useRef<HTMLDivElement>(null);
  const positionedRange = useRef<{ key: string; container: HTMLDivElement } | null>(null);

  // Start at today (or the range's last date), without moving an admin browsing older days.
  useLayoutEffect(() => {
    const container = registerScroll.current;
    if (!data || !container) return;
    const key = JSON.stringify([organizationId, businessId, data.from, data.to, currentDate]);
    if (positionedRange.current?.key === key && positionedRange.current.container === container) return;
    const targetDate = data.dates.includes(currentDate) ? currentDate : data.to;
    const header = container.querySelector<HTMLTableCellElement>(`thead th[data-date="${targetDate}"]`);
    const employeeHeader = container.querySelector<HTMLTableCellElement>("thead th:first-child");
    if (!header || !employeeHeader) return;
    // Account for the pinned employee column; scroll only this grid, not the whole page.
    container.scrollLeft += header.getBoundingClientRect().left
      - container.getBoundingClientRect().left - container.clientLeft - employeeHeader.getBoundingClientRect().width;
    positionedRange.current = { key, container };
  }, [data, currentDate, organizationId, businessId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { setPage(1); setSelected(null); }, [branchFilter, debouncedSearch, organizationId, businessId]);

  useEffect(() => {
    if (!organizationId || !businessId) return;
    let cancelled = false;
    let pending = false;
    const queryKey = JSON.stringify([organizationId, businessId, range, page, branchFilter, debouncedSearch]);
    if (lastQuery.current !== queryKey) setData(null);
    lastQuery.current = queryKey;
    setBusy(true);
    setError("");
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const next = await businessApi.attendanceRegister(organizationId, businessId, {
          ...range, page, branchId: branchFilter === "all" ? undefined : branchFilter, search: debouncedSearch,
        });
        if (!cancelled) { setData(next); setError(""); }
      } catch (caught) { if (!cancelled) setError(errorMessage(caught)); }
      finally { pending = false; if (!cancelled) setBusy(false); }
    };
    void load();
    const refresh = () => { if (document.visibilityState !== "hidden") void load(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [organizationId, businessId, range, page, branchFilter, debouncedSearch, revision]);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const count = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
    if (!from || !to || !Number.isFinite(count) || count < 1 || count > 31) {
      setRangeError("Choose a date range of 1–31 days.");
      return;
    }
    setRangeError(""); setPage(1); setSelected(null); setRange({ from, to });
  }
  function exportPage() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([registerCsv(data)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `attendance-${data.from}-${data.to}-page-${data.page}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pages = Math.max(1, Math.ceil((data?.totalEmployees ?? 0) / (data?.pageSize ?? 25)));
  // Keep an open day in sync with the current page's periodic refresh.
  const selectedEmployee = data?.employees.find((e) => e.id === selected?.employee.id);
  const selectedDay = selectedEmployee?.days.find((d) => d.date === selected?.day.date);

  return (
    <Register className="card">
      <form className="register-controls" onSubmit={apply}>
        <TextField required size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField required size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button variant="contained" type="submit">Show attendance</Button>
        <Button onClick={() => setRevision((v) => v + 1)} disabled={busy}>Refresh</Button>
        <Button onClick={exportPage} disabled={!data?.employees.length || busy || Boolean(error)}>Export this page</Button>
      </form>
      {rangeError && <Alert severity="warning">{rangeError}</Alert>}
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRevision((v) => v + 1)}>Retry</Button>}>{error}</Alert>}
      <p className="register-note">
        Employees × dates · up to 31 days · {data?.timezone ?? timezone}. Each date shows in/out times and selfies. Click a selfie to enlarge it or open day details.
        Hours include completed sessions only. Rest days follow assigned shift working days; “No record” means no recorded attendance.
        {data && ` Showing ${dateHeading(data.from)} – ${dateHeading(data.to)}.`}
      </p>
      {busy && <p role="status">{data ? "Refreshing attendance…" : "Loading attendance…"}</p>}
      {data && (
        <>
          <div className="register-frame">
            <div id="attendance-register-title" className="register-title">Attendance register · {data.from} to {data.to}</div>
            <div ref={registerScroll} className="register-scroll" role="region" aria-labelledby="attendance-register-title" tabIndex={0}>
            <table aria-labelledby="attendance-register-title">
              <thead><tr><th scope="col">Employee</th>{data.dates.map((date) => <th scope="col" key={date} data-date={date}>
                <span>{dateHeading(date)}</span>
                <div className="date-punch-headings" aria-hidden="true"><span>In · time & selfie</span><span>Out · time & selfie</span></div>
              </th>)}<th scope="col">Completed hours</th></tr></thead>
              <tbody>
                {data.employees.map((employee) => (
                  <tr key={employee.id}>
                    <th scope="row"><button className="employee-name" onClick={() => {
                      const record = employees.find((e) => e.id === employee.id);
                      if (record) onView(record);
                    }}>{employee.name}</button><small>{employee.code}</small></th>
                    {employee.days.map((day) => (
                      <td key={day.date}>
                        <div className="register-day">
                          <span className="register-status" data-status={day.status}>{day.status}</span>
                          {day.sessions.length ? day.sessions.map((session, index) => (
                            <div className="grid-session" key={session.id}>
                              {day.sessions.length > 1 && <span className="grid-session-label">Session {index + 1}</span>}
                              <div className="grid-punch-pair">
                                <GridPunch instant={session.checkIn} attemptId={session.checkInPhotoAttemptId} date={day.date} timezone={data.timezone}
                                  label={`${employee.name} · ${day.date} · session ${index + 1} check-in selfie`} />
                                <GridPunch instant={session.checkOut} attemptId={session.checkOutPhotoAttemptId} date={day.date} timezone={data.timezone}
                                  label={`${employee.name} · ${day.date} · session ${index + 1} check-out selfie`} pending />
                              </div>
                              {session.corrected && <small>Corrected · original selfies</small>}
                            </div>
                          )) : <div className="grid-punch-pair empty-punches"><span>—<small>No check-in</small></span><span>—<small>No check-out</small></span></div>}
                          {day.sessions.length > 0 && <small>{hoursLabel(day.completedMinutes)} worked{day.sessions.some((s) => !s.checkOut) ? " + open session" : ""}</small>}
                          <button className="day-button" onClick={() => setSelected({ employee, day })} aria-label={`${employee.name}, ${day.date}, ${day.status}. View day details`}>Day details →</button>
                        </div>
                      </td>
                    ))}
                    <td><strong>{hoursLabel(employee.days.reduce((sum, day) => sum + day.completedMinutes, 0))}</strong></td>
                  </tr>
                ))}
                {!data.employees.length && <tr><td colSpan={data.dates.length + 2}>No employees match these filters.</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
          <div className="register-footer"><span className="register-note">{data.totalEmployees} employees · Uses the branch and search filters above · Refreshes every 30 seconds</span>
            <div className="register-pager"><Button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button disabled={page >= pages} onClick={() => setPage((v) => v + 1)}>Next</Button></div>
          </div>
        </>
      )}
      {selected && <DayDetails employee={selectedEmployee ?? selected.employee} day={selectedDay ?? selected.day} timezone={data?.timezone ?? timezone} onClose={() => setSelected(null)} />}
    </Register>
  );
}

/** A recorded punch and its original photo, shown directly in the date cell. */
export function GridPunch({ instant, attemptId, date, timezone, label, pending = false }: {
  instant: string | null; attemptId: string | null; date: string; timezone: string; label: string; pending?: boolean;
}) {
  const localDay = instant ? new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant)) : date;
  const offset = Math.round((Date.parse(`${localDay}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
  return <div className="grid-punch">
    {instant ? <time dateTime={instant} title={new Date(instant).toLocaleString("en-GB", { timeZone: timezone })}>
      {registerTime(instant, timezone)}{offset !== 0 && <span className="day-offset">{offset > 0 ? "+" : ""}{offset}d</span>}
    </time> : <span className="pending-punch">{pending ? "Pending" : "—"}</span>}
    {attemptId ? <SelfieThumb attemptId={attemptId} label={label} size={40} lazy />
      : <span className="selfie-placeholder">{instant ? "No selfie" : "Awaiting out"}</span>}
  </div>;
}

export function DayDetails({ employee, day, timezone, onClose }: { employee: RegisterEmployee; day: RegisterDay; timezone: string; onClose: () => void }) {
  const format = (instant: string) => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant));
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{employee.name} · {day.date}</DialogTitle>
    <DialogContent>
      <p>{employee.code} · {day.status} · {timezone}</p>
      <p><strong>{hoursLabel(day.completedMinutes)}</strong> completed{day.gapMinutes > 0 && ` · ${hoursLabel(day.gapMinutes)} between sessions`}</p>
      {day.leaveReason && <Alert severity="info">Leave: {day.leaveReason}</Alert>}
      {!day.sessions.length && <p>No check-in or check-out sessions recorded for this day.</p>}
      {day.sessions.map((session, index) => <SessionCard key={session.id}>
        <h3>Session {index + 1} · {session.branchName}</h3><p>{session.shiftName}{session.corrected ? " · Approved correction applied" : ""}</p>
        <div className="punches">
          <div className="punch"><span className="punch-label">Check-in</span><time dateTime={session.checkIn}>{format(session.checkIn)}</time>
            <SelfieThumb attemptId={session.checkInPhotoAttemptId} label={`${employee.name} · ${day.date} · session ${index + 1} check-in selfie`} size={84} />
            {!session.checkInPhotoAttemptId && <span className="muted sm">No check-in selfie</span>}
          </div>
          <div className="punch"><span className="punch-label">Check-out</span>{session.checkOut ? <time dateTime={session.checkOut}>{format(session.checkOut)}</time> : <strong>Still checked in</strong>}
            <SelfieThumb attemptId={session.checkOutPhotoAttemptId} label={`${employee.name} · ${day.date} · session ${index + 1} check-out selfie`} size={84} />
            {!session.checkOutPhotoAttemptId && <span className="muted sm">{session.checkOut ? "No check-out selfie (may be corrected)" : "Awaiting check-out"}</span>}
          </div>
        </div>
        <p>{session.minutesWorked === null ? "Ongoing session; excluded from completed hours" : `${hoursLabel(session.minutesWorked)} worked`}{session.earlyMinutes ? ` · Left ${session.earlyMinutes} min early` : ""}</p>
        {session.corrected && <p>Times include the approved correction. Selfies are from the original recorded punches.</p>}
      </SessionCard>)}
      {day.gapMinutes > 0 && <p className="muted sm">Time between sessions is shown for reference. Approved breaks are not tracked separately.</p>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}
