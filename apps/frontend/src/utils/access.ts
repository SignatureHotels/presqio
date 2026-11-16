import type { OrganizationAccess, TeamAccess } from "@presqio/lib";

/** What the signed-in person can do in this workspace. */
export function accessIn(organization: OrganizationAccess | null | undefined): TeamAccess | null {
  if (!organization) return null;
  if (organization.role === "OWNER") return "OWNER";
  if (organization.role === "ADMIN") return "ADMIN";
  const role = organization.businesses[0]?.businessRole;
  return role === "VIEWER" ? "VIEWER" : "MANAGER";
}

export const ADMINS: TeamAccess[] = ["OWNER", "ADMIN"];
export const RUNS_BRANCHES: TeamAccess[] = ["OWNER", "ADMIN", "MANAGER"];

/** Whether a page (by its admin path) is for this person; while access is unknown, show it. */
export const allowed = (only: TeamAccess[] | undefined, access: TeamAccess | null) => !only || !access || only.includes(access);
