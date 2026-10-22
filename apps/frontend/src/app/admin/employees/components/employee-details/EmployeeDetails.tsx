import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
} from "@mui/material";
import type { EmployeePayrollDetails } from "@presqio/lib";
import { payrollApi } from "@/api/payroll";
import { useAuth } from "@/hooks/use-auth";
import { money, monthLabel, slipDate } from "@/app/admin/payroll/payroll-utils";
import { payrollVersion } from "@/app/admin/payroll/payroll-cache";
import { errorMessage } from "@/api/client";
import { useAdmin } from "@/hooks/use-admin";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { StatusChip } from "@/components/status-chip";
import { SelfieThumb } from "@/components/selfie-thumb";
import type { Employee } from "@/types/admin-preview";
import { longDate, shortDate } from "@/utils/dates";
import { CodeBox, DetailSection, PhotoBox } from "./EmployeeDetails.style";

const ACCOUNT_LABEL = {
  PENDING: "Not signed in yet",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  TERMINATED: "Removed",
} as const;

export function EmployeeDetails({
  employeeId,
  onClose,
  onEdit,
}: {
  employeeId: string | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}) {
  const { organization, businessId, employees, branches, shifts, actions, notify } = useAdmin();
  const { activeOrganization } = useAuth();
  // Statutory, bank and salary details are restricted to organization owners/admins.
  const canPayroll = activeOrganization?.role === "OWNER" || activeOrganization?.role === "ADMIN";
  const [payroll, setPayroll] = useState<EmployeePayrollDetails | null>(null);
  const [payrollFailed, setPayrollFailed] = useState(false);
  const version = payrollVersion();
  // Read the live record so the dialog reflects saves made while it is open.
  const employee = employees.find((item) => item.id === employeeId) ?? null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function setAccount(accountStatus: "ACTIVE" | "SUSPENDED", message: string) {
    if (!employee) return;
    setBusy(true);
    setError("");
    try {
      await actions.updateEmployee(employee.id, { accountStatus });
      notify(message);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setPayroll(null);
    setPayrollFailed(false);
    if (!employeeId || !canPayroll || !organization) return;
    let current = true;
    payrollApi
      .employee(organization.id, businessId, employeeId)
      .then((details) => current && setPayroll(details))
      .catch(() => current && setPayrollFailed(true));
    return () => {
      current = false;
    };
    // Reload when another employee is opened or payroll details were saved — not on the 30-second list refresh.
  }, [employeeId, canPayroll, organization?.id, businessId, version]);

  const signInUrl = `${window.location.origin}/employee`;
  const instructions = employee
    ? `Presqio check-in\nOpen ${signInUrl} on any phone\nSign in with employee ID: ${employee.code}`
    : "";
  const shift = shifts.find((item) => item.id === employee?.shiftId);
  const canSignIn = employee && ["PENDING", "ACTIVE"].includes(employee.accountStatus);

  return (
    <Dialog open={Boolean(employee)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Employee details</DialogTitle>
      <DialogContent>
        {employee && (
          <>
            {error && <Alert severity="error">{error}</Alert>}
            <EmployeeAvatar employee={employee} />
            {(
              [
                [
                  "Work",
                  [
                    ["Branch", branches.find((branch) => branch.id === employee.branchId)?.name ?? "—"],
                    ["Shift", shift ? `${shift.name} · ${shift.start}–${shift.end}` : "No shift assigned"],
                    ["Designation", employee.role || "—"],
                    ...(canPayroll ? [["Department", payroll?.profile.department || "—"]] : []),
                    ["Date of joining", employee.joinedOn ? longDate(employee.joinedOn) : "—"],
                    ...(canPayroll && payroll?.profile.lastWorkingDate
                      ? [["Last working date", longDate(payroll.profile.lastWorkingDate)]]
                      : []),
                    ["Account", ACCOUNT_LABEL[employee.accountStatus]],
                    ["Mobile app", employee.hasLogin ? "Signed in" : "Not signed in yet"],
                  ],
                ],
                [
                  "Contact and personal",
                  [
                    ["Phone", employee.phone || "Not provided"],
                    ["Email", employee.email || "Not provided"],
                    ...(canPayroll
                      ? [
                          ["Date of birth", payroll?.profile.dateOfBirth ? slipDate(payroll.profile.dateOfBirth) : "—"],
                          ["PAN", payroll?.profile.pan || "—"],
                        ]
                      : []),
                  ],
                ],
                ...(canPayroll && payroll
                  ? [
                      [
                        "Statutory and bank",
                        [
                          ["PF UAN No.", payroll.profile.uan || "—"],
                          ["ESI No.", payroll.profile.esi || "—"],
                          ["Bank name", payroll.profile.bankName || "—"],
                          ["Bank A/c No.", payroll.profile.bankAccount || "—"],
                          ["IFSC code", payroll.profile.bankIfsc || "—"],
                          ["Bank branch", payroll.profile.bankBranch || "—"],
                        ],
                      ] as const,
                    ]
                  : []),
                [
                  "Today",
                  [
                    [
                      "Attendance",
                      employee.checkIn
                        ? `In ${employee.checkIn}${employee.checkOut ? ` · Out ${employee.checkOut}${employee.earlyMinutes ? ` (${employee.earlyMinutes} min early)` : ""}` : " · still checked in"}`
                        : employee.status === "On leave"
                          ? "On leave"
                          : "Not checked in",
                    ],
                    ["Status", <StatusChip key="status" status={employee.status} />],
                    [
                      "Upcoming leave",
                      employee.upcomingLeave.length
                        ? employee.upcomingLeave.map((date) => shortDate(date)).join(", ")
                        : "None",
                    ],
                  ],
                ],
              ] as [string, (readonly [string, React.ReactNode])[]][]
            ).map(([title, rows]) => (
              <DetailSection key={title}>
                <h3>{title}</h3>
                <dl>
                  {rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </DetailSection>
            ))}
            {canPayroll && !payroll && !payrollFailed && <Skeleton variant="rounded" height={90} sx={{ mt: 2 }} />}
            {canPayroll && payrollFailed && (
              <Alert severity="warning" sx={{ mt: 2 }}>Payroll details couldn't be loaded.</Alert>
            )}
            {canPayroll && payroll && <SalarySection details={payroll} />}
            {(employee.checkInPhotoAttemptId || employee.checkOutPhotoAttemptId) && (
              <PhotoBox>
                <SelfieThumb
                  attemptId={employee.checkInPhotoAttemptId}
                  label={`${employee.name} · check-in ${employee.checkIn ?? ""}`}
                  size={96}
                />
                <SelfieThumb
                  attemptId={employee.checkOutPhotoAttemptId}
                  label={`${employee.name} · check-out ${employee.checkOut ?? ""}`}
                  size={96}
                />
                <figcaption>
                  Today's check-in{employee.checkOutPhotoAttemptId ? " and check-out" : ""} selfie.
                  Location was verified by the server. Selfies are kept for 60 days.
                </figcaption>
              </PhotoBox>
            )}
            {canSignIn && !employee.hasLogin && (
              <CodeBox>
                <small>Share with {employee.name.split(" ")[0]} to start checking in</small>
                <span className="code">{employee.code}</span>
                <dl>
                  <dt>Open</dt>
                  <dd>{signInUrl}</dd>
                  <dt>Sign in with</dt>
                  <dd>Employee ID {employee.code}</dd>
                </dl>
                <Button
                  size="small"
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(instructions)
                      .then(() => notify("Instructions copied. Share them with the employee."))
                      .catch(() => undefined)
                  }
                >
                  Copy instructions
                </Button>
              </CodeBox>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {employee?.accountStatus === "SUSPENDED" ? (
          <Button
            disabled={busy}
            sx={{ mr: "auto" }}
            onClick={() => void setAccount("ACTIVE", `${employee.name} reactivated.`)}
          >
            Reactivate
          </Button>
        ) : (
          employee?.accountStatus !== "TERMINATED" && (
            <Button
              color="error"
              disabled={busy}
              sx={{ mr: "auto" }}
              onClick={() =>
                employee &&
                void setAccount("SUSPENDED", `${employee.name} suspended; they can't check in.`)
              }
            >
              Suspend
            </Button>
          )
        )}
        <Button onClick={onClose}>Close</Button>
        {employee && (
          <Button variant="contained" onClick={() => onEdit(employee)}>
            Edit
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/** The current salary version: monthly earnings, deductions and the resulting net. */
function SalarySection({ details }: { details: EmployeePayrollDetails }) {
  const salary = details.compensations[0];
  if (!salary)
    return (
      <DetailSection>
        <h3>Monthly salary</h3>
        <p className="muted">No salary set up yet. Use Edit to add it.</p>
      </DetailSection>
    );
  const earnings = salary.earnings.filter((line) => line.amount > 0);
  const deductions = salary.deductions.filter((line) => line.amount > 0);
  const gross = salary.earnings.reduce((sum, line) => sum + line.amount, 0);
  const deducted = salary.deductions.reduce((sum, line) => sum + line.amount, 0);
  const lines = (rows: typeof earnings) =>
    rows.length ? (
      <span className="salary-lines">
        {rows.map((line) => (
          <span key={line.label}>
            {line.label}
            <span>{money(line.amount)}</span>
          </span>
        ))}
      </span>
    ) : (
      "None"
    );
  return (
    <DetailSection>
      <h3>Monthly salary · from {monthLabel(salary.effectiveMonth)}</h3>
      <dl>
        <div><dt>Gross earnings</dt><dd>{money(gross)}</dd></div>
        <div><dt>Deductions</dt><dd>{money(deducted)}</dd></div>
        <div><dt>Net monthly pay</dt><dd>{money(gross - deducted)}</dd></div>
        <div><dt>Earnings</dt><dd>{lines(earnings)}</dd></div>
        <div><dt>Deductions breakdown</dt><dd>{lines(deductions)}</dd></div>
      </dl>
    </DetailSection>
  );
}
