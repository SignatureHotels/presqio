import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AttendanceHistoryDay, EmployeeScheduleDay, LeaveDay, Weekday } from "@presqio/lib";
import { employeeApi } from "@/api/employee-client";
import { Icon } from "@/components";
import { zoneLabel } from "@/utils/dates";
import { useT } from "@/i18n";
import { useEmployeeSession } from "../../context/employee-session";
import { MobileShell } from "../../components/mobile-shell";
import { Panel, SectionRow } from "../../EmployeeApp.style";
import {
  clockIn,
  dayTitle,
  earlyLabel,
  greeting,
  twelveHour,
  useNow,
  weekOf,
  weekdayLetter,
} from "../../utils/time";
import {
  Clock,
  ClockSub,
  DoneNote,
  Hours,
  Place,
  PunchButton,
  PunchCard,
  StateChip,
  StateRow,
  TrustRow,
  Week,
  WeekDay,
  WeekFoot,
  SwitchRow,
  Upcoming,
} from "./EmployeeHome.style";

export function EmployeeHome() {
  const { profile, reload, signOut } = useEmployeeSession();
  const now = useNow();
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
  const [leaves, setLeaves] = useState<LeaveDay[]>([]);
  const [schedule, setSchedule] = useState<EmployeeScheduleDay[]>([]);
  const t = useT();

  useEffect(() => {
    void reload();
    employeeApi
      .history()
      .then(setHistory)
      .catch(() => undefined);
    employeeApi
      .leaves()
      .then(setLeaves)
      .catch(() => undefined);
    employeeApi
      .schedule()
      .then(setSchedule)
      .catch(() => undefined);
  }, [reload]);

  if (!profile) return null;
  const { today, shift, branch, timezone } = profile;
  const first = profile.name.split(" ")[0];
  // Today's shifts from the roster (two on a split day); older servers send only the usual shift.
  const todayShifts = today.shifts ?? (shift ? [shift] : []);
  const upcoming = schedule.filter((day) => day.date > today.date).slice(0, 6);
  const present = new Set(history.map((day) => day.date));
  const onLeave = new Set(leaves.map((leave) => leave.date));
  const week = weekOf(today.date);
  const planned = new Map(schedule.map((day) => [day.date, day]));
  const scheduled = (date: string) => {
    const day = planned.get(date);
    if (day) return !day.off && !day.holiday;
    const weekday = (((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1) as Weekday;
    return shift ? shift.workingDays.includes(weekday) : true;
  };
  const daysPresent = week.filter((date) => present.has(date)).length;
  const daysScheduled = week.filter(
    (date) => date <= today.date && scheduled(date) && (!onLeave.has(date) || present.has(date)),
  ).length;
  const tone =
    today.state === "CHECKED_IN"
      ? "in"
      : today.state === "CHECKED_OUT"
        ? "done"
        : today.onLeave
          ? "leave"
          : "idle";

  return (
    <MobileShell hero subtitle={`${greeting(timezone, now)},`} title={`${first} 👋`}>
      <PunchCard aria-live="polite">
        <StateRow>
          <span>{dayTitle(today.date)}</span>
          <StateChip tone={tone}>
            {today.state === "CHECKED_IN"
              ? t("home.checkedInAt", { time: today.checkIn ?? "" })
              : today.state === "CHECKED_OUT"
                ? t("home.doneToday")
                : today.onLeave
                  ? t("home.onLeaveToday")
                  : today.dayOff
                    ? t("home.dayOff")
                    : t("home.notCheckedIn")}
          </StateChip>
        </StateRow>
        <Clock>{clockIn(timezone, now)}</Clock>
        <ClockSub>
          {zoneLabel(timezone)}
          {today.status === "Late" && ` · ${t("home.lateToday")}`}
        </ClockSub>
        {today.state === "CHECKED_OUT" ? (
          <DoneNote>
            <strong>
              {today.checkIn} – {today.checkOut}
            </strong>
            {today.earlyMinutes
              ? t("home.earlyOut", { duration: earlyLabel(today.earlyMinutes) })
              : t("home.thanks")}
            <br />
            <Link to="/employee/check/in">{t("home.checkInAgain")}</Link>
          </DoneNote>
        ) : (
          <>
            {today.onLeave && (
              <DoneNote>
                {t("home.enjoyLeave")}
              </DoneNote>
            )}
            <PunchButton
              to={today.state === "CHECKED_IN" ? "/employee/check/out" : "/employee/check/in"}
              out={today.state === "CHECKED_IN"}
            >
              <Icon name={today.state === "CHECKED_IN" ? "logout" : "camera"} />
              {today.state === "CHECKED_IN" ? t("action.checkOut") : t("action.checkIn")}
            </PunchButton>
          </>
        )}
        <TrustRow>
          <span>
            <Icon name="map" className="tiny" /> {t("home.trustInside")}
          </span>
          <span>
            <Icon name="camera" className="tiny" /> {t("home.trustSelfie")}
          </span>
          <span>
            <Icon name="shield" className="tiny" /> {t("home.trustServer")}
          </span>
        </TrustRow>
      </PunchCard>
      {/* Shared phones: the next person signs out the previous one before checking in. */}
      <SwitchRow>
        {t("home.notYou", { name: first })}{" "}
        <button type="button" onClick={() => void signOut()}>
          {t("home.switch")}
        </button>
      </SwitchRow>

      <Panel>
        <SectionRow>
          <h2>{t("home.todayShift")}</h2>
          {todayShifts.length > 0 && <span className="chip success">{todayShifts.map((s) => s.name).join(" + ")}</span>}
          {today.dayOff && <span className="chip">{t("home.dayOff")}</span>}
        </SectionRow>
        <Place>
          <span className="pin">
            <Icon name="pin" />
          </span>
          <div>
            <strong>{branch?.name ?? t("home.noBranch")}</strong>
            <small>{branch?.address || t("home.branchHelp")}</small>
          </div>
        </Place>
        {todayShifts.map((s) => (
          <Hours key={`${s.name}${s.start}`}>
            <div>
              <p>{todayShifts.length > 1 ? s.name.toUpperCase() : t("home.start")}</p>
              <strong>{twelveHour(s.start)}</strong>
            </div>
            <div className="line">
              <Icon name="clock" className="tiny" />
            </div>
            <div className="end">
              <p>{t("home.end")}{s.overnight ? ` ${t("home.nextDay")}` : ""}</p>
              <strong>{twelveHour(s.end)}</strong>
            </div>
          </Hours>
        ))}
        {!todayShifts.length && (
          <p className="muted sm">{today.dayOff ? t("home.notRostered") : t("home.noShift")}</p>
        )}
      </Panel>

      {upcoming.length > 0 && (
        <Panel>
          <SectionRow>
            <h2>{t("home.comingUp")}</h2>
          </SectionRow>
          <Upcoming>
            {upcoming.map((day) => (
              <li key={day.date}>
                <span className="when">{dayTitle(day.date)}</span>
                <span className={day.off || day.holiday || day.onLeave ? "what off" : "what"}>
                  {day.onLeave ? t("home.onLeave")
                    : day.holiday ? day.holiday
                    : day.off ? t("home.dayOff")
                    : day.shifts.map((s) => `${s.name} ${twelveHour(s.start)}–${twelveHour(s.end)}`).join(" · ")}
                  {day.rostered && <small> · {t("home.rostered")}</small>}
                </span>
              </li>
            ))}
          </Upcoming>
        </Panel>
      )}

      <Panel>
        <SectionRow>
          <h2>{t("home.thisWeek")}</h2>
          <Link to="/employee/history">{t("home.viewHistory")}</Link>
        </SectionRow>
        <Week>
          {week.map((date) => {
            const kind = present.has(date)
              ? "present"
              : onLeave.has(date)
                ? "leave"
                : date === today.date
                  ? "today"
                  : !scheduled(date)
                    ? "off"
                    : date < today.date
                      ? "missed"
                      : "future";
            return (
              <WeekDay key={date} kind={kind}>
                {weekdayLetter(date)}
                <span>{Number(date.slice(8))}</span>
              </WeekDay>
            );
          })}
        </Week>
        <WeekFoot>
          <div>
            {t("home.daysPresent")}
            <b>
              {daysPresent} / {daysScheduled || 0}
            </b>
          </div>
          {daysScheduled > 0 && daysPresent >= daysScheduled && (
            <span className="chip success">{t("home.perfectWeek")}</span>
          )}
        </WeekFoot>
      </Panel>
    </MobileShell>
  );
}
