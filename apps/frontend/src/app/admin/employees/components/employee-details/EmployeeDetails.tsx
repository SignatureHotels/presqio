import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { errorMessage } from "@/api/client";
import { useAdmin } from "@/hooks/use-admin";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { StatusChip } from "@/components/status-chip";
import { SelfieThumb } from "@/components/selfie-thumb";
import type { Employee } from "@/types/admin-preview";
import { longDate, shortDate } from "@/utils/dates";
import { CodeBox, DetailList, PhotoBox } from "./EmployeeDetails.style";

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
  const { employees, branches, shifts, actions, notify } = useAdmin();
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

  const signInUrl = `${window.location.origin}/employee`;
  const instructions = employee
    ? `Presqio check-in\nOpen ${signInUrl} on any phone\nSign in with employee ID: ${employee.code}`
    : "";
  const shift = shifts.find((item) => item.id === employee?.shiftId);
  const canSignIn = employee && ["PENDING", "ACTIVE"].includes(employee.accountStatus);

  return (
    <Dialog open={Boolean(employee)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Employee details</DialogTitle>
      <DialogContent>
        {employee && (
          <>
            {error && <Alert severity="error">{error}</Alert>}
            <EmployeeAvatar employee={employee} />
            <DetailList>
              {[
                ["Branch", branches.find((branch) => branch.id === employee.branchId)?.name ?? "—"],
                ["Shift", shift ? `${shift.name} · ${shift.start}–${shift.end}` : "No shift assigned"],
                ["Job title", employee.role || "—"],
                ["Phone", employee.phone || "Not provided"],
                ["Email", employee.email || "Not provided"],
                ["Joined", employee.joinedOn ? longDate(employee.joinedOn) : "—"],
                ["Account", ACCOUNT_LABEL[employee.accountStatus]],
                ["Mobile app", employee.hasLogin ? "Signed in" : "Not signed in yet"],
                [
                  "Today",
                  employee.checkIn
                    ? `In ${employee.checkIn}${employee.checkOut ? ` · Out ${employee.checkOut}${employee.earlyMinutes ? ` (${employee.earlyMinutes} min early)` : ""}` : " · still checked in"}`
                    : employee.status === "On leave"
                      ? "On leave"
                      : "Not checked in",
                ],
                [
                  "Upcoming leave",
                  employee.upcomingLeave.length
                    ? employee.upcomingLeave.map((date) => shortDate(date)).join(", ")
                    : "None",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </DetailList>
            <StatusChip status={employee.status} />
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
