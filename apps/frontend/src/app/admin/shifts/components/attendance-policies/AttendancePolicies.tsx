import { Icon, SectionHeader } from "@/components";
export function AttendancePolicies() {
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Attendance policies"
        subtitle="How every check-in is judged"
      />
      <div className="policy-list">
        {[
          [
            "Selfie evidence and server time",
            "Photo, date and time saved at both check-in and check-out",
            "camera",
          ],
          [
            "Onsite GPS validation",
            "Current employee assignment and branch perimeter",
            "map",
          ],
          [
            "Reviewed corrections",
            "Admin review of requested time changes to recorded sessions",
            "shield",
          ],
          [
            "Shift-based work date",
            "Check-out stays linked to the session opened at check-in",
            "calendar",
          ],
        ].map(([title, description, icon]) => (
          <div className="policy" key={title}>
            <div>
              <b>{title}</b>
              <p>{description}</p>
            </div>
            <Icon name={icon} />
          </div>
        ))}
      </div>
      <div className="inline-note">
        Assign a shift to each employee from their profile. GPS is checked on the server, and
        admins can review both in/out selfies and their recorded times in the attendance grid.
      </div>
    </section>
  );
}
