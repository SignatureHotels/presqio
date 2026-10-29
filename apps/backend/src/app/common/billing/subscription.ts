/** Fields the plan-limit checks read from `subscriptions`. */
export interface SubscriptionRow {
  status: string;
  trial_ends_at: Date | null;
  current_period_end: Date | null;
}

/**
 * Why an organization can't grow (add branches or employees), or null when it can.
 * Day-to-day use, including staff check-ins, is not blocked: only adding more is.
 * A missing date means "no end", so subscriptions created before dates were tracked keep working.
 */
export function subscriptionProblem(sub: SubscriptionRow | undefined, now = new Date()): string | null {
  if (!sub || sub.status === "CANCELED") return "This organization has no active subscription";
  if (sub.status === "TRIALING" && sub.trial_ends_at && sub.trial_ends_at < now)
    return "Your free trial has ended. Contact Presqio to continue adding branches and employees.";
  if (sub.status === "ACTIVE" && sub.current_period_end && sub.current_period_end < now)
    return "Your subscription has expired. Contact Presqio to renew.";
  return null;
}
