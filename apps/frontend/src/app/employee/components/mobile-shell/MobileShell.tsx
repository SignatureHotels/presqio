import type { ReactNode } from "react";
import { useEmployeeSession } from "../../context/employee-session";
import { initials } from "@/utils/format";
import { BottomTabs } from "../bottom-tabs";
import { Body, Brand, Header, Initials, Title, TopRow } from "./MobileShell.style";

/** Page frame for signed-in employee screens: header, content and bottom tabs. */
export function MobileShell({
  title,
  subtitle,
  hero = false,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Dark green header with the first card overlapping it (home screen). */
  hero?: boolean;
  children: ReactNode;
}) {
  const { profile } = useEmployeeSession();
  return (
    <>
      <Header hero={hero}>
        <TopRow>
          <Brand>
            <img src="/fevicon-icon.png" alt="" width={36} height={36} />
            Presqio
          </Brand>
          {profile && <Initials aria-label={profile.name}>{initials(profile.name)}</Initials>}
        </TopRow>
        <Title>
          {subtitle && <p>{subtitle}</p>}
          <h1>{title}</h1>
        </Title>
      </Header>
      <Body overlap={hero}>{children}</Body>
      <BottomTabs />
    </>
  );
}
