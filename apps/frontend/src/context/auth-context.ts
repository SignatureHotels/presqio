import { createContext } from "react";
import type {
  LoginRequest,
  MeResponse,
  OrganizationAccess,
  RegisterRequest,
} from "@presqio/lib";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  me: MeResponse | null;
  /** The organization the admin is working in; null until one is chosen or created. */
  activeOrganization: OrganizationAccess | null;
  setActiveOrganization: (organizationId: string) => void;
  login: (request: LoginRequest) => Promise<MeResponse>;
  register: (request: RegisterRequest) => Promise<MeResponse>;
  /** Signs a Presqio owner in with the one-tap link emailed to them. */
  ownerSignIn: (token: string) => Promise<MeResponse>;
  logout: () => Promise<void>;
  /** Re-reads memberships and onboarding progress after a change. */
  reload: () => Promise<MeResponse | null>;
}

export const AuthContext = createContext<AuthState | null>(null);
