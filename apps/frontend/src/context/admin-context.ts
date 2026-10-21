import { createContext } from "react";
import type { useAdminState } from "@/hooks/use-admin-state";
export type AdminContextValue = ReturnType<typeof useAdminState>;
export const AdminContext = createContext<AdminContextValue | null>(null);
