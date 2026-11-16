import { Icon } from "@/components";
import { Eyebrow, Section, SectionIntro, SectionTitle } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { Feature, FeatureGrid, FeatureIcon } from "./Features.style";

const features = [
  { icon: "camera", title: "Selfie and GPS check-in", text: "A live selfie inside the workplace perimeter for every check-in and check-out. No background tracking." },
  { icon: "calendar", title: "Rosters and rotations", text: "Split shifts, night shifts, weekly offs and rotations filled for weeks at once." },
  { icon: "users", title: "Kiosk for shared devices", text: "One tablet at the entrance: type your ID, take a selfie. No personal phone needed." },
  { icon: "map", title: "Many sites, or anywhere", text: "Staff who move between sites check in at any of theirs; field teams from anywhere." },
  { icon: "sun", title: "Leave and holidays", text: "Leave types with yearly allowances, and holidays that never count as absences." },
  { icon: "file", title: "Payroll from attendance", text: "Monthly, daily or hourly pay, overtime from check-ins, and payslips." },
  { icon: "shield", title: "Branch managers", text: "Invite managers who see only their branches, and viewers who can't change anything." },
  { icon: "check", title: "Corrections with approval", text: "Missed punches fixed through a reviewed request with a reason and audit trail." },
  { icon: "user", title: "In your team's language", text: "The employee app and kiosk work in English, Hindi and Telugu." },
];

export function Features() {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  return (
    <Section id="features" ref={ref}>
      <SectionIntro data-reveal-children={state}>
        <Eyebrow style={stagger(0)}>Features</Eyebrow>
        <SectionTitle style={stagger(1)}>
          Everything you used to chase on paper and WhatsApp
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
