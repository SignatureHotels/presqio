import { useContext } from "react";
import { Skeleton } from "@mui/material";
import { AdminContext } from "@/context/admin-context";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/utils/format";
import { Icon } from "@/components";
import { adminNavigation } from "@/router/admin-navigation";
import {
  Aside,
  Badge,
  GroupName,
  HelpCard,
  HelpLink,
  HelpTitle,
  ItemLabel,
  SideItem,
  Spacer,
  UserAvatar,
  UserCopy,
  UserRow,
} from "./Sidebar.style";
export function Sidebar({ loading = false }: { loading?: boolean }) {
  const admin = useContext(AdminContext);
  if (!loading && !admin) throw new Error("Sidebar must be used inside AdminProvider");
  const auth = useAuth();
  const pending = (admin?.scopedApprovals ?? []).filter(
    (approval) => approval.status === "Pending",
  );
  function navigation(items: typeof adminNavigation) {
    return items.map((item) => (
      <SideItem
        key={item.path}
        to={`/admin/${item.path}`}
        title={item.title}
        aria-label={item.title}
      >
        <Icon name={item.icon} />
        <ItemLabel>{item.title}</ItemLabel>
        {!loading && item.path === "corrections" && pending.length > 0 && (
          <Badge>{pending.length}</Badge>
        )}
      </SideItem>
    ));
  }
  return (
    <Aside aria-label="Admin navigation">
      <GroupName>Workspace</GroupName>
      <nav aria-label="Workspace">
        {navigation(adminNavigation.slice(0, 2))}
      </nav>
      <GroupName spaced>Management</GroupName>
      <nav aria-label="Management">{navigation(adminNavigation.slice(2))}</nav>
      <Spacer />
      <HelpCard>
        <Icon name="shield" />
        <HelpTitle>Built on trust.</HelpTitle>
        <p>Selfie evidence, onsite attendance and a clear audit trail.</p>
        <HelpLink to="/admin/settings">View workspace settings →</HelpLink>
      </HelpCard>
      <UserRow>
        {loading ? <Skeleton variant="rounded" width="100%" height={34} /> : <>
        <UserAvatar>{initials(auth.me?.user.displayName ?? "")}</UserAvatar>
        <UserCopy>
          <strong>{auth.me?.user.displayName ?? "Workspace admin"}</strong>
          <span>{admin?.organization?.name ?? auth.activeOrganization?.name}</span>
        </UserCopy>
        </>}
      </UserRow>
    </Aside>
  );
}
