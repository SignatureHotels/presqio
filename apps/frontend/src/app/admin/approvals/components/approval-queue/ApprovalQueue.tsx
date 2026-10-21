import type { Approval } from "@presqio/lib";
import { useAdmin } from "@/hooks/use-admin";
import {
  DataTable,
  TableCard,
  TableHeading,
  type DataTableColumn,
} from "@/components/data-table";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { SectionHeader } from "@/components/section-header";
import { RequestDecision } from "./components/request-decision";
import { dateTimeIn, zoneLabel } from "@/utils/dates";
export function ApprovalQueue({
  approvals,
  filter,
  onReview,
}: {
  approvals: Approval[];
  filter: string;
  onReview: (approval: Approval) => void;
}) {
  const { employees, scopedApprovals, timezone } = useAdmin();
  const personFor = (approval: Approval) =>
    employees.find((employee) => employee.id === approval.employeeId) ?? {
      name: "Former employee",
      code: "—",
    };
  const columns: DataTableColumn<Approval>[] = [
    {
      key: "employeeId",
      label: "Employee",
      render: (approval) => (
        <EmployeeAvatar employee={personFor(approval)} />
      ),
    },
    { key: "type", label: "Request", render: (approval) => approval.type },
    {
      key: "submitted",
      label: `Submitted (${zoneLabel(timezone)})`,
      render: (approval) => dateTimeIn(approval.submitted, timezone),
    },
    {
      key: "reason",
      label: "Reason",
      className: "wrap-cell",
      render: (approval) => approval.decisionReason ?? approval.reason,
    },
    {
      key: "status",
      label: "Decision",
      render: (approval) => (
        <RequestDecision
          approval={approval}
          name={personFor(approval).name}
          onReview={onReview}
        />
      ),
    },
  ];
  return (
    <TableCard className="card">
      <TableHeading>
        <SectionHeader
          title="Verification & correction queue"
          subtitle="Review requests with a reason for every decision"
        />
        <span className="chip warning">
          {
            scopedApprovals.filter((approval) => approval.status === "Pending")
              .length
          }{" "}
          pending
        </span>
      </TableHeading>
      <DataTable
        rows={approvals}
        columns={columns}
        emptyMessage={`No ${filter === "all" ? "" : `${filter.toLowerCase()} `}requests yet. Employees send correction requests from the check-in app.`}
      />
    </TableCard>
  );
}
