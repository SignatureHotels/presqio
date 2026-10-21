import type { MeResponse, OrganizationAccess } from "@presqio/lib";

const ACTIVE_ORGANIZATION_KEY = "presqio.activeOrganization";

export function readActiveOrganizationId() {
  try {
    return window.localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
  } catch {
    return null;
  }
}

export function writeActiveOrganizationId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_ORGANIZATION_KEY, id);
    else window.localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  } catch {
    // Storage unavailable (private mode); the choice simply is not remembered.
  }
}

/** The remembered organization, or the only one when the user has exactly one. */
export function resolveActiveOrganization(
  me: MeResponse | null,
  preferredId: string | null,
): OrganizationAccess | null {
  if (!me) return null;
  return (
    me.organizations.find((org) => org.id === preferredId) ??
    (me.organizations.length === 1 ? me.organizations[0] : null)
  );
}

/** Where an admin should land after signing in, given their memberships. */
export function landingPath(me: MeResponse, active: OrganizationAccess | null) {
  if (me.organizations.length === 0) return "/onboarding";
  if (!active) return "/select-organization";
  if (active.onboardingStep !== "COMPLETED") return "/onboarding";
  return "/admin/overview";
}

/** Only same-app paths are honoured for ?next= redirects. */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
