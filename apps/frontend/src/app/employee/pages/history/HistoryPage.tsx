import { useEffect, useState } from "react";
import type { AttendanceHistoryDay } from "@presqio/lib";
import { errorMessage } from "@/api/client";
import { employeeApi } from "@/api/employee-client";
import { StatusChip } from "@/components/status-chip";
import { MobileShell } from "../../components/mobile-shell";
import { earlyLabel, minutesLabel } from "../../utils/time";
import { DayList, DayRow, Empty, Stats } from "./HistoryPage.style";

export function HistoryPage() {
  const [days, setDays] = useState<AttendanceHistoryDay[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    employeeApi.history().then(setDays).catch((caught) => setError(errorMessage(caught)));
  }, []);
  const distinctDays = new Set((days ?? []).map((d) => d.date)).size;
  const worked = (days ?? []).reduce((sum, d) => sum + (d.minutesWorked ?? 0), 0);
  return (
    <MobileShell title="Attendance history" subtitle="Your last 45 days">
      <Stats>
        <div>
          <small>Days present</small>
          <b>{days ? distinctDays : "—"}</b>
        </div>
        <div>
          <small>Time worked</small>
          <b>{days ? minutesLabel(worked) : "—"}</b>
        </div>
      </Stats>
      {error && <Empty>{error}</Empty>}
      {days && days.length === 0 && <Empty>No check-ins yet. Your days will appear here.</Empty>}
      <DayList>
        {(days ?? []).map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          return (
            <DayRow key={day.sessionId}>
              <div className="date">
                <strong>{date.getUTCDate()}</strong>
                <small>{date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase()}</small>
              </div>
              <div className="info">
                <strong>
                  {day.checkIn} – {day.checkOut ?? "still checked in"}
                </strong>
                <small>
                  {day.branchName} · {minutesLabel(day.minutesWorked)}
                  {day.earlyMinutes ? ` · left ${earlyLabel(day.earlyMinutes)} early` : ""}
                </small>
              </div>
              <StatusChip status={day.status} />
            </DayRow>
          );
        })}
      </DayList>
    </MobileShell>
  );
}
