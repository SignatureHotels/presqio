import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import type { EmployeePayrollInput, PayrollProfile } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { payrollApi } from "@/api/payroll";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import type { Employee } from "@/types/admin-preview";
import {
  defaultLines,
  editable,
  lines,
  LineEditor,
  type EditableLine,
} from "@/app/admin/payroll/PayrollForms";
import { DEFAULT_DEDUCTIONS, DEFAULT_EARNINGS, EMPTY_PROFILE } from "@/app/admin/payroll/payroll-utils";
import { invalidatePayroll } from "@/app/admin/payroll/payroll-cache";

const PHONE = /^\+?[0-9][0-9 ()-]{6,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

type Salary = { effectiveMonth: string; earnings: EditableLine[]; deductions: EditableLine[] };

/** Add a new employee, or edit one when `employee` is given. */
export function EmployeeDialog({
  employee,
  onClose,
}: {
  employee?: Employee;
  onClose: () => void;
}) {
  const { organization, businessId, branches, shifts, branchFilter, today, actions, notify } = useAdmin();
  const { activeOrganization } = useAuth();
  // Salary and statutory details are restricted to organization owners/admins.
  const canPayroll = activeOrganization?.role === "OWNER" || activeOrganization?.role === "ADMIN";
  const editing = Boolean(employee);
  const [draft, setDraft] = useState({
    fullName: employee?.name ?? "",
    code: employee?.code ?? "",
    branchId:
      employee?.branchId ||
      (branchFilter !== "all" ? branchFilter : (branches[0]?.id ?? "")),
    shiftId: employee?.shiftId ?? (shifts.length === 1 ? shifts[0].id : ""),
    jobTitle: employee?.role ?? "",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    joinedOn: employee?.joinedOn ?? today ?? "",
  });
  const [profile, setProfile] = useState<PayrollProfile>(EMPTY_PROFILE);
  const newSalary = (month: string): Salary => ({
    effectiveMonth: month,
    earnings: defaultLines(DEFAULT_EARNINGS),
    deductions: defaultLines(DEFAULT_DEDUCTIONS),
  });
  const [salary, setSalary] = useState<Salary>(newSalary((today ?? "").slice(0, 7)));
  const [loadedSalary, setLoadedSalary] = useState("");
  const [payrollState, setPayrollState] = useState<"loading" | "ready" | "failed">(
    editing && canPayroll ? "loading" : "ready",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [key]: event.target.value });
  const setField = (key: keyof PayrollProfile) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setProfile({ ...profile, [key]: key === "pan" || key === "bankIfsc" ? event.target.value.toUpperCase() : event.target.value });

  useEffect(() => {
    if (!employee || !canPayroll || !organization) return;
    let current = true;
    payrollApi
      .employee(organization.id, businessId, employee.id)
      .then((details) => {
        if (!current) return;
        setProfile(details.profile);
        const latest = details.compensations[0];
        const loaded = latest
          ? { effectiveMonth: latest.effectiveMonth, earnings: editable(latest.earnings), deductions: editable(latest.deductions) }
          : newSalary((today ?? "").slice(0, 7));
        setSalary(loaded);
        setLoadedSalary(latest ? JSON.stringify(loaded) : "");
        setPayrollState("ready");
      })
      .catch(() => current && setPayrollState("failed"));
    return () => {
      current = false;
    };
    // Load once per opened employee.
  }, [employee?.id]);

  /** Payroll fields to send, or undefined when nothing payroll-related should be saved. */
  function payrollInput(): EmployeePayrollInput | undefined {
    if (!canPayroll || payrollState !== "ready") return undefined;
    const p = { ...profile, pan: profile.pan.trim() };
    if (p.pan && !PAN.test(p.pan)) throw new Error("PAN must look like ABCDE1234F.");
    if (p.uan && !/^\d{12}$/.test(p.uan.trim())) throw new Error("PF UAN must be 12 digits.");
    if (p.esi && !/^(\d{10}|\d{17})$/.test(p.esi.trim())) throw new Error("ESI number must be 10 or 17 digits.");
    if (p.bankAccount && !/^\d{6,20}$/.test(p.bankAccount.trim()))
      throw new Error("Bank account number must be 6–20 digits.");
    if (p.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(p.bankIfsc.trim()))
      throw new Error("IFSC must look like HDFC0001234 (11 characters).");
    const earnings = lines(salary.earnings);
    const deductions = lines(salary.deductions);
    const hasSalary = earnings.some((l) => l.amount > 0);
    const changed = JSON.stringify(salary) !== loadedSalary;
    if (hasSalary && !/^\d{4}-\d{2}$/.test(salary.effectiveMonth))
      throw new Error("Choose the month this salary applies from.");
    if (loadedSalary && changed && !hasSalary) throw new Error("Add at least one positive earning.");
    return {
      profile: p,
      salary: hasSalary && changed ? { effectiveMonth: salary.effectiveMonth, earnings, deductions } : undefined,
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const code = draft.code.trim().toUpperCase();
    if (draft.fullName.trim().length < 2) return setError("Enter the employee's full name.");
    if (!editing && code && !CODE.test(code))
      return setError("Employee ID can use 2–20 letters, numbers or dashes.");
    if (!draft.branchId) return setError("Choose the branch this employee works at.");
    if (draft.phone.trim() && !PHONE.test(draft.phone.trim()))
      return setError("Enter a valid phone number or leave it empty.");
    if (draft.email.trim() && !EMAIL.test(draft.email.trim()))
      return setError("Enter a valid email or leave it empty.");
    let payroll: EmployeePayrollInput | undefined;
    try {
      payroll = payrollInput();
    } catch (caught) {
      return setError(caught instanceof Error ? caught.message : "Check the payroll fields.");
    }
    setBusy(true);
    setError("");
    try {
      if (employee) {
        await actions.updateEmployee(employee.id, {
          fullName: draft.fullName.trim(),
          branchId: draft.branchId,
          shiftId: draft.shiftId || null,
          jobTitle: draft.jobTitle.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
          joinedOn: draft.joinedOn && draft.joinedOn !== employee.joinedOn ? draft.joinedOn : undefined,
          payroll,
        });
        notify(`${draft.fullName.trim()} updated.`);
      } else {
        const created = await actions.createEmployee({
          fullName: draft.fullName.trim(),
          code: code || undefined,
          branchId: draft.branchId,
          shiftId: draft.shiftId || undefined,
          jobTitle: draft.jobTitle.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          email: draft.email.trim() || undefined,
          joinedOn: draft.joinedOn || undefined,
          payroll,
        });
        notify(`${created.name} added as ${created.code}.`);
      }
      // Salary and payslip details feed payroll; reload it on the next visit.
      if (payroll) invalidatePayroll();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  const date = { inputLabel: { shrink: true } };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={save} noValidate>
        <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
        <DialogContent className="dialog-fields">
          {!editing && (
            <p className="muted">
              They start as Pending. Share their employee ID; they sign in on their phone with
              just that ID and can check in inside their branch perimeter.
            </p>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <Typography fontWeight={700}>Personal details</Typography>
          <div className="form-columns">
            <TextField
              autoFocus
              required
              label="Full name"
              value={draft.fullName}
              onChange={set("fullName")}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label={editing ? "Employee ID" : "Employee ID (optional)"}
              placeholder={editing ? undefined : "Generated automatically, e.g. SGH0001"}
              value={draft.code}
              onChange={set("code")}
              helperText={editing ? "Employee IDs can't be changed." : undefined}
              // Read-only rather than disabled, so the existing ID stays clearly legible.
              slotProps={{ htmlInput: { maxLength: 20, readOnly: editing } }}
            />
          </div>
          <div className="form-columns">
            <TextField type="tel" label="Phone (optional)" value={draft.phone} onChange={set("phone")} />
            <TextField type="email" label="Email (optional)" value={draft.email} onChange={set("email")} />
          </div>
          {canPayroll && (
            <div className="form-columns">
              <TextField type="date" label="Date of birth" value={profile.dateOfBirth} onChange={setField("dateOfBirth")} slotProps={date} disabled={payrollState !== "ready"} />
              <TextField label="PAN" placeholder="ABCDE1234F" value={profile.pan} onChange={setField("pan")} slotProps={{ htmlInput: { maxLength: 10 } }} disabled={payrollState !== "ready"} />
            </div>
          )}

          <Typography fontWeight={700}>Job details</Typography>
          <div className="form-columns">
            <TextField
              label="Designation (optional)"
              value={draft.jobTitle}
              onChange={set("jobTitle")}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            {canPayroll ? (
              <TextField label="Department" value={profile.department} onChange={setField("department")} slotProps={{ htmlInput: { maxLength: 80 } }} disabled={payrollState !== "ready"} />
            ) : (
              <span />
            )}
          </div>
          <div className="form-columns">
            <TextField required select label="Branch" value={draft.branchId} onChange={set("branchId")}>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Shift" value={draft.shiftId} onChange={set("shiftId")}>
              <MenuItem value="">No shift yet</MenuItem>
              {shifts.map((shift) => (
                <MenuItem key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start}–{shift.end})
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="form-columns">
            <TextField type="date" label="Date of joining" value={draft.joinedOn} onChange={set("joinedOn")} slotProps={date} />
            {canPayroll && editing ? (
              <TextField type="date" label="Last working date (if left)" value={profile.lastWorkingDate} onChange={setField("lastWorkingDate")} slotProps={date} disabled={payrollState !== "ready"} />
            ) : (
              <span />
            )}
          </div>

          {canPayroll && payrollState === "loading" && <Skeleton variant="rounded" height={160} />}
          {canPayroll && payrollState === "failed" && (
            <Alert severity="warning">
              Payroll details couldn't be loaded, so they won't be changed. Other changes can still be saved.
            </Alert>
          )}
          {canPayroll && payrollState === "ready" && (
            <>
              <Typography fontWeight={700}>Statutory and bank details</Typography>
              <div className="form-columns">
                <TextField label="PF UAN No." value={profile.uan} onChange={setField("uan")} slotProps={{ htmlInput: { maxLength: 12, inputMode: "numeric" } }} />
                <TextField label="ESI No." value={profile.esi} onChange={setField("esi")} slotProps={{ htmlInput: { maxLength: 17, inputMode: "numeric" } }} />
              </div>
              <div className="form-columns">
                <TextField label="Bank name" value={profile.bankName} onChange={setField("bankName")} slotProps={{ htmlInput: { maxLength: 100 } }} />
                <TextField label="Bank A/c No." value={profile.bankAccount} onChange={setField("bankAccount")} slotProps={{ htmlInput: { maxLength: 20, inputMode: "numeric" } }} />
              </div>
              <div className="form-columns">
                <TextField label="IFSC code" placeholder="HDFC0001234" value={profile.bankIfsc} onChange={setField("bankIfsc")} slotProps={{ htmlInput: { maxLength: 11 } }} />
                <TextField label="Bank branch" value={profile.bankBranch} onChange={setField("bankBranch")} slotProps={{ htmlInput: { maxLength: 100 } }} />
              </div>

              <Typography fontWeight={700}>Monthly salary</Typography>
              <TextField
                type="month"
                label="Salary effective from"
                value={salary.effectiveMonth}
                onChange={(event) => setSalary({ ...salary, effectiveMonth: event.target.value })}
                slotProps={date}
                helperText="Choose a later month to record a raise; earlier payslips stay unchanged. Leave all earnings at 0 to set salary later."
              />
              <LineEditor title="Earnings" rows={salary.earnings} onChange={(earnings) => setSalary({ ...salary, earnings })} disabled={busy} />
              <LineEditor title="Deductions (optional)" required={false} rows={salary.deductions} onChange={(deductions) => setSalary({ ...salary, deductions })} disabled={busy} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={busy || payrollState === "loading"}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add employee"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
