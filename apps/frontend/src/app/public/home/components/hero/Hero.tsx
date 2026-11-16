import { Icon } from "@/components";
import { LargeAnchor, LargeLink } from "../../HomePage.style";
import { HeroPreview } from "../hero-preview";
import { Actions, Badge, HeroSection, Headline, Lead, Note } from "./Hero.style";

export function Hero({
  signedIn,
  primaryPath,
}: {
  signedIn: boolean;
  primaryPath: string;
}) {
  return (
    <HeroSection>
      <div>
        <Badge>Attendance, rosters and payroll</Badge>
        <Headline>
          Know who's at work, <em>wherever they work.</em>
        </Headline>
        <Lead>
          Shops, restaurants, clinics, factories, sites and field teams: every check-in has a live
          selfie and a GPS check at the workplace. Rosters, leave and payroll follow from it, from one
          branch to a hundred.
        </Lead>
        <Actions>
          <LargeLink className="btn primary" to={primaryPath}>
            {signedIn ? "Open your workspace" : "Start 14-day free trial"}
            <Icon name="arrow" className="tiny" />
          </LargeLink>
          <LargeAnchor className="btn" href="#how">
            See how it works
          </LargeAnchor>
        </Actions>
        <Note>No card needed · Works in any phone browser · English, हिंदी, తెలుగు</Note>
      </div>
      <HeroPreview />
    </HeroSection>
  );
}
