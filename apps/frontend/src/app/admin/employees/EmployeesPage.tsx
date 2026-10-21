import { EmployeeFilters } from "./components/employee-filters";
import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { EmployeeTable } from "@/components/employee-table";
import { Icon } from "@/components/icon";
import { AttendanceSummary } from "@/components/attendance-summary";
import { useAttendanceExport } from "@/hooks/use-attendance-export";
import type { Employee } from "@/types/admin-preview";
import { longDate, zoneLabel } from "@/utils/dates";
export function EmployeesPage({
  onView,
  live = false,
}: {
  onView: (employee: Employee) => void;
  live?: boolean;
}) {
  const { visibleEmployees, scopedEmployees, branches, today, timezone } = useAdmin();
  const [status, setStatus] = useState("all");
  const exportCsv = useAttendanceExport();
  const filtered = visibleEmployees.filter(
    (employee) => status === "all" || employee.status === status,
  );
  return (
    <>
      {live && (
        <>
          <AttendanceSummary employees={scopedEmployees} />
          <div className="inline-note">
            <Icon name="clock" />
            Check-ins appear here as employees use the Presqio check-in app on their phones.
            Nobody is marked absent before their shift ends.
          </div>
        </>
      )}
      <EmployeeFilters
        status={status}
        setStatus={setStatus}
        onExport={() => exportCsv(filtered)}
        hasRows={Boolean(filtered.length)}
      />
      <EmployeeTable
        employees={filtered}
        branches={branches}
        title={live ? "Live attendance" : "Employee directory"}
        subtitle={today ? `${longDate(today)} · ${zoneLabel(timezone)}` : undefined}
        onView={onView}
      />
    </>
  );
}
