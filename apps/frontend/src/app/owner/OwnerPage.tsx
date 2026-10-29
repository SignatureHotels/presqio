import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Skeleton } from "@mui/material";
import type { ClientState, OwnerClientList, OwnerOverview, OwnerPlan } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { ownerApi } from "@/api/owner";
import { Icon } from "@/components";
import { useAuth } from "@/hooks/use-auth";
import { ClientDrawer } from "./ClientDrawer";
import { DeleteClientDialog } from "./DeleteClientDialog";
import {
  BarAxis,
  Bars,
  Cards,
  ClientName,
  ConsoleTag,
  Empty,
  Hero,
  Kpi,
  KpiGrid,
  Main,
  Pager,
  Panel,
  Row,
  Search,
  Select,
  Shell,
  StateTabs,
  Table,
  TopBar,
  TopRight,
  Totals,
} from "./OwnerPage.style";
import { ago, daysUntil, initials, rupees, shortDate, STATE_CHIP, STATE_LABEL } from "./owner-utils";

const SORTS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["name", "Name A–Z"],
  ["activity", "Recently active"],
  ["employees", "Most employees"],
  ["trialEnd", "Trial ending soonest"],
] as const;

const TABS: (ClientState | "")[] = ["", "TRIAL", "TRIAL_ENDING", "TRIAL_EXPIRED", "PAYING", "PAYMENT_DUE", "CANCELED", "SUSPENDED"];

