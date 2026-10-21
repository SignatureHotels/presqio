import { useAdmin } from "@/hooks/use-admin";
import { SectionHeader, SelfieThumb } from "@/components";
import { CheckinList, CheckinRow, Punch } from "./TodaysCheckins.style";

const LIMIT = 8;

/** Who checked in today, with their check-in and check-out selfies. */
export function TodaysCheckins() {
  const { scopedEmployees, branches } = useAdmin();
  const checkedIn = scopedEmployees
    .filter((employee) => employee.checkIn)
    // Latest activity first.
    .sort((a, b) => (b.checkOut ?? b.checkIn!).localeCompare(a.checkOut ?? a.checkIn!));
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Today's check-ins"
        subtitle={`${checkedIn.length} checked in · selfies are kept for 60 days`}
      />
      {checkedIn.length === 0 && <p className="muted sm">Nobody has checked in yet today.</p>}
      <CheckinList>
        {checkedIn.slice(0, LIMIT).map((employee) => (
          <CheckinRow key={employee.id}>
            <div className="who">
              <strong>{employee.name}</strong>
              <small>{branches.find((branch) => branch.id === employee.branchId)?.name ?? "—"}</small>
              {employee.earlyMinutes ? (
                <span className="chip warning">Left {employee.earlyMinutes} min early</span>
              ) : employee.status === "Late" ? (
                <span className="chip warning">Late</span>
              ) : null}
            </div>
            <Punch>
              <SelfieThumb attemptId={employee.checkInPhotoAttemptId} label={`${employee.name} · check-in ${employee.checkIn}`} />
              <div>
                In
                <b>{employee.checkIn}</b>
              </div>
            </Punch>
            <Punch>
              <SelfieThumb attemptId={employee.checkOutPhotoAttemptId} label={`${employee.name} · check-out ${employee.checkOut}`} />
              <div>
                Out
                <b>{employee.checkOut ?? "—"}</b>
              </div>
            </Punch>
          </CheckinRow>
        ))}
      </CheckinList>
    </section>
  );
}
