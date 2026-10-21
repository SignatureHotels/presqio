import { WorkspaceSettingsForm } from "./components/workspace-settings-form";
import { IntegrationStatus } from "./components/integration-status";

export function SettingsPage() {
  return (
    <div className="page-grid">
      <WorkspaceSettingsForm />
      <IntegrationStatus />
    </div>
  );
}
