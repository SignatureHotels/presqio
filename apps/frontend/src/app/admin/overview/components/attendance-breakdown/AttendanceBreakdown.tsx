import { useAdmin } from "@/hooks/use-admin";
import { SectionHeader } from "@/components";
import { attendanceSummary } from "@/utils/attendance";
import { shortDate } from "@/utils/dates";
import {
  Donut,
  DonutBox,
  DonutInner,
  DonutNumber,
  LegendList,
  LegendRow,
} from "./AttendanceBreakdown.style";
export function AttendanceBreakdown() {
  const { scopedEmployees, today, branchFilter, branches } = useAdmin();
  const summary = attendanceSummary(scopedEmployees);
  const onTime = summary.present - summary.late;
  const percent = (value: number) =>
    summary.total ? (value / summary.total) * 100 : 0;
  const gradient = `conic-gradient(var(--success) 0% ${percent(onTime)}%, var(--warning) ${percent(onTime)}% ${percent(summary.present)}%, var(--primary) ${percent(summary.present)}% ${percent(summary.present + summary.leave)}%, var(--neutral-soft) ${percent(summary.present + summary.leave)}% 100%)`;
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Today's breakdown"
        subtitle={
          branchFilter === "all"
            ? "Across all branches"
            : (branches.find((branch) => branch.id === branchFilter)?.name ?? "")
        }
        action={today ? <span className="small-pill">{shortDate(today)}</span> : undefined}
      />
      <DonutBox>
        <Donut
          role="img"
          aria-label={`${summary.rate}% attendance; ${onTime} on time, ${summary.late} late, ${summary.leave} on leave, ${summary.waiting} not checked in`}
          style={{ background: gradient }}
        >
          <DonutInner>
            <DonutNumber>{summary.rate}%</DonutNumber>
            <span>Attendance rate</span>
          </DonutInner>
        </Donut>
      </DonutBox>
      <LegendList>
        {[
          ["On time", onTime, "var(--success)"],
          ["Late", summary.late, "var(--warning)"],
          ["On leave", summary.leave, "var(--primary)"],
          ["Not checked in", summary.waiting, "var(--neutral-soft)"],
        ].map(([label, value, color]) => (
          <LegendRow key={label}>
            <i className="dot" style={{ background: String(color) }} />
            {label}
            <b>{value}</b>
          </LegendRow>
        ))}
      </LegendList>
    </section>
  );
}
