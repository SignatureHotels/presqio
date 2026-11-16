import { useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { errorMessage } from "@/api/client";
import { SectionHeader } from "@/components";
import { useAdmin } from "@/hooks/use-admin";
import { COUNTRIES, timezoneOptions } from "@/app/onboarding/onboarding-options";
import { longDate } from "@/utils/dates";
import { BUSINESS_PRESETS } from "@/utils/business-types";
import type { BusinessType } from "@presqio/lib";
import { SettingsForm, SignInCode } from "./WorkspaceSettingsForm.style";

export function WorkspaceSettingsForm() {
  const { organization, actions, notify } = useAdmin();
  const [values, setValues] = useState({
    name: organization?.name ?? "",
    country: organization?.country ?? "IN",
    defaultTimezone: organization?.defaultTimezone ?? "Asia/Kolkata",
    businessType: (organization?.defaultBusiness?.businessType ?? "") as BusinessType | "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!organization) return null;
  const changed =
    values.name.trim() !== organization.name ||
    values.country !== organization.country ||
    values.defaultTimezone !== organization.defaultTimezone ||
    values.businessType !== (organization.defaultBusiness?.businessType ?? "");
  const plan = organization.subscription;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (values.name.trim().length < 2) return setError("Enter your organization's name.");
    setBusy(true);
    setError("");
    try {
      await actions.updateOrganization({
        ...values,
        name: values.name.trim(),
        businessType: values.businessType || undefined,
      });
      notify("Workspace settings saved.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad">
      <SectionHeader title="Workspace settings" subtitle="Your organization's details" />
      <SettingsForm onSubmit={save} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          required
          label="Organization name"
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
        <TextField
          select
          label="Kind of business"
          value={values.businessType}
          onChange={(event) => setValues({ ...values, businessType: event.target.value as BusinessType })}
          helperText={
            values.businessType
              ? BUSINESS_PRESETS.find((p) => p.id === values.businessType)?.examples
              : "Choose one so Presqio can suggest shifts and leave types that fit."
          }
        >
          {!values.businessType && <MenuItem value="" disabled>Not chosen yet</MenuItem>}
          {BUSINESS_PRESETS.map((preset) => (
            <MenuItem key={preset.id} value={preset.id}>
              {preset.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Country"
          value={values.country}
          onChange={(event) => setValues({ ...values, country: event.target.value })}
        >
          {COUNTRIES.map((country) => (
            <MenuItem key={country.code} value={country.code}>
              {country.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Time zone"
          value={values.defaultTimezone}
          onChange={(event) => setValues({ ...values, defaultTimezone: event.target.value })}
          helperText="Used for check-in times, shifts and reports"
        >
          {timezoneOptions(values.defaultTimezone).map((zone) => (
            <MenuItem key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </MenuItem>
          ))}
        </TextField>
        <SignInCode>
          <span className="muted sm">Employee ID prefix</span>
          <strong>{organization.defaultBusiness?.employeeIdPrefix ?? "—"}</strong>
          <span className="muted sm">
            New employees get IDs like {organization.defaultBusiness?.employeeIdPrefix ?? "SGH"}0001.
            They sign in on their phone with just that ID.
          </span>
        </SignInCode>
        {plan && (
          <Alert severity={plan.status === "TRIALING" ? "info" : "success"}>
            {plan.planName} plan{plan.status === "TRIALING" ? " trial" : ""}
            {plan.trialEndsAt ? ` until ${longDate(plan.trialEndsAt.slice(0, 10))}` : ""} · up to{" "}
            {plan.limits.maxBranches ?? "unlimited"} branches and{" "}
            {plan.limits.maxEmployees ?? "unlimited"} employees.
          </Alert>
        )}
        <Button variant="contained" type="submit" disabled={busy || !changed}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </SettingsForm>
    </section>
  );
}
