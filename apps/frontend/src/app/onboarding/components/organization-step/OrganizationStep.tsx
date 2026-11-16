import { useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { BusinessType, OrganizationDetail } from "@presqio/lib";
import { BUSINESS_PRESETS } from "@/utils/business-types";
import { TypeGrid } from "./OrganizationStep.style";
import { errorMessage } from "@/api/client";
import { StepFrame } from "../step-frame";
import { COUNTRIES, browserTimezone, timezoneOptions } from "../../onboarding-options";

export interface OrganizationValues {
  name: string;
  country: string;
  defaultTimezone: string;
  businessType: BusinessType | null;
}

export function OrganizationStep({
  organization,
  onSubmit,
}: {
  /** null when the user has no organization yet and this step creates one. */
  organization: OrganizationDetail | null;
  onSubmit: (values: OrganizationValues) => Promise<void>;
}) {
  const [values, setValues] = useState<OrganizationValues>({
    name: organization?.name ?? "",
    country: organization?.country ?? "IN",
    defaultTimezone: organization?.defaultTimezone ?? browserTimezone(),
    businessType: organization?.defaultBusiness?.businessType ?? null,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const invalid = values.name.trim().length < 2 || !values.businessType;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSubmit({ ...values, name: values.name.trim() });
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <StepFrame
      eyebrow="Step 1"
      title={organization ? "Confirm your organization" : "Create your organization"}
      description="The organization is your account. Billing, admins and every branch you run sit under it."
      error={error}
      busy={busy}
      submitDisabled={invalid}
      onSubmit={submit}
    >
      <TextField
        label="Organization name"
        required
        autoFocus
        value={values.name}
        onChange={(event) => setValues({ ...values, name: event.target.value })}
        helperText="For example your group or holding company name"
      />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="fw7">What kind of business is it?</legend>
        <span className="sm muted">
          We'll suggest shifts, leave types and settings that fit. You can change everything later.
        </span>
        <TypeGrid role="radiogroup" aria-label="Kind of business">
          {BUSINESS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={values.businessType === preset.id}
              className={values.businessType === preset.id ? "selected" : ""}
              onClick={() => setValues({ ...values, businessType: preset.id })}
            >
              <strong>{preset.label}</strong>
              <span>{preset.examples}</span>
            </button>
          ))}
        </TypeGrid>
      </fieldset>
      <div className="form-columns">
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
          label="Default time zone"
          value={values.defaultTimezone}
          onChange={(event) => setValues({ ...values, defaultTimezone: event.target.value })}
          helperText="New branches and shifts use this time zone"
        >
          {timezoneOptions(values.defaultTimezone).map((zone) => (
            <MenuItem key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </MenuItem>
          ))}
        </TextField>
      </div>
    </StepFrame>
  );
}