/** Presqio's own console: every client, their trial and plan, and the actions to manage them. */
export function OwnerPage() {
  const { me, logout } = useAuth();
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [plans, setPlans] = useState<OwnerPlan[]>([]);
  const [list, setList] = useState<OwnerClientList | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<ClientState | "">("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [loadingList, setLoadingList] = useState(true);

  const loadOverview = useCallback(() => {
    ownerApi.overview().then(setOverview, (e) => setError(errorMessage(e)));
  }, []);

  const loadList = useCallback(() => {
    setLoadingList(true);
    ownerApi
      .clients({ search: typed, state, sort, page })
      .then(setList, (e) => setError(errorMessage(e)))
      .finally(() => setLoadingList(false));
  }, [typed, state, sort, page]);

  useEffect(() => {
    loadOverview();
    ownerApi.plans().then(setPlans, () => undefined);
  }, [loadOverview]);

  useEffect(loadList, [loadList]);

  // wait for a pause in typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setTyped(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const refresh = useCallback(() => {
    loadOverview();
    loadList();
  }, [loadOverview, loadList]);

  const pickState = (s: ClientState | "") => {
    setState(s);
    setPage(1);
    document.getElementById("clients")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const maxSignups = useMemo(() => Math.max(1, ...(overview?.signups.map((d) => d.count) ?? [1])), [overview]);
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <Shell>
      <TopBar>
        <img className="brand-logo" src="/logo.png" alt="Presqio" width={102} height={34} />
        <ConsoleTag>Owner console</ConsoleTag>
        <TopRight>
          <span className="who">{me?.user.email}</span>
          {me && me.organizations.length > 0 && (
            <Link className="top-btn" to="/admin/overview"><Icon name="home" /><span>My workspace</span></Link>
          )}
          <button className="top-btn" onClick={refresh} aria-label="Refresh"><Icon name="refresh" /><span>Refresh</span></button>
          <button className="top-btn" onClick={() => void logout()}><Icon name="logout" /><span>Sign out</span></button>
        </TopRight>
      </TopBar>

      <Main>
        <Hero>
          <div>
            <span className="eyebrow">{hello}</span>
            <h1>Presqio clients</h1>
            <p>
              {overview
                ? `${overview.clients} business${overview.clients === 1 ? "" : "es"} have signed up · ${overview.newLast7Days} this week`
                : "Loading your clients…"}
            </p>
          </div>
        </Hero>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {overview ? (
          <KpiGrid>
            <Kpi tone="forest" active={state === ""} onClick={() => pickState("")}>
              <span className="label">All clients</span>
              <span className="value">{overview.clients}</span>
              <span className="note">+{overview.newLast30Days} in 30 days</span>
            </Kpi>
            <Kpi tone="primary" active={state === "TRIAL"} onClick={() => pickState("TRIAL")}>
              <span className="label">On free trial</span>
              <span className="value">{overview.byState.TRIAL + overview.byState.TRIAL_ENDING}</span>
              <span className="note">{overview.verifiedOwners} owners verified</span>
            </Kpi>
            <Kpi tone="warning" active={state === "TRIAL_ENDING"} onClick={() => pickState("TRIAL_ENDING")}>
              <span className="label">Trials ending ≤ 3 days</span>
              <span className="value">{overview.byState.TRIAL_ENDING}</span>
              <span className="note">Follow up now</span>
            </Kpi>
            <Kpi tone="success" active={state === "PAYING"} onClick={() => pickState("PAYING")}>
              <span className="label">Paying</span>
              <span className="value">{overview.byState.PAYING}</span>
              <span className="note">{rupees(overview.monthlyRevenueMinor)} / month</span>
            </Kpi>
            <Kpi tone="error" active={state === "TRIAL_EXPIRED"} onClick={() => pickState("TRIAL_EXPIRED")}>
              <span className="label">Trial expired</span>
              <span className="value">{overview.byState.TRIAL_EXPIRED}</span>
              <span className="note">{overview.byState.PAYMENT_DUE} payment due</span>
            </Kpi>
            <Kpi tone="error" active={state === "SUSPENDED"} onClick={() => pickState("SUSPENDED")}>
              <span className="label">Suspended</span>
              <span className="value">{overview.byState.SUSPENDED}</span>
              <span className="note">{overview.byState.CANCELED} canceled</span>
            </Kpi>
          </KpiGrid>
        ) : (
          <KpiGrid>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="rounded" height={108} />)}</KpiGrid>
        )}

        <Row>
          <Panel className="chart" aria-labelledby="signups-title">
            <div className="panel-head">
              <h2 id="signups-title">Sign-ups, last 30 days</h2>
              <span className="panel-note">{overview ? `${overview.newLast30Days} total` : ""}</span>
            </div>
            {overview ? (
              <>
                <Bars data-bars aria-label="Sign-ups per day">
                  {overview.signups.map((d) => (
                    <div
                      key={d.date}
                      className={`bar ${d.count ? "" : "zero"}`}
                      style={{ height: `${(d.count / maxSignups) * 100}%` }}
                      data-tip={`${shortDate(d.date)}: ${d.count}`}
                    />
                  ))}
                </Bars>
                <BarAxis><span>{shortDate(overview.signups[0]?.date ?? null)}</span><span>Today</span></BarAxis>
              </>
            ) : (
              <Skeleton variant="rounded" height={140} />
            )}
          </Panel>
          <Panel aria-labelledby="totals-title">
            <div className="panel-head"><h2 id="totals-title">Across all clients</h2></div>
            {overview ? (
              <Totals>
                <div><dt>Businesses</dt><dd>{overview.businesses}</dd></div>
                <div><dt>Branches</dt><dd>{overview.branches}</dd></div>
                <div><dt>Employees</dt><dd>{overview.employees.toLocaleString("en-IN")}</dd></div>
                <div><dt>Active today</dt><dd>{overview.activeToday}</dd></div>
                <div className="wide"><dt>Monthly revenue (list price)</dt><dd>{rupees(overview.monthlyRevenueMinor)}</dd></div>
              </Totals>
            ) : (
              <Skeleton variant="rounded" height={160} />
            )}
          </Panel>
        </Row>

        <Panel id="clients" style={{ marginTop: 16, scrollMarginTop: 80 }} aria-labelledby="clients-title">
          <div className="panel-head">
            <h2 id="clients-title">Clients</h2>
            <span className="panel-note">{list ? `${list.total} shown` : ""}</span>
          </div>
          {notice && (
            <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 1.5 }}>
              {notice}
            </Alert>
          )}

          <StateTabs role="tablist" aria-label="Filter by status">
            {TABS.map((s) => (
              <button key={s || "all"} role="tab" aria-selected={state === s} className={state === s ? "active" : ""} onClick={() => pickState(s)}>
                {s ? STATE_LABEL[s] : "All"}
                <span className="n">{overview ? (s ? overview.byState[s] : overview.clients) : "…"}</span>
              </button>
            ))}
          </StateTabs>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <Search>
              <Icon name="search" />
              <span className="sr-only">Search clients</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business, owner, email or phone…"
                autoComplete="off"
              />
            </Search>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <Select id="sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>

          {loadingList && !list ? (
            <Skeleton variant="rounded" height={320} />
          ) : list && list.clients.length === 0 ? (
            <Empty>
              <strong>No clients match</strong>
              {typed || state ? "Try another search or status." : "When businesses sign up, they appear here — and you get an email."}
            </Empty>
          ) : (
            list && (
              <>
                <Table aria-busy={loadingList}>
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th className="hide-laptop">Plan</th>
                      <th className="num">Branches</th>
                      <th className="num">Staff</th>
                      <th className="num hide-laptop">Check-ins 7d</th>
                      <th>Last active</th>
                      <th className="actions"><span className="sr-only">Delete</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.clients.map((c) => {
                      const left = daysUntil(c.trialEndsAt);
                      return (
                        <tr key={c.id} tabIndex={0} onClick={() => setSelected(c.id)} onKeyDown={(e) => e.key === "Enter" && setSelected(c.id)}>
                          <td>
                            <ClientName>
                              <span className="avatar">{initials(c.name)}</span>
                              <div><strong>{c.name}</strong><span>Joined {shortDate(c.createdAt)}</span></div>
                            </ClientName>
                          </td>
                          <td>
                            {c.owner ? (
                              <>
                                <div>{c.owner.name}</div>
                                <span className="muted" style={{ fontSize: 12 }}>
                                  {c.owner.email} {c.owner.emailVerified ? "✓" : "· unverified"}
                                </span>
                              </>
                            ) : "—"}
                          </td>
                          <td>
                            <span className={`chip ${STATE_CHIP[c.state]}`}>{STATE_LABEL[c.state]}</span>
                            {(c.state === "TRIAL" || c.state === "TRIAL_ENDING") && left !== null && (
                              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{left} day{left === 1 ? "" : "s"} left</div>
                            )}
                          </td>
                          <td className="hide-laptop">{c.plan?.name ?? "—"}</td>
                          <td className="num">{c.branches}</td>
                          <td className="num">{c.employees}</td>
                          <td className="num hide-laptop">{c.checkins7d}</td>
                          <td>{ago(c.lastActivityAt)}</td>
                          <td className="actions">
                            <button
                              className="row-delete"
                              title={`Delete ${c.name}`}
                              aria-label={`Delete ${c.name}`}
                              onClick={(e) => { e.stopPropagation(); setDeleting({ id: c.id, name: c.name }); }}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Icon name="trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>

                <Cards>
                  {list.clients.map((c) => (
                    <button key={c.id} onClick={() => setSelected(c.id)}>
                      <ClientName>
                        <span className="avatar">{initials(c.name)}</span>
                        <div><strong>{c.name}</strong><span>{c.owner?.email ?? "No owner"}</span></div>
                      </ClientName>
                      <div className="meta">
                        <span className={`chip ${STATE_CHIP[c.state]}`}>{STATE_LABEL[c.state]}</span>
                        <span>{c.branches} branches</span>
                        <span>{c.employees} staff</span>
                        <span>Active {ago(c.lastActivityAt)}</span>
                      </div>
                    </button>
                  ))}
                </Cards>

                {pages > 1 && (
                  <Pager>
                    <span>Page {list.page} of {pages}</span>
                    <div className="pages">
                      <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                      <button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
                    </div>
                  </Pager>
                )}
              </>
            )
          )}
        </Panel>
      </Main>

      <ClientDrawer
        clientId={selected}
        plans={plans}
        onClose={() => setSelected(null)}
        onChanged={refresh}
        onDelete={setDeleting}
      />
      <DeleteClientDialog
        client={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(result) => {
          setDeleting(null);
          setSelected(null);
          setNotice(
            `${result.name} was deleted: ${result.branches} branch${result.branches === 1 ? "" : "es"}, ` +
              `${result.employees} employee${result.employees === 1 ? "" : "s"} and all their records.`,
          );
          refresh();
        }}
      />
    </Shell>
  );
}
