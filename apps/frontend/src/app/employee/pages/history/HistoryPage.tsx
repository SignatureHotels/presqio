import { useEffect, useState } from "react";
import type { AttendanceHistoryDay } from "@presqio/lib";
import { errorText, useT, type MessageKey } from "@/i18n";
import { employeeApi } from "@/api/employee-client";
import { StatusChip } from "@/components/status-chip";
import { MobileShell } from "../../components/mobile-shell";
import { earlyLabel, minutesLabel, shortMonth } from "../../utils/time";
import { DayList, DayRow, Empty, Stats } from "./HistoryPage.style";

export function HistoryPage() {
  const [days, setDays] = useState<AttendanceHistoryDay[] | null>(null);
  const [error, setError] = useState("");
  const t = useT();
  useEffect(() => {
    employeeApi.history().then(setDays).catch((caught) => setError(errorText(caught)));
  }, []);
  const distinctDays = new Set((days ?? []).map((d) => d.date)).size;
  const worked = (days ?? []).reduce((sum, d) => sum + (d.minutesWorked ?? 0), 0);
  return (
    <MobileShell title={t("history.title")} subtitle={t("history.subtitle")}>
      <Stats>
        <div>
          <small>{t("history.daysPresent")}</small>
          <b>{days ? distinctDays : "—"}</b>
        </div>
        <div>
          <small>{t("history.timeWorked")}</small>
          <b>{days ? minutesLabel(worked) : "—"}</b>
        </div>
      </Stats>
      {error && <Empty>{error}</Empty>}
      {days && days.length === 0 && <Empty>{t("history.empty")}</Empty>}
      <DayList>
        {(days ?? []).map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          return (
            <DayRow key={day.sessionId}>
              <div className="date">
                <strong>{date.getUTCDate()}</strong>
                <small>{shortMonth(day.date)}</small>
              </div>
              <div className="info">
                <strong>
                  {day.checkIn} – {day.checkOut ?? t("history.stillIn")}
                </strong>
                <small>
                  {day.branchName} · {minutesLabel(day.minutesWorked)}
                  {day.earlyMinutes ? ` · ${t("history.leftEarly", { duration: earlyLabel(day.earlyMinutes) })}` : ""}
                </small>
              </div>
              <StatusChip status={day.status} label={t(`status.${day.status}` as MessageKey)} />
            </DayRow>
          );
        })}
      </DayList>
    </MobileShell>
  );
}
