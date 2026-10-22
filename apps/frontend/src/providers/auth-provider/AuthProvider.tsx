import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthSessionResponse, MeResponse } from "@presqio/lib";
import { refreshSession, setAccessToken, subscribeToSession } from "@/api/client";
import { authApi } from "@/api/endpoints";
import { AuthContext, type AuthState, type AuthStatus } from "@/context/auth-context";
import {
  readActiveOrganizationId,
  resolveActiveOrganization,
  writeActiveOrganizationId,
} from "@/utils/auth-routing";

const profileOf = ({ user, organizations }: AuthSessionResponse): MeResponse => ({
  user,
  organizations,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(readActiveOrganizationId);

  const apply = useCallback((session: AuthSessionResponse | null) => {
    if (!session) {
      setMe(null);
      setStatus("anonymous");
      return;
    }
    setAccessToken(session.accessToken);
    setMe(profileOf(session));
    setStatus("authenticated");
  }, []);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSession(apply);
    void refreshSession().then((session) => { if (active) apply(session); });
    return () => { active = false; unsubscribe(); };
  }, [apply]);

  // Refresh shortly before the 15-minute access token expires.
  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setInterval(() => void refreshSession(), 12 * 60_000);
    return () => window.clearInterval(timer);
  }, [status]);

  const setActiveOrganization = useCallback((id: string) => {
    writeActiveOrganizationId(id);
    setActiveId(id);
  }, []);

  const value = useMemo<AuthState>(() => {
    const signIn = (session: AuthSessionResponse) => {
      apply(session);
      const profile = profileOf(session);
      if (profile.organizations.length === 1)
        setActiveOrganization(profile.organizations[0].id);
      return profile;
    };
    return {
      status,
      me,
      activeOrganization: resolveActiveOrganization(me, activeId),
      setActiveOrganization,
      login: async (request) => signIn(await authApi.login(request)),
      register: async (request) => signIn(await authApi.register(request)),
      logout: async () => {
        await authApi.logout().catch(() => undefined);
        setAccessToken(null);
        writeActiveOrganizationId(null);
        setActiveId(null);
        apply(null);
      },
      reload: async () => {
        try {
          const next = await authApi.me();
          setMe(next);
          return next;
        } catch {
          return null;
        }
      },
    };
  }, [status, me, activeId, apply, setActiveOrganization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
