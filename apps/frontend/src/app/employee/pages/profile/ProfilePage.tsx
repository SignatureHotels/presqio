import { Button } from "@mui/material";
import { initials } from "@/utils/format";
import { zoneLabel } from "@/utils/dates";
import { useEmployeeSession } from "../../context/employee-session";
import { MobileShell } from "../../components/mobile-shell";
import { Panel } from "../../EmployeeApp.style";
import { twelveHour } from "../../utils/time";
import { Hero, Lines, Note } from "./ProfilePage.style";

export function ProfilePage() {
  const { profile, signOut } = useEmployeeSession();
  if (!profile) return null;
  const rows: [string, string][] = [
    ["Organization", profile.organizationName],
    ["Branch", profile.branch?.name ?? "Not assigned"],
    [
      "Shift",
      profile.shift
        ? `${twelveHour(profile.shift.start)} – ${twelveHour(profile.shift.end)}`
        : "Not assigned",
    ],
    ["Check-in perimeter", profile.branch ? `${profile.branch.radius} m around the branch` : "—"],
    ["Time zone", zoneLabel(profile.timezone)],
    ["Sign-in", `Employee ID ${profile.code}`],
  ];
  return (
    <MobileShell title="My profile" subtitle="Your workplace details">
      <Panel>
        <Hero>
          <span className="avatar">{initials(profile.name)}</span>
          <h2>{profile.name}</h2>
          <p>
            {profile.code}
            {profile.jobTitle && ` · ${profile.jobTitle}`}
          </p>
        </Hero>
      </Panel>
      <Panel>
        <Lines>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </Lines>
      </Panel>
      <Button variant="outlined" color="error" size="large" onClick={() => void signOut()}>
        Sign out
      </Button>
      <Note>
        Your location is read only when you check in or out, and your selfie is saved with that
        record under your workplace's privacy policy. Using someone else's phone? Sign out when you're
        done.
      </Note>
    </MobileShell>
  );
}
