import { AdminLoadingShell } from "@/layouts/admin-layout/AdminLoadingShell";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { EmployeePage } from "@/app/employee";
import { OwnerPage } from "@/app/owner";
import { NotFoundPage } from "@/app/not-found";
import { HomePage } from "@/app/public/home";
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "@/app/auth";
import { SelectOrganizationPage } from "@/app/select-organization";
import { FullPageStatus, GuestOnly, RequireAuth, RequireWorkspace } from "./route-guards";
const AdminWorkspace = lazy(() => import("@/app/admin/AdminWorkspace"));
const OnboardingPage = lazy(() =>
  import("@/app/onboarding").then((module) => ({ default: module.OnboardingPage })),
);
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/select-organization"
        element={<RequireAuth><SelectOrganizationPage /></RequireAuth>}
      />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Suspense fallback={<FullPageStatus label="Loading setup…" />}>
              <OnboardingPage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAuth>
            <RequireWorkspace>
              <Suspense fallback={<AdminLoadingShell />}>
                <AdminWorkspace />
              </Suspense>
            </RequireWorkspace>
          </RequireAuth>
        }
      />
      {/* Employee portal (mobile). Sub-pages such as check-in will live under /employee/… */}
      <Route path="/employee/*" element={<EmployeePage />} />
      {/* Old address, kept so earlier links and saved home-screen icons still work. */}
      <Route path="/home" element={<Navigate to="/employee" replace />} />
      <Route path="/owner/*" element={<OwnerPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
