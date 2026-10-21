import type { ShiftRecord } from "@presqio/lib";
import { useAdmin } from "@/hooks/use-admin";
import { Icon, SectionHeader } from "@/components";
import { zoneLabel } from "@/utils/dates";
import { paidHours } from "../../utils/shift-time";
import { OvernightTag } from "./ShiftTemplates.style";

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ShiftTemplates({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (shift: ShiftRecord) => void;
}) {
  const { shifts, employees, timezone } = useAdmin();
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Shifts"
        subtitle={`Working hours for your branches · ${zoneLabel(timezone)}`}
      />
      <div className="policy-list">
        {shifts.length === 0 && <p className="muted sm">No shifts yet.</p>}
        {shifts.map((shift) => {
          const assigned = employees.filter(
            (employee) => employee.shiftId === shift.id && employee.accountStatus !== "TERMINATED",
          ).length;
          return (
            <div className="policy" key={shift.id}>
              <div>
                <b>
                  {shift.name}
                  {shift.overnight && <OvernightTag>Overnight</OvernightTag>}
                </b>
                <p>
                  {shift.start}–{shift.end} · {shift.workingDays.map((d) => DAY[d]).join(", ")}
                </p>
                <p>
                  {shift.breakMinutes} min break · {shift.graceMinutes} min late grace ·{" "}
                  {assigned} {assigned === 1 ? "employee" : "employees"}
                </p>
              </div>
              <span className="chip accent">
                {paidHours(shift.start, shift.end, shift.breakMinutes).toFixed(1)} h paid
              </span>
              <button className="btn" aria-label={`Edit ${shift.name}`} onClick={() => onEdit(shift)}>
                Edit
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn primary section-action" onClick={() => onAdd()}>
        <Icon name="plus" />
        New shift
      </button>
    </section>
  );
}
