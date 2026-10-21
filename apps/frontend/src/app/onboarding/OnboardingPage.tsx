import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import type {
  BranchRecord,
  OnboardingStep,
  OrganizationDetail,
  ShiftRecord,
} from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { businessApi, organizationsApi } from "@/api/endpoints";
import { useAuth } from "@/hooks/use-auth";
import { FullPageStatus } from "@/router/route-guards";
import { STEPS, stepIndex, visibleStep } from "./onboarding-options";
import { OrganizationStep, type OrganizationValues } from "./components/organization-step";
import { BranchStep } from "./components/branch-step";
import { ShiftStep } from "./components/shift-step";
import { TeamStep } from "./components/team-step";
import { DoneStep } from "./components/done-step";
import {
  Bar,
  Layout,
  Shell,
  StepDot,
  StepItem,
  StepList,
  StepsTitle,
  UserEmail,
  VerifyNote,
  type StepState,
} from "./OnboardingPage.style";

interface Progress {
  organization: OrganizationDetail;
  branches: BranchRecord[];
  shifts: ShiftRecord[];
}

export function OnboardingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const organizationId = auth.activeOrganization?.id ?? null;
  const [progress, setProgress] = useState<Progress | null>(null);
  const [view, setView] = useState<OnboardingStep>("ORGANIZATION");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (id: string) => {
    const organization = await organizationsApi.get(id);
    // Branches and shifts live under the organization's own business record.
    const business = organization.defaultBusiness;
    const [branches, shifts] = business
      ? await Promise.all([
          businessApi.branches(id, business.id),
          businessApi.shifts(id, business.id),
        ])
      : [[], []];
    setProgress({ organization, branches, shifts });
    return organization;
  }, []);

  useEffect(() => {
    document.title = "Set up your workspace · Presqio";
    if (!organizationId) return;
    load(organizationId)
      .then((organization) => setView(visibleStep(organization.onboardingStep)))
      .catch((caught) => setLoadError(errorMessage(caught)));
  }, [organizationId, load]);

  // A user in several organizations must pick one first.
  useEffect(() => {
    if (auth.me && !organizationId && auth.me.organizations.length > 1)
      navigate("/select-organization", { replace: true });
  }, [auth.me, organizationId, navigate]);

  /** Moves the saved step forward (never backward) and shows the next step. */
  async function advance(from: OnboardingStep, id = organizationId) {
    const next = STEPS[stepIndex(from) + 1].id;
    if (id && progress && stepIndex(progress.organization.onboardingStep) < stepIndex(next)) {
      const organization = await organizationsApi.update(id, { onboardingStep: next });
      setProgress((current) => current && { ...current, organization });
      void auth.reload();
    }
    setView(next);
  }

  const back = (from: OnboardingStep) => setView(STEPS[Math.max(0, stepIndex(from) - 1)].id);

  async function saveOrganization(values: OrganizationValues) {
    if (!organizationId) {
      // Signed-in user without an organization (e.g. one who left their last one).
      const created = await organizationsApi.create(values);
      auth.setActiveOrganization(created.id);
      const organization = await organizationsApi.update(created.id, { onboardingStep: "BRANCH" });
      setProgress({ organization, branches: [], shifts: [] });
      await auth.reload();
      setView("BRANCH");
      return;
    }
    const organization = await organizationsApi.update(organizationId, values);
    setProgress((current) => current && { ...current, organization });
    await advance("ORGANIZATION");
  }

  async function finish() {
    if (!organizationId) return;
    await organizationsApi.update(organizationId, { onboardingStep: "COMPLETED" });
    await auth.reload();
    navigate("/admin/overview", { replace: true });
  }

  if (loadError)
    return (
      <main className="upcoming-portal">
        <Alert severity="error">{loadError}</Alert>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (organizationId && !progress) return <FullPageStatus label="Loading your setup…" />;

  const current = stepIndex(view);
  const organization = progress?.organization ?? null;
  const business = organization?.defaultBusiness ?? null;

  return (
    <Shell>
      <Bar>
        <span className="brand-wrap">
          <img className="brand-logo" src="/logo.png" alt="Presqio" width={180} height={60} />
        </span>
        <div className="flex gap12">
          <UserEmail className="sm muted">{auth.me?.user.email}</UserEmail>
          <Button size="small" onClick={() => void auth.logout().then(() => navigate("/"))}>
            Sign out
          </Button>
        </div>
      </Bar>
      <Layout>
        <nav aria-label="Setup progress">
          <StepsTitle>Set up {organization?.name ?? "your workspace"}</StepsTitle>
          <StepList>
            {STEPS.map((step, index) => {
              const state: StepState =
                index < current ? "done" : index === current ? "current" : "upcoming";
              return (
                <StepItem
                  key={step.id}
                  state={state}
                  aria-current={index === current ? "step" : undefined}
                >
                  <StepDot state={state}>{index < current ? "✓" : index + 1}</StepDot>
                  <span>
                    <strong>{step.label}</strong>
                    <span className="sm muted">{step.hint}</span>
                  </span>
                </StepItem>
              );
            })}
          </StepList>
          {auth.me && !auth.me.user.emailVerified && (
            <VerifyNote>We sent a verification link to {auth.me.user.email}.</VerifyNote>
          )}
        </nav>
        <section>
          {view === "ORGANIZATION" && (
            <OrganizationStep organization={organization} onSubmit={saveOrganization} />
          )}
          {view === "BRANCH" && organization && business && (
            <BranchStep
              branches={progress!.branches}
              onBack={() => back("BRANCH")}
              onCreate={async (request) => {
                const branch = await businessApi.createBranch(organization.id, business.id, request);
                setProgress((p) => p && { ...p, branches: [...p.branches, branch] });
              }}
              onContinue={() => advance("BRANCH")}
            />
          )}
          {view === "SHIFT" && organization && business && (
            <ShiftStep
              shifts={progress!.shifts}
              onBack={() => back("SHIFT")}
              onCreate={async (request) => {
                const shift = await businessApi.createShift(organization.id, business.id, request);
                setProgress((p) => p && { ...p, shifts: [...p.shifts, shift] });
              }}
              onContinue={() => advance("SHIFT")}
            />
          )}
          {view === "TEAM" && (
            <TeamStep onBack={() => back("TEAM")} onContinue={() => advance("TEAM")} />
          )}
          {view === "COMPLETED" && organization && (
            <DoneStep
              organization={organization}
              branches={progress!.branches}
              shifts={progress!.shifts}
              onBack={() => back("COMPLETED")}
              onFinish={finish}
            />
          )}
          {["BRANCH", "SHIFT"].includes(view) && !business && (
            <Alert severity="error">
              This organization is missing its branch records. Please contact support.
            </Alert>
          )}
        </section>
      </Layout>
    </Shell>
  );
}
