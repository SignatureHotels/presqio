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
  return {
    total,
    present,
    late,
    leave,
    waiting: total - present - leave,
    rate: total ? Math.round((present / total) * 100) : 0,
  };
}
