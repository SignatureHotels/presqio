import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { EmployeeSessionProvider } from "./context/EmployeeSessionProvider";
import { useEmployeeSession } from "./context/employee-session";
import { AppFrame, Phone, Splash } from "./EmployeeApp.style";
import { CheckPage } from "./pages/check";
import { EmployeeHome } from "./pages/home";
import { HistoryPage } from "./pages/history";
import { LeavePage } from "./pages/leave";
import { ProfilePage } from "./pages/profile";
import { RequestsPage } from "./pages/requests";
import { SignInPage } from "./pages/sign-in";

/** The employee mobile app, served at /employee. */
export function EmployeePage() {
  useEffect(() => {
    document.title = "Presqio · Check in";
  }, []);
  return (
    <EmployeeSessionProvider>
      <AppFrame>
        <Phone>
          <EmployeeRoutes />
        </Phone>
      </AppFrame>
    </EmployeeSessionProvider>
  );
}

function EmployeeRoutes() {
  const { status } = useEmployeeSession();
  // A returning employee may have a refresh cookie, but the sign-in UI does not
  // depend on that lookup. Keep it visible while restoration happens.
  if (status !== "ready")
    return (
      <Routes>
        <Route index element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/employee" replace />} />
      </Routes>
    );
  return (
    <Routes>
      <Route index element={<EmployeeHome />} />
      <Route path="check/:action" element={<CheckPage />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="leave" element={<LeavePage />} />
      <Route path="requests" element={<RequestsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/employee" replace />} />
    </Routes>
  );
}
