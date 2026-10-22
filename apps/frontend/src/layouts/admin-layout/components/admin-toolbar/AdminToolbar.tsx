import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Icon } from "@/components";
import { useLocation, useNavigate } from "react-router-dom";
import { adminNavigation } from "@/router/admin-navigation";
import { longDate, zoneLabel } from "@/utils/dates";
import { Actions, Eyebrow, PageIntro, PageLead, PageTitle, Toolbar } from "./AdminToolbar.style";
export function AdminToolbar({
  onAdd,
  onNotifications,
}: {
  onAdd: () => void;
  onNotifications: () => void;
}) {
  const admin = useAdmin();
  const firstName = useAuth().me?.user.displayName.split(" ")[0];
  const location = useLocation();
  const navigate = useNavigate();
  const pending = admin.scopedApprovals.filter(
    (approval) => approval.status === "Pending",
  );
  const page = adminNavigation.find(
    (item) => location.pathname === `/admin/${item.path}`,
  );
  // Payroll spans all branches and has its own employee search, so the workspace controls don't apply there.
  const workspaceControls = location.pathname !== "/admin/payroll";
  return (
    <Toolbar>
      <PageIntro>
        <Eyebrow>
          {admin.today ? `${longDate(admin.today)} · ${zoneLabel(admin.timezone)}` : "\u00a0"}
        </Eyebrow>
        <PageTitle>{(firstName ? page?.heading.replace("Admin", firstName) : page?.heading) ??
            "Page not found"}</PageTitle>
        <PageLead>
          {page?.description ?? "This admin page is not available."}
        </PageLead>
      </PageIntro>
      <Actions>
        {workspaceControls && (
          <>
            <select
              className="company-switch"
              aria-label="Select branch"
              value={admin.branchFilter}
              onChange={(event) => {
                admin.setBranchFilter(event.target.value);
                admin.setSearch("");
              }}
            >
              <option value="all">All branches</option>
              {admin.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <label className="input-shell search-shell">
              <Icon name="search" className="tiny" />
              <input
                type="search"
                aria-label="Search employees"
                placeholder="Search employees"
                value={admin.search}
                onChange={(event) => {
                  admin.setSearch(event.target.value);
                  if (
                    !["/admin/employees", "/admin/attendance/live"].includes(
                      location.pathname,
                    )
                  )
                    navigate("/admin/employees");
                }}
              />
            </label>
          </>
        )}
        <button
          className="circle-btn"
          aria-label="Notifications"
          onClick={() => onNotifications()}
        >
          <Icon name="bell" />
          {pending.length > 0 && <span className="notify" />}
        </button>
        {workspaceControls && (
          <button
            className="btn primary"
            onClick={() => onAdd()}
            disabled={!admin.branches.length}
            title={admin.branches.length ? undefined : "Add a branch first"}
          >
            <Icon name="plus" className="tiny" />
            Add employee
          </button>
        )}
      </Actions>
    </Toolbar>
  );
}
