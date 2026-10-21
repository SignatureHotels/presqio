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
        <Badge>Attendance for multi-branch teams</Badge>
        <Headline>
          Know who's on site, <em>at every branch.</em>
        </Headline>
        <Lead>
          Presqio checks each employee in with a fresh selfie and a GPS reading inside the
          branch perimeter. Run one hotel or a whole group of branches from one dashboard.
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
        <Note>No card needed · Works in any phone browser</Note>
      </div>
      <HeroPreview />
    </HeroSection>
  );
}
