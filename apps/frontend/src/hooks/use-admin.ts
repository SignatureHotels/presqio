import { useContext } from "react";
import { AdminContext } from "@/context/admin-context";
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("AdminProvider is required");
  return context;
}
