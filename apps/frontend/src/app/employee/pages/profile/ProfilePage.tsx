import { Button } from "@mui/material";
import { useT } from "@/i18n";
import { LanguagePicker } from "@/i18n/LanguagePicker";
import { initials } from "@/utils/format";
import { longDate, zoneLabel } from "@/utils/dates";
import { useEmployeeSession } from "../../context/employee-session";
import { MobileShell } from "../../components/mobile-shell";
import { Panel } from "../../EmployeeApp.style";
import { twelveHour } from "../../utils/time";
import { Hero, Lines, Note } from "./ProfilePage.style";

export function ProfilePage() {
  const { profile, signOut } = useEmployeeSession();
  const t = useT();
  if (!profile) return null;
  const rows: [string, string][] = [
    [t("profile.organization"), profile.organizationName],
    [t("profile.department"), profile.department || "—"],
    [t("profile.joined"), profile.joinedOn ? longDate(profile.joinedOn) : "—"],
    [t("profile.branch"), profile.branch?.name ?? t("profile.notAssigned")],
    [
      t("profile.shift"),
      profile.shift
        ? `${twelveHour(profile.shift.start)} – ${twelveHour(profile.shift.end)}`
        : t("profile.notAssigned"),
    ],
    [t("profile.perimeter"), profile.branch ? t("profile.perimeterValue", { metres: profile.branch.radius }) : "—"],
    [t("profile.timezone"), zoneLabel(profile.timezone)],
    [t("profile.signIn"), t("profile.signInValue", { code: profile.code })],
    [t("profile.phone"), profile.phone || t("profile.notProvided")],
    [t("profile.email"), profile.email || t("profile.notProvided")],
    [t("profile.birth"), profile.dateOfBirth ? longDate(profile.dateOfBirth) : "—"],
  ];
  return (
    <MobileShell title={t("profile.title")} subtitle={t("profile.subtitle")}>
      <Panel>
        <strong style={{ display: "block", marginBottom: 8 }}>{t("lang.label")}</strong>
        <LanguagePicker />
      </Panel>
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
        {t("profile.signOut")}
      </Button>
      <Note>{t("profile.note")}</Note>
    </MobileShell>
  );
}
