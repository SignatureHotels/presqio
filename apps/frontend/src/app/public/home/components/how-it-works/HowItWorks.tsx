import { Eyebrow, Section, SectionIntro, SectionTitle } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { StepCard, StepList, StepNumber } from "./HowItWorks.style";

const steps = [
  {
    title: "Set up your organization",
    text: "Create your organization, add each branch, and draw its check-in perimeter on site.",
  },
  {
    title: "Add employees and shifts",
    text: "Assign people to a branch and shift. They sign in on their phone with just their employee ID.",
  },
  {
    title: "Employees check in from their phone",
    text: "A fresh selfie and GPS reading at the branch. Presqio records the time on the server, not the phone.",
  },
];

export function HowItWorks() {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  return (
    <Section id="how" ref={ref}>
      <SectionIntro data-reveal-children={state}>
        <Eyebrow style={stagger(0)}>How it works</Eyebrow>
        <SectionTitle style={stagger(1)}>Live in an afternoon</SectionTitle>
      </SectionIntro>
      <StepList data-reveal-children={state}>
        {steps.map((step, index) => (
          <StepCard key={step.title} className="card" style={stagger(index + 2)}>
            <StepNumber>{index + 1}</StepNumber>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </StepCard>
        ))}
      </StepList>
    </Section>
  );
}
