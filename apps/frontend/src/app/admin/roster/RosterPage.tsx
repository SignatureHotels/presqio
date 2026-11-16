import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { RosterChange, RosterDay, RosterEmployee, RosterResponse, ShiftRecord } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { rosterApi } from "@/api/roster";
import { Icon, SectionHeader } from "@/components";
import { useAdmin } from "@/hooks/use-admin";
import { RosterRoot } from "./RosterPage.style";

const DAY_MS = 86_400_000;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const isoWeekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
const mondayOf = (date: string) => addDays(date, 1 - isoWeekday(date));
const label = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
const MAX_SPLIT = 3;

/** What a cell shows: the edit not yet saved, the roster, or the usual shift and weekly offs. */
type Plan = { off: boolean; shiftIds: string[]; rostered: boolean };
function planOf(employee: RosterEmployee, date: string, pending: Map<string, RosterDay | null>): Plan {
  const key = `${employee.id}:${date}`;
  const day = pending.has(key) ? pending.get(key) : employee.days[date];
  if (day) return { ...day, rostered: true };
  const working = !employee.workingDays || employee.workingDays.includes(isoWeekday(date) as never);
  return { off: !working, shiftIds: working && employee.usualShiftId ? [employee.usualShiftId] : [], rostered: false };
}

