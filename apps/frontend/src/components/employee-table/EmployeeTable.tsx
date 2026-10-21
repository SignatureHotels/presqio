import { Link } from "react-router-dom";
import type { Branch } from "@presqio/lib";
import { isPresent } from "@/utils/attendance";
import type { Employee } from "@/types/admin-preview";
import { Icon } from "@/components/icon";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { StatusChip } from "@/components/status-chip";
import { SectionHeader } from "@/components/section-header";
import {
  DataTable,
  TableCard,
  TableFooter,
  TableHeading,
  type DataTableColumn,
} from "@/components/data-table";
import { VerificationStatus } from "./components/verification-status";
export function EmployeeTable({
  employees,
  branches,
  title = "Today's attendance",
  subtitle,
  onView,
  viewAll,
}: {
  employees: Employee[];
  branches: Branch[];
  title?: string;
  subtitle?: string;
  onView: (employee: Employee) => void;
  viewAll?: boolean;
}) {
  const columns: DataTableColumn<Employee>[] = [
    {
      key: "name",
      label: "Employee",
      render: (employee) => <EmployeeAvatar employee={employee} />,
    },
    {
      key: "branchId",
      label: "Branch",
      render: (employee) =>
        branches.find((branch) => branch.id === employee.branchId)?.name ??
        "Unassigned",
    },
    {
      key: "checkIn",
      label: "Check in",
      className: "mono",
      render: (employee) =>
        employee.checkIn ?? "—",
    },
    {
      key: "status",
      label: "Status",
      render: (employee) => <StatusChip status={employee.status} />,
    },
    {
      key: "checkOut",
      label: "Check out",
      className: "mono",
      render: (employee) =>
        employee.checkOut ? (
          <>
            {employee.checkOut}
            {employee.earlyMinutes ? (
              <span className="chip warning" style={{ marginLeft: 8 }}>
                {employee.earlyMinutes} min early
              </span>
            ) : null}
          </>
        ) : (
          "—"
        ),
    },
    {
      key: "selfie",
      label: "Selfie",
      render: (employee) => (
        <VerificationStatus verified={Boolean(employee.latestPhotoAttemptId)} label="Captured" />
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (employee) => (
        <VerificationStatus verified={isPresent(employee)} location />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (employee) => (
        <button
          className="link"
          aria-label={`View ${employee.name}`}
          onClick={() => onView(employee)}
        >
          View
        </button>
      ),
    },
  ];
  return (
    <TableCard className="card">
      <TableHeading>
        <SectionHeader
          title={title}
          subtitle={subtitle}
        />
        {viewAll && (
          <Link className="link" to="/admin/attendance/live">
            View all <Icon name="arrow" className="tiny" />
          </Link>
        )}
      </TableHeading>
      <DataTable
        rows={employees}
        columns={columns}
        emptyMessage={
          viewAll ? "No employees yet. Use “Add employee” to add your team." : "No employees match your filters."
        }
      />
      <TableFooter>
        {employees.length} {employees.length === 1 ? "employee" : "employees"}
      </TableFooter>
    </TableCard>
  );
}
