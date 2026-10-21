import { useState } from "react";
import type { BranchRecord, OrganizationDetail, ShiftRecord } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { StepFrame } from "../step-frame";
import { Review } from "./DoneStep.style";

export function DoneStep({
  organization,
  branches,
  shifts,
  onFinish,
  onBack,
}: {
  organization: OrganizationDetail;
  branches: BranchRecord[];
  shifts: ShiftRecord[];
  onFinish: () => Promise<void>;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const trialEnds = organization.subscription?.trialEndsAt
    ? new Date(organization.subscription.trialEndsAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const rows = [
    ["Organization", organization.name],
    // Employees sign in with just their ID (prefix + number) and PIN.
    [
      "Employee IDs",
      organization.defaultBusiness
        ? `${organization.defaultBusiness.employeeIdPrefix}0001, ${organization.defaultBusiness.employeeIdPrefix}0002 …`
        : "—",
    ],
    ["Branches", branches.map((b) => b.name).join(", ") || "—"],
    ["Shifts", shifts.map((s) => `${s.name} (${s.start}–${s.end})`).join(", ") || "—"],
    [
      "Plan",
      organization.subscription
        ? `${organization.subscription.planName} trial${trialEnds ? ` until ${trialEnds}` : ""}`
        : "—",
    ],
  ];
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onFinish();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  return (
    <StepFrame
      eyebrow="All set"
      title="Your workspace is ready"
      description="Here's what you've set up. Everything can be changed later."
      error={error}
      busy={busy}
      submitLabel="Open workspace"
      onSubmit={submit}
      onBack={onBack}
    >
      <Review>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </Review>
    </StepFrame>
  );
}
