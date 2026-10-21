import type { OnboardingStep, Weekday } from "@presqio/lib";

/** Setup is organization -> branches; the stored BUSINESS step is no longer shown. */
export const STEPS: { id: OnboardingStep; label: string; hint: string }[] = [
  { id: "ORGANIZATION", label: "Organization", hint: "Your company or group" },
  { id: "BRANCH", label: "Branches & perimeter", hint: "Where employees check in" },
  { id: "SHIFT", label: "Default shift", hint: "Working hours and grace time" },
  { id: "TEAM", label: "Team", hint: "Admins and employees" },
  { id: "COMPLETED", label: "Done", hint: "Review and open workspace" },
];

/** Organizations saved at the retired BUSINESS step resume at their first branch. */
export const visibleStep = (step: OnboardingStep): OnboardingStep =>
  step === "BUSINESS" ? "BRANCH" : step;

export const stepIndex = (step: OnboardingStep) =>
  STEPS.findIndex((s) => s.id === visibleStep(step));

const COUNTRY_CODES = ["IN", "AE", "SA", "QA", "BD", "LK", "NP", "SG", "MY", "GB", "US", "CA", "AU"];
const countryNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
export const COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  name: countryNames?.of(code) ?? code,
}));

const SUPPORTED_TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York"];
  }
})();

/**
 * Time zones for a select, always including the current value. Browsers list some zones
 * under older canonical names (Chrome returns "Asia/Calcutta", not "Asia/Kolkata").
 */
export const timezoneOptions = (current: string) =>
  SUPPORTED_TIMEZONES.includes(current) ? SUPPORTED_TIMEZONES : [current, ...SUPPORTED_TIMEZONES];

export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
};

export const WEEKDAYS: { day: Weekday; short: string }[] = [
  { day: 1, short: "Mon" },
  { day: 2, short: "Tue" },
  { day: 3, short: "Wed" },
  { day: 4, short: "Thu" },
  { day: 5, short: "Fri" },
  { day: 6, short: "Sat" },
  { day: 7, short: "Sun" },
];
