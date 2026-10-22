import { useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";
import { useAdmin } from "@/hooks/use-admin";
import { useLocation } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { EmailVerificationNotice } from "@/components/email-verification-notice";
import { AdminRoutes } from "@/router/AdminRoutes";
import { adminNavigation } from "@/router/admin-navigation";
import { EmployeeDialog } from "@/app/admin/employees/components/employee-dialog";
import { EmployeeDetails } from "@/app/admin/employees/components/employee-details";
import type { Employee } from "@/types/admin-preview";
import { AdminToolbar } from "./components/admin-toolbar";
import { WorkspaceNotifications } from "./components/workspace-notifications";
import { WorkspaceDataSkeleton } from "./AdminLoadingShell";
import { AdminMain, AdminView, SkipLink } from "./AdminLayout.style";
export function AdminLayout() {
  const location = useLocation();
  const admin = useAdmin();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [notifications, setNotifications] = useState(false);
  const page = adminNavigation.find(
    (item) => location.pathname === `/admin/${item.path}`,
  );
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = `${page?.title ?? "Admin"} · Presqio`;
  }, [location.pathname, page?.title]);
  return (
    <>
      <SkipLink href="#admin-content">
        Skip to content
      </SkipLink>
      <Navbar />
      <AdminView>
        <Sidebar />
        <AdminMain id="admin-content">
          <AdminToolbar
            onAdd={() => setAdding(true)}
            onNotifications={() => setNotifications(true)}
          />
          <EmailVerificationNotice />
          {admin.status === "error" && (
            <Alert severity={admin.organization ? "warning" : "error"} action={<Button color="inherit" onClick={() => void admin.reload()}>Retry</Button>}>
              {admin.organization ? "Could not refresh your workspace. Showing the last loaded data. " : "Could not load your workspace. "}{admin.loadError}
            </Alert>
          )}
          {!admin.organization && admin.status === "loading" ? (
            <WorkspaceDataSkeleton />
          ) : admin.organization ? <AdminRoutes onView={setSelected} /> : null}
          <Footer />
        </AdminMain>
      </AdminView>
      {adding && <EmployeeDialog onClose={() => setAdding(false)} />}
      {editing && (
        <EmployeeDialog key={editing.id} employee={editing} onClose={() => setEditing(null)} />
      )}
      <EmployeeDetails
        employeeId={selected?.id ?? null}
        onClose={() => setSelected(null)}
        onEdit={(employee) => {
          setSelected(null);
          setEditing(employee);
        }}
      />
      <WorkspaceNotifications
        open={notifications}
        onClose={() => setNotifications(false)}
      />
    </>
  );
}
