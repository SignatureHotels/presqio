import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AttendanceHistoryDay, LeaveDay, Weekday } from "@presqio/lib";
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
} from "./EmployeeHome.style";

const LETTER = ["M", "T", "W", "T", "F", "S", "S"];

export function EmployeeHome() {
  const { profile, reload, signOut } = useEmployeeSession();
  const now = useNow();
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
  const [leaves, setLeaves] = useState<LeaveDay[]>([]);

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
  }, [reload]);

  if (!profile) return null;
  const { today, shift, branch, timezone } = profile;
  const first = profile.name.split(" ")[0];
  const present = new Set(history.map((day) => day.date));
  const onLeave = new Set(leaves.map((leave) => leave.date));
  const week = weekOf(today.date);
  const scheduled = (date: string) => {
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
          {shift && <span className="chip success">{shift.name}</span>}
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
        {shift ? (
          <Hours>
            <div>
              <p>START</p>
              <strong>{twelveHour(shift.start)}</strong>
            </div>
            <div className="line">
              <Icon name="clock" className="tiny" />
            </div>
            <div className="end">
              <p>END{shift.overnight ? " (NEXT DAY)" : ""}</p>
              <strong>{twelveHour(shift.end)}</strong>
            </div>
          </Hours>
        ) : (
          <p className="muted sm">No shift assigned yet.</p>
        )}
      </Panel>

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
