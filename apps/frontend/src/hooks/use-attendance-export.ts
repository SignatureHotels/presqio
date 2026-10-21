import { useAdmin } from "@/hooks/use-admin";
import { csvText } from "@/utils/csv";
import type { Employee } from "@/types/admin-preview";
import { zoneLabel } from "@/utils/dates";

/** Downloads today's attendance for the given employees as CSV. */
export function useAttendanceExport() {
  const { branches, shifts, organization, today, timezone, notify } = useAdmin();
  return (employees: Employee[]) => {
    const date = today ?? new Date().toISOString().slice(0, 10);
    const rows = [
      [
        "Employee",
        "Employee ID",
        "Branch",
        "Shift",
        "Job title",
        "Work date",
        `Check-in (${zoneLabel(timezone)})`,
        `Check-out (${zoneLabel(timezone)})`,
        "Attendance status",
        "Check-in selfie saved",
        "Check-out selfie saved",
      ],
      ...employees.map((employee) => [
        employee.name,
        employee.code,
        branches.find((branch) => branch.id === employee.branchId)?.name ?? "",
        shifts.find((shift) => shift.id === employee.shiftId)?.name ?? "",
        employee.role,
        date,
        employee.checkIn ?? "",
        employee.checkOut ?? "",
        employee.status,
        employee.checkInPhotoAttemptId ? "Yes" : "No",
        employee.checkOutPhotoAttemptId ? "Yes" : "No",
      ]),
    ];
    const url = URL.createObjectURL(new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    const slug = (organization?.slug ?? "presqio").slice(0, 40);
    anchor.download = `${slug}-attendance-${date}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${employees.length} attendance ${employees.length === 1 ? "record" : "records"}.`);
  };
}
