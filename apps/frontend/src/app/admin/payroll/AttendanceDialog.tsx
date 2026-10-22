import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton } from "@mui/material";
import type { PayrollSnapshot, RegisterDay, RegisterEmployee } from "@presqio/lib";
import { businessApi } from "@/api/endpoints";
import { errorMessage } from "@/api/client";
import { DayDetails, GridPunch } from "@/app/admin/attendance/AttendancePage";
import { hoursLabel } from "@/app/admin/attendance/register-utils";
import { slipDate } from "./payroll-utils";
import { AttendanceSheet } from "./AttendanceDialog.style";

/** One employee's attendance register for the dates a payroll row covers, with the counts payroll uses. */
export function AttendanceDialog({ organizationId, businessId, snapshot, onClose }: {
  organizationId: string; businessId: string; snapshot: PayrollSnapshot; onClose: () => void;
}) {
  const e = snapshot.employee, a = snapshot.attendance;
  // Payroll counts days from joining (or the period start) to the period end.
  const from = e.joinedOn > snapshot.periodStart ? e.joinedOn : snapshot.periodStart;
  const to = snapshot.profile.lastWorkingDate && snapshot.profile.lastWorkingDate < snapshot.periodEnd ? snapshot.profile.lastWorkingDate : snapshot.periodEnd;
  const [register, setRegister] = useState<{ employee: RegisterEmployee; timezone: string } | null>(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState<RegisterDay | null>(null);
  useEffect(() => {
    let current = true;
    businessApi.attendanceRegister(organizationId, businessId, { from, to, search: e.code, page: 1 })
      .then((data) => {
        if (!current) return;
        const employee = data.employees.find((row) => row.id === e.id);
        if (employee) setRegister({ employee, timezone: data.timezone });
        else setError("No attendance found for this employee in these dates.");
      })
      .catch((caught) => current && setError(errorMessage(caught)));
    return () => { current = false; };
  }, [organizationId, businessId, e.id, e.code, from, to]);

  const counts = [
    [a.presentDays, "Attended", "Days with a check-in"],
    [a.missingDates.length, "Missing", "Working days with no check-in or leave"],
    [a.leaveDates.length, "Leave", "Days marked as leave"],
    [a.openSessions, "Open", "Checked in, never checked out"],
    [a.pendingCorrections, "Corrections", "Requests awaiting approval"],
  ] as const;
  return <>
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{e.name} · attendance {slipDate(from, true)} to {slipDate(to, true)}</DialogTitle>
      <DialogContent>
        <AttendanceSheet>
          <div className="attendance-counts">
            {counts.map(([value, label, hint]) => <div key={label}><strong>{value}</strong><span>{label}</span><small>{hint}</small></div>)}
          </div>
          {error && <Alert severity="warning">{error}</Alert>}
          {!register && !error && <Skeleton variant="rounded" height={220} />}
          {register && <div className="scroll"><table>
            <thead><tr><th>Date</th><th>Status</th><th>Check-in</th><th>Check-out</th><th>Worked</th><th /></tr></thead>
            <tbody>{register.employee.days.map((d) => {
              const first = d.sessions[0], last = d.sessions.at(-1);
              return <tr key={d.date}>
                <td>{slipDate(d.date, true)}</td>
                <td><span className="register-status" data-status={d.status}>{d.status}</span>{d.sessions.length > 1 && <small> · {d.sessions.length} sessions</small>}</td>
                <td>{first ? <GridPunch instant={first.checkIn} attemptId={first.checkInPhotoAttemptId} date={d.date} timezone={register.timezone} label={`${e.name} · ${d.date} check-in selfie`} /> : "—"}</td>
                <td>{last ? <GridPunch instant={last.checkOut} attemptId={last.checkOutPhotoAttemptId} date={d.date} timezone={register.timezone} label={`${e.name} · ${d.date} check-out selfie`} pending /> : "—"}</td>
                <td>{d.sessions.length ? `${hoursLabel(d.completedMinutes)}${d.sessions.some((s) => !s.checkOut) ? " + open" : ""}` : "—"}</td>
                <td><Button size="small" onClick={() => setDay(d)}>Details</Button></td>
              </tr>;
            })}</tbody>
          </table></div>}
        </AttendanceSheet>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
    {day && register && <DayDetails employee={register.employee} day={day} timezone={register.timezone} onClose={() => setDay(null)} />}
  </>;
}
