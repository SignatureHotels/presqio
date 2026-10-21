import { Icon, SectionHeader } from "@/components";
export function IntegrationStatus() {
  return (
    <section className="card card-pad">
      <SectionHeader
        title="Attendance & security"
        subtitle="Selfie evidence, recorded times and admin review"
      />
      <div className="policy-list">
        {[
          ["Admin sign-in, email verification & roles", "Live"],
          ["Branches, perimeters, shifts & employees", "Live"],
          ["Employee check-in app (selfie + GPS)", "Live"],
          ["Photo storage", "Database by default · private B2 storage supported when configured"],
          ["Attendance reporting", "Date grid, check-in/out selfies and CSV export"],
          ["Recorded attendance", "Date and time recorded by the server for each accepted in/out punch"],
        ].map(([title, status]) => (
          <div className="policy" key={title}>
            <div>
              <b>{title}</b>
              <p>{status}</p>
            </div>
            <Icon name="shield" />
          </div>
        ))}
      </div>
    </section>
  );
}