export function RosterPage() {
  const { organization, businessId, branches, today } = useAdmin();
  const organizationId = organization?.id ?? "";
  const [weekStart, setWeekStart] = useState(() => mondayOf(today ?? new Date().toISOString().slice(0, 10)));
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<RosterResponse | null>(null);
  const [pending, setPending] = useState(new Map<string, RosterDay | null>());
  const [menu, setMenu] = useState<{ anchor: HTMLElement; employee: RosterEmployee; date: string } | null>(null);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const weekEnd = addDays(weekStart, 6);

  const load = useCallback(async () => {
    if (!organizationId || !businessId) return;
    setError("");
    try {
      setData(await rosterApi.get(organizationId, businessId, weekStart, weekEnd, branchId || undefined));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [organizationId, businessId, weekStart, weekEnd, branchId]);
  useEffect(() => { void load(); }, [load]);

  const shiftsById = useMemo(() => new Map((data?.shifts ?? []).map((s) => [s.id, s])), [data]);

  function setDay(employee: RosterEmployee, date: string, day: RosterDay | null) {
    setPending((current) => {
      const next = new Map(current);
      const saved = employee.days[date] ?? null;
      // an edit that lands back on what's saved isn't a change
      if (JSON.stringify(day) === JSON.stringify(saved)) next.delete(`${employee.id}:${date}`);
      else next.set(`${employee.id}:${date}`, day);
      return next;
    });
  }

  function toggleShift(employee: RosterEmployee, date: string, shiftId: string) {
    const plan = planOf(employee, date, pending);
    const ids = plan.off ? [] : plan.shiftIds;
    const next = ids.includes(shiftId) ? ids.filter((id) => id !== shiftId) : [...ids, shiftId].slice(-MAX_SPLIT);
    setDay(employee, date, next.length ? { off: false, shiftIds: next } : { off: true, shiftIds: [] });
  }

  async function save(changes: RosterChange[], done: string) {
    if (!changes.length) return;
    setBusy(true); setError(""); setNotice("");
    try {
      for (let i = 0; i < changes.length; i += 2000)
        await rosterApi.save(organizationId, businessId, { changes: changes.slice(i, i + 2000) });
      setPending(new Map());
      setNotice(done);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const pendingChanges = (): RosterChange[] =>
    [...pending].map(([key, day]) => {
      const [employeeId, date] = key.split(":");
      return { employeeId, date, shiftIds: day?.shiftIds ?? [], off: day?.off ?? false };
    });

  /** Repeats last week's rostered days in this week (days that followed the usual shift stay as they are). */
  async function copyLastWeek() {
    setBusy(true); setError(""); setNotice("");
    try {
      const last = await rosterApi.get(organizationId, businessId, addDays(weekStart, -7), addDays(weekStart, -1), branchId || undefined);
      const next = new Map(pending);
      let copied = 0;
      for (const employee of last.employees)
        for (const [date, day] of Object.entries(employee.days)) {
          next.set(`${employee.id}:${addDays(date, 7)}`, day);
          copied++;
        }
      setPending(next);
      setNotice(copied ? `Copied ${copied} rostered day${copied === 1 ? "" : "s"} from last week. Review, then save.` : "Last week had nothing on the roster to copy.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const shiftLabel = (s: ShiftRecord) => `${s.name} ${s.start}–${s.end}`;
  const cellText = (plan: Plan) =>
    plan.off ? (plan.rostered ? "Day off" : "Weekly off")
      : plan.shiftIds.length ? plan.shiftIds.map((id) => shiftsById.get(id)?.name ?? "Shift").join(" + ")
      : "No shift";

  const leaving = pending.size > 0;
  useEffect(() => {
    if (!leaving) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [leaving]);
  const move = (days: number) => {
    if (pending.size && !window.confirm("Discard the changes you haven't saved?")) return;
    setPending(new Map());
    setWeekStart(addDays(weekStart, days));
  };

  const menuPlan = menu ? planOf(menu.employee, menu.date, pending) : null;

  return (
    <RosterRoot>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
      <section className="card card-pad">
        <SectionHeader
          title="Roster"
          subtitle="Who works which shift on each day. Days you don't set follow each person's usual shift and weekly offs."
        />
        <div className="toolbar">
          <Button size="small" onClick={() => move(-7)} aria-label="Previous week"><Icon name="back" className="tiny" /> Previous</Button>
          <strong>{label(weekStart, { day: "numeric", month: "short" })} – {label(weekEnd, { day: "numeric", month: "short", year: "numeric" })}</strong>
          <Button size="small" onClick={() => move(7)} aria-label="Next week">Next <Icon name="chevron" className="tiny" /></Button>
          {today && mondayOf(today) !== weekStart && <Button size="small" onClick={() => move((Date.parse(mondayOf(today)) - Date.parse(weekStart)) / DAY_MS)}>This week</Button>}
          <span className="spacer" />
          {branches.length > 1 && (
            <TextField select size="small" label="Branch" value={branchId} onChange={(e) => { setPending(new Map()); setBranchId(e.target.value); }} sx={{ minWidth: 160 }}>
              <MenuItem value="">All branches</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          )}
          <Button size="small" variant="outlined" disabled={busy || !data} onClick={() => void copyLastWeek()}>Copy last week</Button>
          <Button size="small" variant="outlined" disabled={busy || !data?.shifts.length || !data.employees.length} onClick={() => setRotating(true)}>Rotate…</Button>
          <Button size="small" variant="contained" disabled={busy || !pending.size}
            onClick={() => void save(pendingChanges(), `Saved ${pending.size} day${pending.size === 1 ? "" : "s"}.`)}>
            {busy ? "Saving…" : pending.size ? `Save ${pending.size} change${pending.size === 1 ? "" : "s"}` : "Saved"}
          </Button>
        </div>
      </section>

      <section className="card card-pad">
        {!data && !error && <p className="muted sm">Loading the roster…</p>}
        {data && !data.shifts.length && <Alert severity="info">Add shifts under Shifts & policies first; then you can put people on them here.</Alert>}
        {data && data.shifts.length > 0 && !data.employees.length && <p className="muted sm">No employees{branchId ? " at this branch" : ""} yet.</p>}
        {data && data.employees.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="roster">
                <thead>
                  <tr>
                    <th className="person">Employee</th>
                    {data.dates.map((date) => (
                      <th key={date} className={[data.holidays[date] ? "holiday" : "", date === today ? "today" : ""].join(" ")}>
                        {label(date, { weekday: "short" })} {label(date, { day: "numeric" })}
                        <small>{data.holidays[date] ?? (date === today ? "Today" : " ")}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((employee) => (
                    <tr key={employee.id}>
                      <th className="person" scope="row">
                        {employee.name}
                        <small>{employee.code}{employee.usualShiftId ? ` · usually ${shiftsById.get(employee.usualShiftId)?.name ?? ""}` : " · no usual shift"}</small>
                      </th>
                      {data.dates.map((date) => {
                        const plan = planOf(employee, date, pending);
                        const changed = pending.has(`${employee.id}:${date}`);
                        return (
                          <td key={date}>
                            <button
                              type="button"
                              className={["cell", plan.rostered ? "rostered" : "", plan.off ? "off" : "", changed ? "changed" : ""].join(" ")}
                              disabled={busy}
                              aria-label={`${employee.name}, ${label(date, { weekday: "long", day: "numeric", month: "long" })}: ${cellText(plan)}${plan.rostered ? "" : " (usual)"}. Change`}
                              onClick={(e) => setMenu({ anchor: e.currentTarget, employee, date })}
                            >
                              <span>{cellText(plan)}</span>
                              {!plan.off && plan.shiftIds.length > 0 && (
                                <small>{plan.shiftIds.map((id) => { const s = shiftsById.get(id); return s ? `${s.start}–${s.end}` : ""; }).join(", ")}</small>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="legend" style={{ marginTop: 10 }}>
              <span><b>Bold</b>: set on the roster</span>
              <span>Grey: the usual shift</span>
              <span>Two shifts on one day make a split day; each check-in counts towards the shift it falls in.</span>
            </div>
          </>
        )}
      </section>

      <Menu open={Boolean(menu)} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        {menu && menuPlan && [
          <MenuItem key="title" disabled dense>
            <ListItemText primary={menu.employee.name} secondary={label(menu.date, { weekday: "long", day: "numeric", month: "short" })} />
          </MenuItem>,
          ...(data?.shifts ?? []).map((s) => (
            <MenuItem key={s.id} dense onClick={() => toggleShift(menu.employee, menu.date, s.id)}>
              <ListItemIcon><Checkbox size="small" edge="start" checked={!menuPlan.off && menuPlan.shiftIds.includes(s.id)} tabIndex={-1} disableRipple /></ListItemIcon>
              <ListItemText primary={shiftLabel(s)} />
            </MenuItem>
          )),
          <Divider key="d" />,
          <MenuItem key="off" dense onClick={() => { setDay(menu.employee, menu.date, { off: true, shiftIds: [] }); setMenu(null); }}>Day off</MenuItem>,
          <MenuItem key="usual" dense onClick={() => { setDay(menu.employee, menu.date, null); setMenu(null); }}>
            Use the usual shift{menu.employee.usualShiftId ? ` (${shiftsById.get(menu.employee.usualShiftId)?.name ?? ""})` : ""}
          </MenuItem>,
          <MenuItem key="done" dense onClick={() => setMenu(null)}><b>Done</b></MenuItem>,
        ]}
      </Menu>

      {rotating && data && (
        <RotateDialog
          data={data}
          start={weekStart}
          busy={busy}
          onClose={() => setRotating(false)}
          onApply={async (changes, summary) => { await save(changes, summary); setRotating(false); }}
        />
      )}
    </RosterRoot>
  );
}

type Step = { shiftId: string; days: number };
const OFF = "off";

/**
 * Fills the roster from a repeating cycle: "Morning 6 days, off 1, Evening 6 days, off 1" or
 * "4 on, 2 off". Staggering starts each person at a different point, so shifts stay covered.
 */
function RotateDialog({ data, start, busy, onClose, onApply }: {
  data: RosterResponse; start: string; busy: boolean;
  onClose: () => void; onApply: (changes: RosterChange[], summary: string) => Promise<void>;
}) {
  const shifts = data.shifts;
  const [people, setPeople] = useState<string[]>(data.employees.map((e) => e.id));
  const [from, setFrom] = useState(start);
  const [weeks, setWeeks] = useState("4");
  const [steps, setSteps] = useState<Step[]>(() => weekly(shifts.slice(0, 3)));
  const [stagger, setStagger] = useState(shifts.length > 1);
  const [error, setError] = useState("");
  const cycle = steps.reduce((sum, s) => sum + s.days, 0);

  function weekly(list: ShiftRecord[]): Step[] {
    return list.flatMap((s) => [{ shiftId: s.id, days: 6 }, { shiftId: OFF, days: 1 }]);
  }
  const presets: { name: string; steps: Step[] }[] = [
    ...(shifts.length > 1 ? [{ name: `Weekly rotation (${shifts.slice(0, 3).map((s) => s.name).join(" → ")})`, steps: weekly(shifts.slice(0, 3)) }] : []),
    { name: `4 on, 2 off (${shifts[0].name})`, steps: [{ shiftId: shifts[0].id, days: 4 }, { shiftId: OFF, days: 2 }] },
    { name: `6 on, 1 off (${shifts[0].name})`, steps: [{ shiftId: shifts[0].id, days: 6 }, { shiftId: OFF, days: 1 }] },
    ...(shifts.length > 1 ? [{ name: `2 days, 2 nights, 4 off (${shifts[0].name} / ${shifts[shifts.length - 1].name})`,
      steps: [{ shiftId: shifts[0].id, days: 2 }, { shiftId: shifts[shifts.length - 1].id, days: 2 }, { shiftId: OFF, days: 4 }] }] : []),
  ];

  function build(): RosterChange[] {
    const total = Number(weeks) * 7;
    if (!Number.isInteger(total) || total < 7 || total > 56) throw new Error("Choose 1 to 8 weeks.");
    if (!people.length) throw new Error("Choose at least one person.");
    if (!steps.length || steps.some((s) => !Number.isInteger(s.days) || s.days < 1 || s.days > 28)) throw new Error("Each step needs 1 to 28 days.");
    if (people.length * total > 4000) throw new Error("That's too many days at once; rotate fewer people or fewer weeks.");
    // staggering starts people at the cycle's working steps (not its days off)
    const starts: number[] = [];
    let at = 0;
    for (const s of steps) { if (s.shiftId !== OFF) starts.push(at); at += s.days; }
    if (!starts.length) starts.push(0);
    return people.flatMap((employeeId, person) =>
      Array.from({ length: total }, (_, i) => {
        // staggered: person n starts at the cycle's n-th step
        const shift = stagger ? starts[person % starts.length] : 0;
        let pos = (i + shift) % cycle;
        const step = steps.find((s) => (pos -= s.days) < 0)!;
        return { employeeId, date: addDays(from, i), shiftIds: step.shiftId === OFF ? [] : [step.shiftId], off: step.shiftId === OFF };
      }));
  }

  async function apply() {
    setError("");
    try {
      const changes = build();
      await onApply(changes, `Rostered ${people.length} ${people.length === 1 ? "person" : "people"} for ${weeks} week${weeks === "1" ? "" : "s"} from ${label(from, { day: "numeric", month: "short" })}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorMessage(caught));
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Rotate shifts</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Repeat a cycle of shifts and days off. This replaces those people's roster for the chosen weeks.
          </Typography>
          <TextField select label="Start from a pattern" value="" onChange={(e) => { const p = presets[Number(e.target.value)]; if (p) setSteps(p.steps); }}>
            {presets.map((p, i) => <MenuItem key={p.name} value={i}>{p.name}</MenuItem>)}
          </TextField>
          <Stack spacing={1}>
            <Typography fontWeight={700}>Cycle ({cycle} day{cycle === 1 ? "" : "s"}, then it repeats)</Typography>
            {steps.map((step, i) => (
              <Stack direction="row" spacing={1} key={i} alignItems="center">
                <TextField select size="small" label="Shift" value={step.shiftId} sx={{ flex: 1 }}
                  onChange={(e) => setSteps(steps.map((s, j) => (j === i ? { ...s, shiftId: e.target.value } : s)))}>
                  {shifts.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</MenuItem>)}
                  <MenuItem value={OFF}>Day off</MenuItem>
                </TextField>
                <TextField size="small" type="number" label="Days" value={step.days} sx={{ width: 90 }}
                  slotProps={{ htmlInput: { min: 1, max: 28 } }}
                  onChange={(e) => setSteps(steps.map((s, j) => (j === i ? { ...s, days: Math.max(1, Math.min(28, Number(e.target.value) || 1)) } : s)))} />
                <Button size="small" disabled={steps.length === 1} onClick={() => setSteps(steps.filter((_, j) => j !== i))}>Remove</Button>
              </Stack>
            ))}
            <Button size="small" sx={{ alignSelf: "flex-start" }} disabled={steps.length >= 12}
              onClick={() => setSteps([...steps, { shiftId: shifts[0].id, days: 1 }])}>Add step</Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField type="date" label="Starting" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select label="For" value={weeks} onChange={(e) => setWeeks(e.target.value)} sx={{ width: 140 }}>
              {[1, 2, 3, 4, 6, 8].map((w) => <MenuItem key={w} value={String(w)}>{w} week{w === 1 ? "" : "s"}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField select label="People" value={people} slotProps={{ select: { multiple: true,
            renderValue: (ids) => (ids as string[]).length === data.employees.length ? `Everyone shown (${data.employees.length})` : `${(ids as string[]).length} people` } }}
            onChange={(e) => setPeople(typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as unknown as string[]))}>
            {data.employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.name} ({e.code})</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Checkbox checked={stagger} onChange={(e) => setStagger(e.target.checked)} />}
            label="Stagger people, so each starts at a different step and every shift stays covered" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" disabled={busy} onClick={() => void apply()}>{busy ? "Saving…" : "Fill roster"}</Button>
      </DialogActions>
    </Dialog>
  );
}
