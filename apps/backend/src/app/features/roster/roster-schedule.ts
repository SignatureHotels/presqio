import type { Prisma, shifts } from "@prisma/client";
import type { DatabaseService } from "../../common/database/database.service";
import { dateOnly } from "../../common/time/zoned";

type Db = DatabaseService | Prisma.TransactionClient;
/** One person's rostered day: a day off, or the shifts worked (earliest first). */
export interface RosteredDay { off: boolean; shifts: shifts[] }

const day = (d: Date) => d.toISOString().slice(0, 10);
const startOf = (s: Pick<shifts, "starts_local">) => s.starts_local.getUTCHours() * 60 + s.starts_local.getUTCMinutes();
const endOf = (s: Pick<shifts, "ends_local">) => s.ends_local.getUTCHours() * 60 + s.ends_local.getUTCMinutes();

/** Rostered days by `${employeeId}:${YYYY-MM-DD}`; dates not on the roster are absent (usual shift). */
export async function rosterDays(db: Db, businessId: string, from: string, to: string, employeeIds?: string[]) {
  const rows = await db.roster_entries.findMany({
    where: { business_id: businessId, work_date: { gte: dateOnly(from), lte: dateOnly(to) }, ...(employeeIds && { employee_id: { in: employeeIds } }) },
    include: { shift_id_ref: true },
    orderBy: [{ work_date: "asc" }, { id: "asc" }],
  });
  return groupRoster(rows);
}

export function groupRoster(rows: { employee_id: string; work_date: Date; shift_id_ref: shifts | null }[]) {
  const days = new Map<string, RosteredDay>();
  for (const row of rows) {
    const key = `${row.employee_id}:${day(row.work_date)}`;
    const entry = days.get(key) ?? { off: false, shifts: [] };
    if (row.shift_id_ref) entry.shifts.push(row.shift_id_ref);
    else entry.off = true;
    days.set(key, entry);
  }
  for (const entry of days.values()) {
    entry.shifts.sort((a, b) => startOf(a) - startOf(b));
    if (entry.shifts.length) entry.off = false;
  }
  return days;
}

/**
 * Which of a day's shifts a check-in at `nowMinutes` (local) belongs to: the one under way, else the
 * next to start, else the last to end. On a split day a 17:05 check-in is the dinner shift, not lunch.
 */
export function pickShift<S extends Pick<shifts, "starts_local" | "ends_local" | "overnight">>(list: S[], nowMinutes: number): S | null {
  let best: S | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const s of list) {
    const start = startOf(s);
    const end = endOf(s) + (s.overnight || endOf(s) <= start ? 1440 : 0);
    // under way: 0; upcoming: minutes until it starts; ended: minutes since it ended (+ a day, so upcoming wins)
    const score = nowMinutes >= start && nowMinutes <= end ? 0 : nowMinutes < start ? start - nowMinutes : nowMinutes - end + 1440;
    if (score < bestScore) { best = s; bestScore = score; }
  }
  return best;
}

/** A person's plan for one date: the roster when set, otherwise the usual shift and weekly offs. */
export interface DayPlan { off: boolean; shifts: shifts[]; rostered: boolean }
export function dayPlan(rostered: RosteredDay | undefined, usual: { shift: shifts; workingDays: number[] } | null, weekday: number): DayPlan {
  if (rostered) return { off: rostered.off, shifts: rostered.shifts, rostered: true };
  if (!usual) return { off: false, shifts: [], rostered: false };
  const working = usual.workingDays.includes(weekday);
  return { off: !working, shifts: working ? [usual.shift] : [], rostered: false };
}

/** The usual working days of an assignment: its own weekly pattern, else the shift's. */
export function workingDaysOf(assignment: { weekly_pattern: unknown; shift_id_ref: { policy_json: unknown } }): number[] {
  if (Array.isArray(assignment.weekly_pattern)) return assignment.weekly_pattern as number[];
  return ((assignment.shift_id_ref.policy_json ?? {}) as { workingDays?: number[] }).workingDays ?? [1, 2, 3, 4, 5, 6];
}
