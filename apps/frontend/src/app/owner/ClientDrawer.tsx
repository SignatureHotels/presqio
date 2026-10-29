import { useEffect, useState } from "react";
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, TextField } from "@mui/material";
import type { OwnerClientDetail, OwnerPlan } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { ownerApi } from "@/api/owner";
import {
  ActionGrid,
  Bars,
  BarAxis,
  ContactLine,
  DrawerBody,
  DrawerHead,
  DrawerSection,
  Facts,
  Timeline,
} from "./OwnerPage.style";
import { addDays, ago, dateTime, daysUntil, endOfDayIso, rupees, shortDate, STATE_CHIP, STATE_LABEL, toDateInput } from "./owner-utils";

/** Everything about one client, and every action the owner can take on it. */
export function ClientDrawer({
  clientId,
  plans,
  onClose,
  onChanged,
}: {
  clientId: string | null;
  plans: OwnerPlan[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [client, setClient] = useState<OwnerClientDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [trialDate, setTrialDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [confirm, setConfirm] = useState<null | "suspend" | "cancel">(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!clientId) return;
    setClient(null);
    setError("");
    setNotice("");
    ownerApi.client(clientId).then(load, (e) => setError(errorMessage(e)));
  }, [clientId]);

  function load(detail: OwnerClientDetail) {
    setClient(detail);
    setTrialDate(toDateInput(detail.trialEndsAt ?? addDays(new Date(), 14)));
    setPaidDate(toDateInput(detail.paidUntil && new Date(detail.paidUntil) > new Date() ? detail.paidUntil : addDays(new Date(), 30)));
    setPlanCode(detail.plan?.code ?? "");
  }

  async function act(label: string, run: () => Promise<OwnerClientDetail | unknown>, done: string) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const result = await run();
      if (result && typeof result === "object" && "id" in result) load(result as OwnerClientDetail);
      setNotice(done);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }

  const id = client?.id ?? "";
  const today = toDateInput(new Date());
  const trialFrom = client?.trialEndsAt && new Date(client.trialEndsAt) > new Date() ? new Date(client.trialEndsAt) : new Date();
  const maxCheckins = Math.max(1, ...(client?.checkinsByDay.map((d) => d.count) ?? [1]));
  const trialLeft = daysUntil(client?.trialEndsAt ?? null);
  const plan = plans.find((p) => p.code === client?.plan?.code);

  return (
    <Drawer anchor="right" open={Boolean(clientId)} onClose={onClose}>
      <DrawerBody role="dialog" aria-label={client ? `Client ${client.name}` : "Client"}>
        <DrawerHead>
          <button className="close" onClick={onClose} aria-label="Close">×</button>
          {client ? (
            <>
              <span className={`chip ${STATE_CHIP[client.state]}`}>{STATE_LABEL[client.state]}</span>
              <h2>{client.name}</h2>
              <div className="sub">
                Joined {shortDate(client.createdAt)} · {client.plan?.name ?? "No plan"}
                {client.state === "TRIAL" || client.state === "TRIAL_ENDING"
                  ? ` · trial ends in ${trialLeft} day${trialLeft === 1 ? "" : "s"}`
                  : ""}
              </div>
            </>
          ) : (
            <h2>Loading client…</h2>
          )}
        </DrawerHead>

        {error && <Alert severity="error" sx={{ m: 2, mb: 0 }}>{error}</Alert>}
        {notice && <Alert severity="success" sx={{ m: 2, mb: 0 }}>{notice}</Alert>}
        {!client && !error && (
          <div style={{ display: "grid", placeItems: "center", padding: 60 }}><CircularProgress size={28} /></div>
        )}

        {client && (
          <>
            <DrawerSection>
              <h3>Owner</h3>
              {client.owner ? (
                <ContactLine>
                  <div className="row">
                    <strong>{client.owner.name}</strong>
                    <span className={`chip ${client.owner.emailVerified ? "success" : "warning"}`}>
                      {client.owner.emailVerified ? "Email verified" : "Not verified"}
                    </span>
                  </div>
                  <a href={`mailto:${client.owner.email}`}>{client.owner.email}</a>
                  {client.owner.phone && <a href={`tel:${client.owner.phone}`}>{client.owner.phone}</a>}
                  <span className="muted">Last sign-in: {ago(client.owner.lastLoginAt)}</span>
                </ContactLine>
              ) : (
                <span className="muted">No owner account.</span>
              )}
              {client.admins.length > 1 && (
                <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>
                  Other admins: {client.admins.slice(1).map((a) => `${a.name} (${a.email})`).join(", ")}
                </p>
              )}
            </DrawerSection>

            <DrawerSection>
              <h3>Usage</h3>
              <Facts>
                <div><dt>Businesses</dt><dd>{client.businesses}</dd></div>
                <div><dt>Branches</dt><dd>{client.branches}{plan?.maxBranches ? <span className="muted"> / {plan.maxBranches}</span> : null}</dd></div>
                <div><dt>Employees</dt><dd>{client.employees}{plan?.maxEmployees ? <span className="muted"> / {plan.maxEmployees}</span> : null}</dd></div>
                <div><dt>Check-ins (7 d)</dt><dd>{client.checkins7d}</dd></div>
                <div><dt>Payroll runs</dt><dd>{client.payrollRuns}</dd></div>
                <div><dt>Last active</dt><dd style={{ fontSize: 13 }}>{ago(client.lastActivityAt)}</dd></div>
              </Facts>
              <p className="muted" style={{ fontSize: 12, margin: "14px 0 8px" }}>Check-ins, last 14 days</p>
              <Bars height={70} aria-label="Check-ins per day for the last 14 days">
                {client.checkinsByDay.map((d) => (
                  <div
                    key={d.date}
                    className={`bar ${d.count ? "" : "zero"}`}
                    style={{ height: `${(d.count / maxCheckins) * 100}%` }}
                    data-tip={`${shortDate(d.date)}: ${d.count}`}
                  />
                ))}
              </Bars>
              <BarAxis><span>{shortDate(client.checkinsByDay[0]?.date ?? null)}</span><span>Today</span></BarAxis>
              {!client.onboardingDone && (
                <Alert severity="info" sx={{ mt: 1.5 }}>They haven't finished setting up their workspace yet.</Alert>
              )}
            </DrawerSection>

            <DrawerSection>
              <h3>Free trial</h3>
              <ActionGrid>
                <div className="hint">
                  {client.trialEndsAt ? `Currently ends ${shortDate(client.trialEndsAt)}.` : "No trial end date set."}{" "}
                  Pick a new end date on the calendar, or extend in one tap.
                </div>
                <div className="quick" role="group" aria-label="Extend the trial">
                  {[7, 14, 30].map((n) => (
                    <button key={n} type="button" onClick={() => setTrialDate(toDateInput(addDays(trialFrom, n)))}>+{n} days</button>
                  ))}
                </div>
                <div className="inline">
                  <div className="field">
                    <label htmlFor="trial-end">Trial ends on</label>
                    <input id="trial-end" type="date" min={today} value={trialDate} onChange={(e) => setTrialDate(e.target.value)} />
                  </div>
                  <button
                    className="btn primary"
                    disabled={!trialDate || Boolean(busy)}
                    onClick={() => act("trial", () => ownerApi.updateSubscription(id, { trialEndsAt: endOfDayIso(trialDate) }), `Free trial now runs until ${shortDate(endOfDayIso(trialDate))}.`)}
                  >
                    {busy === "trial" ? "Saving…" : "Set trial end"}
                  </button>
                </div>
              </ActionGrid>
            </DrawerSection>

            <DrawerSection>
              <h3>Plan & payment</h3>
              <ActionGrid>
                <div className="inline">
                  <div className="field">
                    <label htmlFor="plan">Plan</label>
                    <select id="plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                      {plans.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} · {p.monthlyPriceMinor ? `${rupees(p.monthlyPriceMinor)}/mo` : "₹0"} · {p.maxBranches ?? "unlimited"} branch{p.maxBranches === 1 ? "" : "es"} · {p.maxEmployees ?? "unlimited"} staff
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn"
                    disabled={!planCode || planCode === client.plan?.code || Boolean(busy)}
                    onClick={() => act("plan", () => ownerApi.updateSubscription(id, { planCode }), "Plan changed.")}
                  >
                    {busy === "plan" ? "Saving…" : "Change plan"}
                  </button>
                </div>
                <div className="divider" />
                <div className="hint">
                  {client.paidUntil ? `Paid until ${shortDate(client.paidUntil)}.` : "Not marked as paid yet."} Record a payment by choosing the date it covers.
                </div>
                <div className="inline">
                  <div className="field">
                    <label htmlFor="paid-until">Paid until</label>
                    <input id="paid-until" type="date" min={today} value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                  </div>
                  <button
                    className="btn primary"
                    disabled={!paidDate || Boolean(busy)}
                    onClick={() =>
                      act("paid", () => ownerApi.updateSubscription(id, { paidUntil: endOfDayIso(paidDate), planCode: planCode || undefined }), `Marked as paying until ${shortDate(endOfDayIso(paidDate))}.`)
                    }
                  >
                    {busy === "paid" ? "Saving…" : "Mark as paid"}
                  </button>
                </div>
                <div className="quick">
                  {client.subscriptionStatus !== "PAST_DUE" && client.subscriptionStatus !== "CANCELED" && (
                    <button type="button" onClick={() => act("due", () => ownerApi.updateSubscription(id, { status: "PAST_DUE" }), "Marked as payment due.")}>
                      Mark payment due
                    </button>
                  )}
                  {client.subscriptionStatus !== "CANCELED" && (
                    <button type="button" className="danger" onClick={() => setConfirm("cancel")}>Cancel subscription</button>
                  )}
                </div>
              </ActionGrid>
            </DrawerSection>

            <DrawerSection>
              <h3>Account</h3>
              <ActionGrid>
                {client.owner && !client.owner.emailVerified && (
                  <button
                    className="btn"
                    disabled={Boolean(busy)}
                    onClick={() => act("verify", () => ownerApi.resendVerification(id), `Verification email sent again to ${client.owner!.email}.`)}
                  >
                    {busy === "verify" ? "Sending…" : "Resend verification email"}
                  </button>
                )}
                {client.suspended ? (
                  <button className="btn primary" disabled={Boolean(busy)} onClick={() => act("reactivate", () => ownerApi.reactivate(id), "Workspace reactivated. They can sign in again.")}>
                    {busy === "reactivate" ? "Reactivating…" : "Reactivate workspace"}
                  </button>
                ) : (
                  <button className="btn danger" disabled={Boolean(busy)} onClick={() => setConfirm("suspend")}>Suspend workspace</button>
                )}
                <div className="hint">
                  Suspending blocks their admins and staff check-ins until you reactivate. Their data is kept.
                </div>
              </ActionGrid>
            </DrawerSection>

            <DrawerSection>
              <h3>Businesses & branches</h3>
              {client.businessesList.length === 0 && <span className="muted">No business set up yet.</span>}
              {client.businessesList.map((b) => (
                <div key={b.id} style={{ marginBottom: 12 }}>
                  <strong>{b.name}</strong>{" "}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {b.code}{b.industry ? ` · ${b.industry}` : ""} · {b.employees} employee{b.employees === 1 ? "" : "s"}
                  </span>
                  {b.address && <div className="muted" style={{ fontSize: 12 }}>{b.address}</div>}
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                    {b.branches.map((br) => (
                      <li key={br.id}>
                        {br.name}
                        {!br.active && <span className="chip neutral" style={{ marginLeft: 6 }}>inactive</span>}
                        {br.address && <span className="muted"> · {br.address}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </DrawerSection>

            <DrawerSection>
              <h3>Owner actions history</h3>
              {client.history.length === 0 ? (
                <span className="muted">No changes yet.</span>
              ) : (
                <Timeline>
                  {client.history.map((h) => (
                    <li key={h.at + h.action}>
                      <span className="dot" />
                      <div>{h.detail}<time dateTime={h.at}>{dateTime(h.at)}</time></div>
                    </li>
                  ))}
                </Timeline>
              )}
            </DrawerSection>
          </>
        )}
      </DrawerBody>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm === "suspend" ? `Suspend ${client?.name}?` : `Cancel ${client?.name}'s subscription?`}</DialogTitle>
        <DialogContent>
          <p style={{ marginTop: 0 }}>
            {confirm === "suspend"
              ? "Their admins can't open the workspace and staff can't check in until you reactivate it. Nothing is deleted."
              : "They keep using what they have, but can't add branches or employees until you set a new trial or payment."}
          </p>
          {confirm === "suspend" && (
            <TextField fullWidth size="small" label="Reason (optional, for your records)" value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
        </DialogContent>
        <DialogActions>
          <button className="btn" onClick={() => setConfirm(null)}>Keep as is</button>
          <button
            className="btn primary"
            onClick={() => {
              const which = confirm;
              setConfirm(null);
              if (which === "suspend")
                act("suspend", () => ownerApi.suspend(id, reason), "Workspace suspended.").then(() => setReason(""));
              else act("cancel", () => ownerApi.updateSubscription(id, { status: "CANCELED" }), "Subscription canceled.");
            }}
          >
            {confirm === "suspend" ? "Suspend" : "Cancel subscription"}
          </button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
