import { AdminLoadingShell } from "@/layouts/admin-layout/AdminLoadingShell";
import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FullPageStatus, GuestOnly, RequireAuth, RequireWorkspace } from "./route-guards";
import { lazyPage } from "./lazy-page";
import { HomePage } from "@/app/public/home";
import { LoginPage } from "@/app/auth/login/LoginPage";

// Every area loads on demand, so visitors download only the part of the app they use.
const RegisterPage = lazyPage(() => import("@/app/auth/register/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = lazyPage(() => import("@/app/auth/forgot-password/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyPage(() => import("@/app/auth/reset-password/ResetPasswordPage"), "ResetPasswordPage");
const VerifyEmailPage = lazyPage(() => import("@/app/auth/verify-email/VerifyEmailPage"), "VerifyEmailPage");
const SelectOrganizationPage = lazyPage(() => import("@/app/select-organization"), "SelectOrganizationPage");
const OnboardingPage = lazyPage(() => import("@/app/onboarding"), "OnboardingPage");
const AdminWorkspace = lazyPage(() => import("@/app/admin/AdminWorkspace"), "default");
const EmployeePage = lazyPage(() => import("@/app/employee"), "EmployeePage");
const OwnerPage = lazyPage(() => import("@/app/owner"), "OwnerPage");
const NotFoundPage = lazyPage(() => import("@/app/not-found"), "NotFoundPage");

const pageFallback = <FullPageStatus label="Loading page…" />;

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<Suspense fallback={pageFallback}><GuestOnly><RegisterPage /></GuestOnly></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={pageFallback}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={pageFallback}><ResetPasswordPage /></Suspense>} />
      <Route path="/verify-email" element={<Suspense fallback={pageFallback}><VerifyEmailPage /></Suspense>} />
      <Route
        path="/select-organization"
        element={<Suspense fallback={pageFallback}><RequireAuth><SelectOrganizationPage /></RequireAuth></Suspense>}
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
      <Route path="/employee/*" element={<Suspense fallback={pageFallback}><EmployeePage /></Suspense>} />
      {/* Old address, kept so earlier links and saved home-screen icons still work. */}
      <Route path="/home" element={<Navigate to="/employee" replace />} />
      <Route path="/owner/*" element={<Suspense fallback={pageFallback}><OwnerPage /></Suspense>} />
      <Route path="*" element={<Suspense fallback={pageFallback}><NotFoundPage /></Suspense>} />
    </Routes>
  );
}
