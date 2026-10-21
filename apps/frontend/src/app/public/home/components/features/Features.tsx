import { Icon } from "@/components";
import { Eyebrow, Section, SectionIntro, SectionTitle } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { Feature, FeatureGrid, FeatureIcon } from "./Features.style";

const features = [
  { icon: "map", title: "Branch perimeters", text: "Set a radius per branch and reject check-ins with poor GPS accuracy." },
  { icon: "camera", title: "Selfies for every punch", text: "Check-in and check-out photos are saved with attendance for admin review." },
  { icon: "clock", title: "Shifts and grace time", text: "Day, night and overnight shifts with grace periods and working days." },
  { icon: "check", title: "Corrections with approval", text: "Missed punches go through a reviewed request with a reason and audit trail." },
  { icon: "report", title: "Attendance grid and CSV", text: "Compare dates, in/out times, worked hours and selfies, and export attendance as CSV." },
  { icon: "shield", title: "Organization workspaces", text: "Owners and admins manage their organization's branches, employees and attendance." },
];

export function Features() {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  return (
    <Section id="features" ref={ref}>
      <SectionIntro data-reveal-children={state}>
        <Eyebrow style={stagger(0)}>Features</Eyebrow>
        <SectionTitle style={stagger(1)}>
          Everything a branch manager used to chase on paper
        </SectionTitle>
      </SectionIntro>
      <FeatureGrid data-reveal-children={state}>
        {features.map((feature, index) => (
          <Feature key={feature.title} style={stagger(index + 2)}>
            <FeatureIcon>
              <Icon name={feature.icon} />
            </FeatureIcon>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </Feature>
        ))}
      </FeatureGrid>
    </Section>
  );
}
