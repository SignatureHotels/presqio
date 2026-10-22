import { Skeleton, Stack } from "@mui/material";
import { useLocation } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { adminNavigation } from "@/router/admin-navigation";
import { AdminMain, AdminView } from "./AdminLayout.style";
import { Actions, PageIntro, PageLead, PageTitle, Toolbar } from "./components/admin-toolbar/AdminToolbar.style";

export function WorkspaceDataSkeleton() {
  return (
    <Stack spacing={2} role="status" aria-label="Fetching workspace data" aria-busy="true">
      <Skeleton variant="rounded" height={100} />
      <Skeleton variant="rounded" height={220} />
      <Skeleton variant="rounded" height={160} />
    </Stack>
  );
}

/** Public layout only: protected pages and requests still wait for session verification. */
export function AdminLoadingShell() {
  const location = useLocation();
  const page = adminNavigation.find((item) => location.pathname === `/admin/${item.path}`);
  return (
    <>
      <Navbar loading />
      <AdminView>
        <Sidebar loading />
        <AdminMain aria-busy="true" aria-label="Opening your workspace">
          <Toolbar>
            <PageIntro>
              <Skeleton width={210} height={22} sx={{ marginBottom: "5px" }} />
              <PageTitle>{page?.title ?? "Attendance workspace"}</PageTitle>
              <PageLead>{page?.description}</PageLead>
            </PageIntro>
            <Actions>
              <Skeleton variant="rounded" width={118} height={40} />
              <Skeleton variant="rounded" width={210} height={40} />
            </Actions>
          </Toolbar>
          <WorkspaceDataSkeleton />
          <Footer />
        </AdminMain>
      </AdminView>
    </>
  );
}
