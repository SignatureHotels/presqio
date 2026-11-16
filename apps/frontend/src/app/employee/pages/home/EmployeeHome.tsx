import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AttendanceHistoryDay, EmployeeScheduleDay, LeaveDay, Weekday } from "@presqio/lib";
import { employeeApi } from "@/api/employee-client";
import { Icon } from "@/components";
import { zoneLabel } from "@/utils/dates";
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

const LETTER = ["M", "T", "W", "T", "F", "S", "S"];

export function EmployeeHome() {
  const { profile, reload, signOut } = useEmployeeSession();
  const now = useNow();
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
  const [leaves, setLeaves] = useState<LeaveDay[]>([]);
  const [schedule, setSchedule] = useState<EmployeeScheduleDay[]>([]);

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
              ? `Checked in ${today.checkIn}`
              : today.state === "CHECKED_OUT"
                ? "Done for today"
                : today.onLeave
                  ? "On leave today"
                  : "Not checked in"}
          </StateChip>
        </StateRow>
        <Clock>{clockIn(timezone, now)}</Clock>
        <ClockSub>
          {zoneLabel(timezone)}
          {today.status === "Late" && " · You checked in late today"}
        </ClockSub>
        {today.state === "CHECKED_OUT" ? (
          <DoneNote>
            <strong>
              {today.checkIn} – {today.checkOut}
            </strong>
            {today.earlyMinutes
              ? `Checked out ${earlyLabel(today.earlyMinutes)} before your shift ended. It's recorded.`
              : "Thanks, your day is recorded."}
            <br />
            <Link to="/employee/check/in">Check in again</Link>
          </DoneNote>
        ) : (
          <>
            {today.onLeave && (
              <DoneNote>
                Enjoy your day off. If you come in after all, checking in cancels today's leave.
              </DoneNote>
            )}
            <PunchButton
              to={today.state === "CHECKED_IN" ? "/employee/check/out" : "/employee/check/in"}
              out={today.state === "CHECKED_IN"}
            >
              <Icon name={today.state === "CHECKED_IN" ? "logout" : "camera"} />
              {today.state === "CHECKED_IN" ? "Check out" : "Check in"}
            </PunchButton>
          </>
        )}
        <TrustRow>
          <span>
            <Icon name="map" className="tiny" /> Inside branch
          </span>
          <span>
            <Icon name="camera" className="tiny" /> Live selfie
          </span>
          <span>
            <Icon name="shield" className="tiny" /> Server-checked
          </span>
        </TrustRow>
      </PunchCard>
      {/* Shared phones: the next person signs out the previous one before checking in. */}
      <SwitchRow>
        Not {first}?{" "}
        <button type="button" onClick={() => void signOut()}>
          Switch employee
        </button>
      </SwitchRow>

      <Panel>
        <SectionRow>
          <h2>Today's shift</h2>
          {todayShifts.length > 0 && <span className="chip success">{todayShifts.map((s) => s.name).join(" + ")}</span>}
          {today.dayOff && <span className="chip">Day off</span>}
        </SectionRow>
        <Place>
          <span className="pin">
            <Icon name="pin" />
          </span>
          <div>
            <strong>{branch?.name ?? "No branch assigned"}</strong>
            <small>{branch?.address || "Ask your admin if this looks wrong"}</small>
          </div>
        </Place>
        {todayShifts.map((s) => (
          <Hours key={`${s.name}${s.start}`}>
            <div>
              <p>{todayShifts.length > 1 ? s.name.toUpperCase() : "START"}</p>
              <strong>{twelveHour(s.start)}</strong>
            </div>
            <div className="line">
              <Icon name="clock" className="tiny" />
            </div>
            <div className="end">
              <p>END{s.overnight ? " (NEXT DAY)" : ""}</p>
              <strong>{twelveHour(s.end)}</strong>
            </div>
          </Hours>
        ))}
        {!todayShifts.length && (
          <p className="muted sm">{today.dayOff ? "You're not rostered today. You can still check in if you're asked to come in." : "No shift assigned yet."}</p>
        )}
      </Panel>

      {upcoming.length > 0 && (
        <Panel>
          <SectionRow>
            <h2>Coming up</h2>
          </SectionRow>
          <Upcoming>
            {upcoming.map((day) => (
              <li key={day.date}>
                <span className="when">{dayTitle(day.date)}</span>
                <span className={day.off || day.holiday || day.onLeave ? "what off" : "what"}>
                  {day.onLeave ? "On leave"
                    : day.holiday ? day.holiday
                    : day.off ? "Day off"
                    : day.shifts.map((s) => `${s.name} ${twelveHour(s.start)}–${twelveHour(s.end)}`).join(" · ")}
                  {day.rostered && <small> · rostered</small>}
                </span>
              </li>
            ))}
          </Upcoming>
        </Panel>
      )}

      <Panel>
        <SectionRow>
          <h2>This week</h2>
          <Link to="/employee/history">View history →</Link>
        </SectionRow>
        <Week>
          {week.map((date, index) => {
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
                {LETTER[index]}
                <span>{Number(date.slice(8))}</span>
              </WeekDay>
            );
          })}
        </Week>
        <WeekFoot>
          <div>
            Days present
            <b>
              {daysPresent} / {daysScheduled || 0}
            </b>
          </div>
          {daysScheduled > 0 && daysPresent >= daysScheduled && (
            <span className="chip success">Perfect week so far ✨</span>
          )}
        </WeekFoot>
      </Panel>
    </MobileShell>
  );
}
