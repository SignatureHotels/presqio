import { Suspense, useEffect } from "react";
import { Skeleton } from "@mui/material";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import type { Employee } from "@/types/admin-preview";
import { useAuth } from "@/hooks/use-auth";
import { accessIn, allowed } from "@/utils/access";
import { adminNavigation } from "./admin-navigation";
import { lazyPage, preloadWhenIdle } from "./lazy-page";

// Each admin page is its own chunk; all are prefetched when idle so moving between pages stays instant.
const OverviewPage = lazyPage(() => import("@/app/admin/overview"), "OverviewPage");
const EmployeesPage = lazyPage(() => import("@/app/admin/employees"), "EmployeesPage");
const AttendancePage = lazyPage(() => import("@/app/admin/attendance"), "AttendancePage");
const BranchesPage = lazyPage(() => import("@/app/admin/branches"), "BranchesPage");
const ShiftsPage = lazyPage(() => import("@/app/admin/shifts"), "ShiftsPage");
const TimeOffPage = lazyPage(() => import("@/app/admin/time-off"), "TimeOffPage");
const RosterPage = lazyPage(() => import("@/app/admin/roster"), "RosterPage");
const ApprovalsPage = lazyPage(() => import("@/app/admin/approvals"), "ApprovalsPage");
const ReportsPage = lazyPage(() => import("@/app/admin/reports"), "ReportsPage");
const SettingsPage = lazyPage(() => import("@/app/admin/settings"), "SettingsPage");
const PayrollPage = lazyPage(() => import("@/app/admin/payroll/PayrollPage"), "default");
const TeamPage = lazyPage(() => import("@/app/admin/team"), "TeamPage");
const PAGES = [OverviewPage, EmployeesPage, AttendancePage, BranchesPage, ShiftsPage, RosterPage, TimeOffPage, ApprovalsPage, ReportsPage, SettingsPage, PayrollPage, TeamPage];
export function AdminRoutes({
  onView,
}: {
  onView: (employee: Employee) => void;
}) {
  useEffect(() => preloadWhenIdle(PAGES), []);
  const access = accessIn(useAuth().activeOrganization);
  /** A page someone can't use sends them to the overview (the server refuses its data anyway). */
  const gate = (path: string, page: React.ReactNode) =>
    allowed(adminNavigation.find((item) => item.path === path)?.only, access) ? page : <Navigate to="/admin/overview" replace />;
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
      <Route path="branches" element={gate("branches", <BranchesPage />)} />
      <Route path="shifts" element={gate("shifts", <ShiftsPage />)} />
      <Route path="roster" element={<RosterPage />} />
      <Route path="time-off" element={gate("time-off", <TimeOffPage />)} />
      <Route path="corrections" element={gate("corrections", <ApprovalsPage />)} />
      <Route
        path="approvals"
        element={<Navigate to="/admin/corrections" replace />}
      />
      <Route path="payroll" element={gate("payroll", <PayrollPage />)} />
      <Route path="reports" element={gate("reports", <ReportsPage />)} />
      <Route path="team" element={gate("team", <TeamPage />)} />
      <Route path="settings" element={gate("settings", <SettingsPage />)} />
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
