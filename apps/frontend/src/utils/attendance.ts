import type { EmployeeTableRow } from "@presqio/lib";
export const isPresent = (employee: EmployeeTableRow) =>
  employee.status === "Present" || employee.status === "Late";
export function attendanceSummary(employees: EmployeeTableRow[]) {
  const total = employees.length;
  const present = employees.filter(isPresent).length;
  const late = employees.filter(
    (employee) => employee.status === "Late",
  ).length;
  const leave = employees.filter(
    (employee) => employee.status === "On leave",
  ).length;
  // rostered off, a weekly off or a holiday: not expected, so not waiting and not in the rate
  const off = employees.filter((employee) => employee.status === "Day off").length;
  return {
    total,
    present,
    late,
    leave,
    off,
    waiting: total - present - leave - off,
    rate: total - off > 0 ? Math.round((present / (total - off)) * 100) : 0,
  };
}
