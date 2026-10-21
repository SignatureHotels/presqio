import { createContext, useContext } from "react";
import type { EmployeeProfile } from "@presqio/lib";

export interface EmployeeSessionState {
  status: "loading" | "anonymous" | "ready";
  profile: EmployeeProfile | null;
  setProfile: (profile: EmployeeProfile) => void;
  signIn: (employeeCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}

export const EmployeeSessionContext = createContext<EmployeeSessionState | null>(null);

export function useEmployeeSession() {
  const state = useContext(EmployeeSessionContext);
  if (!state) throw new Error("useEmployeeSession must be used inside EmployeeSessionProvider");
  return state;
}
