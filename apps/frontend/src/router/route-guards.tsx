import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { landingPath } from "@/utils/auth-routing";

export function FullPageStatus({ label }: { label: string }) {
  return (
    <main className="upcoming-portal" role="status">
      {label}
    </main>
  );
}

/** Signed-in admins only; others go to login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageStatus label="Checking your session…" />;
  if (status === "anonymous")
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return <>{children}</>;
}

/** The admin workspace needs a chosen organization that has finished setup. */
export function RequireWorkspace({ children }: { children: ReactNode }) {
  const { me, activeOrganization } = useAuth();
  if (!me) return null;
  if (activeOrganization?.onboardingStep !== "COMPLETED")
    return <Navigate to={landingPath(me, activeOrganization)} replace />;
  return <>{children}</>;
}

/** Login/register pages send already signed-in admins to their workspace. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, me, activeOrganization } = useAuth();
  if (status === "loading") return <FullPageStatus label="Loading…" />;
  if (status === "authenticated" && me)
    return <Navigate to={landingPath(me, activeOrganization)} replace />;
  return <>{children}</>;
}
