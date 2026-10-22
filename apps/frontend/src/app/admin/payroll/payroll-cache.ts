import type { PayrollRun, PayrollRunSummary, PayrollSetup } from '@presqio/lib';

/** Data younger than this is shown without refetching when the payroll page is reopened. */
export const PAYROLL_FRESH_MS = 60_000;

interface Workspace {
  setup?: PayrollSetup; runs?: PayrollRunSummary[]; setupAt?: number;
  months: Map<string, { run: PayrollRun; at: number }>;
}
const store = new Map<string, Workspace>();

/**
 * Payroll data kept between visits (per organization and business), so leaving the page and coming back
 * shows the last result immediately and only revalidates when it is stale.
 */
export function payrollCache(organizationId: string, businessId: string): Workspace {
  const key = `${organizationId}:${businessId}`;
  let workspace = store.get(key);
  if (!workspace) store.set(key, (workspace = { months: new Map() }));
  return workspace;
}
export const isFresh = (at: number | undefined) => at !== undefined && Date.now() - at < PAYROLL_FRESH_MS;

let version = 0;
/** Changes whenever payroll details are saved, so open views know to reload them. */
export const payrollVersion = () => version;

/** Call after changing salaries or employee payroll details elsewhere, so payroll is reloaded on its next visit. */
export function invalidatePayroll() {
  store.clear();
  version++;
}
