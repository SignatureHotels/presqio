import { Icon } from "@/components/icon";
import {
  StatCard,
  StatFooter,
  StatGrid,
  StatNumber,
  StatTop,
  type StatTone,
} from "./AttendanceSummary.style";

import type { EmployeeTableRow } from "@presqio/lib";
import { attendanceSummary } from "@/utils/attendance";

export function AttendanceSummary({
  employees,
}: {
  employees: EmployeeTableRow[];
}) {
  const summary = attendanceSummary(employees);
  return (
    <StatGrid>
      {(
        [
        {
          title: "Total employees",
          value: summary.total,
          note: "Across selected branches",
          icon: "users",
          color: "accent",
        },
        {
          title: "Present today",
          value: summary.present,
          note: `${summary.rate}% attendance · includes late`,
          icon: "check",
          color: "success",
        },
        {
          title: "Late arrivals",
          value: summary.late,
          note: "After the shift grace period",
          icon: "clock",
          color: "warning",
        },
        {
          title: "Not checked in",
          value: summary.waiting,
          note: "Awaiting attendance · not marked absent",
          icon: "calendar",
          color: "error",
        },
        ] satisfies { title: string; value: number; note: string; icon: string; color: StatTone }[]
      ).map((stat) => (
        <StatCard className="card" tone={stat.color} key={stat.title}>
          <StatTop>
            <span className="muted fw7 sm">{stat.title}</span>
            <span className={`stat-icon ${stat.color}`}>
              <Icon name={stat.icon} />
            </span>
          </StatTop>
          <StatNumber className="mono">{stat.value}</StatNumber>
          <StatFooter>
            <span>{stat.note}</span>
          </StatFooter>
        </StatCard>
      ))}
    </StatGrid>
  );
}
