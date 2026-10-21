import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Approval,
  BranchRecord,
  CreateBranchRequest,
  CreateEmployeeRequest,
  CreateShiftRequest,
  DecideCorrectionRequest,
  EmployeeRecord,
  OrganizationDetail,
  OverviewResponse,
  ShiftRecord,
  UpdateBranchRequest,
  UpdateEmployeeRequest,
  UpdateOrganizationRequest,
  UpdateShiftRequest,
} from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { businessApi, organizationsApi } from "@/api/endpoints";
import { useAuth } from "@/hooks/use-auth";
import type { Employee } from "@/types/admin-preview";
import { avatarToneFor } from "@/utils/avatar-tone";

export type LoadStatus = "loading" | "ready" | "error";

const withTone = (record: EmployeeRecord): Employee => ({
  ...record,
  color: avatarToneFor(record.id),
});

/**
 * The admin workspace's data: the signed-in organization's branches, shifts, employees,
 * overview and correction requests, loaded from the API. Every action saves through the API,
 * then updates local state from the server's response and refreshes the overview.
 */
export function useAdminState() {
  const auth = useAuth();
  const organizationId = auth.activeOrganization?.id ?? "";
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  /** "all" or a branch id; narrows every page. */
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, notify] = useState("");

  const businessId = organization?.defaultBusiness?.id ?? "";

  const load = useCallback(async () => {
    if (!organizationId) return;
    setStatus("loading");
    setLoadError("");
    try {
      const detail = await organizationsApi.get(organizationId);
      const business = detail.defaultBusiness;
      if (!business) throw new Error("This organization has no branch records yet.");
      const [branchRows, shiftRows, employeeRows, overviewData, correctionRows] =
        await Promise.all([
          businessApi.branches(organizationId, business.id),
          businessApi.shifts(organizationId, business.id),
          businessApi.employees(organizationId, business.id),
          businessApi.overview(organizationId, business.id),
          businessApi.corrections(organizationId, business.id),
        ]);
      setOrganization(detail);
      setBranches(branchRows);
      setShifts(shiftRows);
      setEmployees(employeeRows.map(withTone));
      setOverview(overviewData);
      setApprovals(correctionRows);
      setStatus("ready");
    } catch (caught) {
      setLoadError(errorMessage(caught));
      setStatus("error");
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh attendance and decisions from employees without interrupting an open form.
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const [rows, data, corrections] = await Promise.all([
          businessApi.employees(organizationId, businessId),
          businessApi.overview(organizationId, businessId),
          businessApi.corrections(organizationId, businessId),
        ]);
        if (!cancelled) {
          setEmployees(rows.map(withTone));
          setOverview(data);
          setApprovals(corrections);
        }
      } catch { /* The next refresh can recover from a temporary network failure. */ }
    };
    const timer = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [organizationId, businessId]);

  /** Figures and activity change after any save; refresh them without blocking the UI. */
  const refreshOverview = useCallback(() => {
    if (!businessId) return;
    void businessApi
      .overview(organizationId, businessId)
      .then(setOverview)
      .catch(() => undefined);
  }, [organizationId, businessId]);

  const actions = useMemo(
    () => ({
      async createEmployee(request: CreateEmployeeRequest) {
        const created = withTone(
          await businessApi.createEmployee(organizationId, businessId, request),
        );
        setEmployees((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
        refreshOverview();
        void auth.reload();
        return created;
      },
      async updateEmployee(employeeId: string, request: UpdateEmployeeRequest) {
        const updated = withTone(
          await businessApi.updateEmployee(organizationId, businessId, employeeId, request),
        );
        setEmployees((rows) => rows.map((row) => (row.id === employeeId ? updated : row)));
        refreshOverview();
        return updated;
      },
      async createBranch(request: CreateBranchRequest) {
        const created = await businessApi.createBranch(organizationId, businessId, request);
        setBranches((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
        refreshOverview();
        void auth.reload();
        return created;
      },
      async updateBranch(branchId: string, request: UpdateBranchRequest) {
        const updated = await businessApi.updateBranch(organizationId, businessId, branchId, request);
        setBranches((rows) => rows.map((row) => (row.id === branchId ? updated : row)));
        refreshOverview();
        return updated;
      },
      async createShift(request: CreateShiftRequest) {
        const created = await businessApi.createShift(organizationId, businessId, request);
        setShifts((rows) => [...rows, created]);
        refreshOverview();
        return created;
      },
      async updateShift(shiftId: string, request: UpdateShiftRequest) {
        const updated = await businessApi.updateShift(organizationId, businessId, shiftId, request);
        setShifts((rows) => rows.map((row) => (row.id === shiftId ? updated : row)));
        refreshOverview();
        return updated;
      },
      async decideCorrection(correctionId: string, request: DecideCorrectionRequest) {
        const decided = await businessApi.decideCorrection(
          organizationId,
          businessId,
          correctionId,
          request,
        );
        setApprovals((rows) => rows.map((row) => (row.id === correctionId ? decided : row)));
        void businessApi.employees(organizationId, businessId)
          .then((rows) => setEmployees(rows.map(withTone)))
          .catch(() => undefined);
        refreshOverview();
        return decided;
      },
      async updateOrganization(request: UpdateOrganizationRequest) {
        const updated = await organizationsApi.update(organizationId, request);
        setOrganization(updated);
        refreshOverview();
        void auth.reload();
        return updated;
      },
    }),
    [organizationId, businessId, refreshOverview, auth],
  );

  const scopedEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.accountStatus !== "TERMINATED" &&
          (branchFilter === "all" || employee.branchId === branchFilter),
      ),
    [employees, branchFilter],
  );
  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return scopedEmployees;
    return scopedEmployees.filter((employee) =>
      `${employee.name} ${employee.code} ${employee.role} ${
        branches.find((branch) => branch.id === employee.branchId)?.name ?? ""
      }`
        .toLowerCase()
        .includes(query),
    );
  }, [scopedEmployees, search, branches]);
  const scopedBranches = useMemo(
    () => branches.filter((branch) => branchFilter === "all" || branch.id === branchFilter),
    [branches, branchFilter],
  );
  const scopedApprovals = useMemo(
    () =>
      branchFilter === "all"
        ? approvals
        : approvals.filter((approval) =>
            scopedEmployees.some((employee) => employee.id === approval.employeeId),
          ),
    [approvals, scopedEmployees, branchFilter],
  );

  return {
    status,
    loadError,
    reload: load,
    organization,
    businessId,
    timezone: overview?.timezone ?? organization?.defaultTimezone ?? "Asia/Kolkata",
    today: overview?.date ?? null,
    branches,
    shifts,
    employees,
    approvals,
    overview,
    branchFilter,
    setBranchFilter,
    search,
    setSearch,
    scopedEmployees,
    visibleEmployees,
    scopedBranches,
    scopedApprovals,
    notice,
    notify,
    actions,
  };
}
