import { Link } from "react-router-dom";
import { useAdmin } from "@/hooks/use-admin";
import { Icon, SectionHeader } from "@/components";
import { attendanceSummary } from "@/utils/attendance";
import { useAttendanceExport } from "@/hooks/use-attendance-export";
import { longDate, zoneLabel } from "@/utils/dates";
import { Metric, Metrics } from "./AttendanceRegister.style";
export function AttendanceRegister() {
  const { scopedEmployees, scopedApprovals, today, timezone } = useAdmin();
  const exportCsv = useAttendanceExport();
  const summary = attendanceSummary(scopedEmployees);
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Attendance reporting"
        subtitle={today ? `${longDate(today)} · ${zoneLabel(timezone)}` : undefined}
        action={
          <button
            className="btn primary"
            onClick={() => exportCsv(scopedEmployees)}
            disabled={!scopedEmployees.length}
          >
            <Icon name="file" />
            Download CSV
          </button>
        }
      />
      <Metrics>
        {[
          [`${summary.rate}%`, "Present today"],
          [summary.present, "Recorded check-ins today"],
          [
            scopedApprovals.filter((approval) => approval.status === "Pending")
              .length,
            "Requests awaiting review",
          ],
        ].map(([value, label]) => (
          <Metric key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </Metric>
        ))}
      </Metrics>
      <div className="policy-list">
        <div className="policy">
          <div>
            <b>Daily attendance register</b>
            <p>
              Employee, date, branch, check-in/out times and selfie availability.
            </p>
          </div>
          <button className="btn" onClick={() => exportCsv(scopedEmployees)}>
            Export CSV
          </button>
        </div>
        <div className="policy">
          <div>
            <b>Attendance by date</b>
            <p>
              Compare up to 31 dates, check every session and selfie, and export the selected page.
            </p>
          </div>
          <Link className="btn" to="/admin/attendance/live">Open attendance grid</Link>
        </div>
      </div>
    </section>
  );
}
