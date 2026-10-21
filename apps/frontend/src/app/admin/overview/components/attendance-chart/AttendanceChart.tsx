import { useAdmin } from "@/hooks/use-admin";
import { SectionHeader } from "@/components";
import { shortDate } from "@/utils/dates";
import {
  AxisLabel,
  Bar,
  BarPair,
  ChartArea,
  ChartItem,
  Legend,
  LegendDot,
} from "./AttendanceChart.style";
export function AttendanceChart() {
  const { overview } = useAdmin();
  const days = overview?.days ?? [];
  const peak = Math.max(1, ...days.map((day) => day.scheduled));
  const range = days.length ? `${shortDate(days[0].date)}–${shortDate(days[days.length - 1].date)}` : "";
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Attendance overview"
        subtitle={`Scheduled and present across all branches · ${range}`}
        action={<span className="small-pill">Last 7 days</span>}
      />
      <ChartArea
        role="img"
        aria-label={`Scheduled and present employees, ${range}`}
      >
        {days.map((day) => (
          <ChartItem
            key={day.date}
            title={`${shortDate(day.date)}: ${day.present} present of ${day.scheduled} scheduled`}
          >
            <BarPair>
              <Bar kind="scheduled" style={{ height: `${(day.scheduled / peak) * 95}%` }} />
              <Bar kind="present" style={{ height: `${(day.present / peak) * 95}%` }} />
            </BarPair>
            <AxisLabel>{day.label}</AxisLabel>
          </ChartItem>
        ))}
      </ChartArea>
      <Legend>
        <span>
          <LegendDot style={{ background: "var(--chart-scheduled)" }} />
          Scheduled
        </span>
        <span>
          <LegendDot style={{ background: "var(--success)" }} />
          Present
        </span>
      </Legend>
    </section>
  );
}
