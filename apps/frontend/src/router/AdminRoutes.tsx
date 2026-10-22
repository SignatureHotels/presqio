import { Suspense, useEffect } from "react";
import { Skeleton } from "@mui/material";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import type { Employee } from "@/types/admin-preview";
import { lazyPage, preloadWhenIdle } from "./lazy-page";

// Each admin page is its own chunk; all are prefetched when idle so moving between pages stays instant.
const OverviewPage = lazyPage(() => import("@/app/admin/overview"), "OverviewPage");
const EmployeesPage = lazyPage(() => import("@/app/admin/employees"), "EmployeesPage");
const AttendancePage = lazyPage(() => import("@/app/admin/attendance"), "AttendancePage");
const BranchesPage = lazyPage(() => import("@/app/admin/branches"), "BranchesPage");
const ShiftsPage = lazyPage(() => import("@/app/admin/shifts"), "ShiftsPage");
const ApprovalsPage = lazyPage(() => import("@/app/admin/approvals"), "ApprovalsPage");
const ReportsPage = lazyPage(() => import("@/app/admin/reports"), "ReportsPage");
const SettingsPage = lazyPage(() => import("@/app/admin/settings"), "SettingsPage");
const PayrollPage = lazyPage(() => import("@/app/admin/payroll/PayrollPage"), "default");
const PAGES = [OverviewPage, EmployeesPage, AttendancePage, BranchesPage, ShiftsPage, ApprovalsPage, ReportsPage, SettingsPage, PayrollPage];
export function AdminRoutes({
  onView,
}: {
  onView: (employee: Employee) => void;
}) {
  useEffect(() => preloadWhenIdle(PAGES), []);
  return (
    <Suspense fallback={<Skeleton variant="rounded" height={260} />}>
    <Routes>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview" element={<OverviewPage onView={onView} />} />
      <Route
        path="employees"
        element={<EmployeesPage key="directory" onView={onView} />}
      />
      <Route
        path="attendance/live"
        element={<AttendancePage onView={onView} />}
      />
      <Route
        path="attendance/history"
        element={<Navigate to="/admin/attendance/live" replace />}
      />
      <Route path="branches" element={<BranchesPage />} />
      <Route path="shifts" element={<ShiftsPage />} />
      <Route path="corrections" element={<ApprovalsPage />} />
      <Route
        path="approvals"
        element={<Navigate to="/admin/corrections" replace />}
      />
      <Route path="payroll" element={<PayrollPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route
        path="*"
        element={
          <section className="card card-pad">
            <h2>Page not found</h2>
            <Link className="link" to="/admin/overview">
              Return to overview →
            </Link>
          </section>
        }
      />
    </Routes>
    </Suspense>
  );
}
