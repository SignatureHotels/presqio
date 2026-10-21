import { useState } from "react";
import { Alert } from "@mui/material";
import { errorMessage } from "@/api/client";
import { Icon } from "@/components";
import { StepFrame, StepList, StepListIcon } from "../step-frame";

/** Invitations and employee import are not live yet; this step explains what comes next. */
export function TeamStep({
  onContinue,
  onBack,
}: {
  onContinue: () => Promise<void>;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onContinue();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  return (
    <StepFrame
      eyebrow="Step 4"
      title="Bring in your team"
      description="You can do this now or after setup. Nothing here blocks you from opening the workspace."
      error={error}
      busy={busy}
      onSubmit={submit}
      onBack={onBack}
    >
      <StepList>
        <li>
          <StepListIcon>
            <Icon name="shield" className="tiny" />
          </StepListIcon>
          <div>
            <strong>Invite admins and branch managers</strong>
            <span className="sm muted">
              Give a manager access to only the branches they run.
            </span>
          </div>
        </li>
        <li>
          <StepListIcon>
            <Icon name="users" className="tiny" />
          </StepListIcon>
          <div>
            <strong>Add employees</strong>
            <span className="sm muted">
              Add employees from the directory, assign their branch and shift, and share their employee IDs.
            </span>
          </div>
        </li>
      </StepList>
      <Alert severity="info">
        Team invitations and employee import are being finished. You'll find them under
        Settings and Employees once available.
      </Alert>
    </StepFrame>
  );
}
