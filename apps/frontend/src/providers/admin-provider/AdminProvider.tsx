import type { ReactNode } from "react";
import { Alert, Button, Snackbar } from "@mui/material";
import { AdminContext } from "@/context/admin-context";
import { useAdminState } from "@/hooks/use-admin-state";
import { FullPageStatus } from "@/router/route-guards";

export function AdminProvider({ children }: { children: ReactNode }) {
  const state = useAdminState();
  if (state.status === "loading" && !state.organization)
    return <FullPageStatus label="Loading your workspace…" />;
  if (state.status === "error")
    return (
      <main className="upcoming-portal">
        <Alert severity="error">{state.loadError}</Alert>
        <Button variant="contained" onClick={() => void state.reload()}>
          Try again
        </Button>
      </main>
    );
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
