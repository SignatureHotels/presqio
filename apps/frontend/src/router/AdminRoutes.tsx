import { Link, Navigate, Route, Routes } from "react-router-dom";
import type { Employee } from "@/types/admin-preview";
import { AttendancePage } from "@/app/admin/attendance";
import { OverviewPage } from "@/app/admin/overview";
import { EmployeesPage } from "@/app/admin/employees";
import { BranchesPage } from "@/app/admin/branches";
import { ShiftsPage } from "@/app/admin/shifts";
import { ApprovalsPage } from "@/app/admin/approvals";
import { ReportsPage } from "@/app/admin/reports";
import { SettingsPage } from "@/app/admin/settings";
export function AdminRoutes({
  onView,
}: {
  onView: (employee: Employee) => void;
}) {
  return (
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
  );
}
