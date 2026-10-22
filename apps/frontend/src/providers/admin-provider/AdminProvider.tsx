import type { ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { AdminContext } from "@/context/admin-context";
import { useAdminState } from "@/hooks/use-admin-state";

export function AdminProvider({ children }: { children: ReactNode }) {
  const state = useAdminState();
  return (
    <AdminContext.Provider value={state}>
      {children}
      <Snackbar
        open={Boolean(state.notice)}
        autoHideDuration={4500}
        // Bottom-right keeps confirmations clear of the sidebar.
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        onClose={() => state.notify("")}
      >
        <Alert severity="success" variant="filled" onClose={() => state.notify("")}>
          {state.notice}
        </Alert>
      </Snackbar>
    </AdminContext.Provider>
  );
}
