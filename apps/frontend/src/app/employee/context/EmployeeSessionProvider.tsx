import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EmployeeProfile, EmployeeSessionResponse } from "@presqio/lib";
import {
  employeeApi,
  refreshEmployeeSession,
  setEmployeeAccessToken,
  subscribeToEmployeeSession,
} from "@/api/employee-client";
import { EmployeeSessionContext, type EmployeeSessionState } from "./employee-session";
import { rememberLogin } from "../utils/remembered-login";

export function EmployeeSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<EmployeeSessionState["status"]>("loading");
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);

  const apply = useCallback((session: EmployeeSessionResponse | null) => {
    if (!session) {
      setEmployeeAccessToken(null);
      setProfile(null);
      setStatus("anonymous");
      return;
    }
    setEmployeeAccessToken(session.accessToken);
    setProfile(session.profile);
    setStatus("ready");
  }, []);

  // Restore the session from the refresh cookie when the app opens.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToEmployeeSession(apply);
    void refreshEmployeeSession().then((session) => { if (active) apply(session); });
    return () => { active = false; unsubscribe(); };
  }, [apply]);

  // Keep the 15-minute access token fresh while the app is open.
  useEffect(() => {
    if (status !== "ready") return;
    const timer = window.setInterval(() => void refreshEmployeeSession(), 12 * 60_000);
    return () => window.clearInterval(timer);
  }, [status]);

  const reload = useCallback(async () => {
    try {
      setProfile(await employeeApi.me());
    } catch {
      // Session expiry is handled by the API client; transient failures keep the last profile.
    }
  }, []);

  const value = useMemo<EmployeeSessionState>(
    () => ({
      status,
      profile,
      setProfile,
      async signIn(employeeCode) {
        apply(await employeeApi.login({ employeeCode }));
        rememberLogin(employeeCode);
      },
      async signOut() {
        await employeeApi.logout().catch(() => undefined);
        setEmployeeAccessToken(null);
        apply(null);
      },
      reload,
    }),
    [status, profile, apply, reload],
  );

  return <EmployeeSessionContext.Provider value={value}>{children}</EmployeeSessionContext.Provider>;
}
