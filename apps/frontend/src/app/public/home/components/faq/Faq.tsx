import { Eyebrow, Section, SectionIntro, SectionTitle } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { FaqItem, FaqList } from "./Faq.style";

const faqs = [
  {
    q: "Do employees need to install an app?",
    a: "No. Employees open Presqio in their phone's browser and can add it to the home screen. Admins use the desktop dashboard.",
  },
  {
    q: "Can one admin manage several branches?",
    a: "Yes. An organization can have as many branches as your plan allows. Owners and admins manage the branches from one workspace.",
  },
  {
    q: "What happens if an employee is outside the perimeter?",
    a: "The check-in is rejected with a clear reason, and nothing is marked absent yet. The register shows missing records, and admins can review correction requests for recorded sessions.",
  },
  {
    q: "Is location tracked all day?",
    a: "No. Location is read only at the moment of check-in or check-out. There is no background tracking.",
  },
  {
    q: "What if my staff don't have smartphones?",
    a: "Put a kiosk tablet at the entrance: staff type their employee ID and take a selfie. They can also sign in on a colleague's phone.",
  },
  {
    q: "Can I pay people by the day or the hour?",
    a: "Yes. Each person's salary can be monthly, daily or hourly, with overtime worked out from their check-ins.",
  },
  {
    q: "Can a manager see only their own branch?",
    a: "Yes. Invite them as a branch manager for the branches they run. They won't see payroll, settings or other branches.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "You choose a plan that fits your number of branches and employees. Your setup and records stay in place.",
  },
];

export function Faq() {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  return (
    <Section id="faq" ref={ref}>
      <SectionIntro data-reveal-children={state}>
        <Eyebrow style={stagger(0)}>FAQ</Eyebrow>
        <SectionTitle style={stagger(1)}>Questions owners ask us</SectionTitle>
      </SectionIntro>
      <FaqList data-reveal-children={state}>
        {faqs.map((faq, index) => (
          <FaqItem key={faq.q} className="card" style={stagger(index + 2)}>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </FaqItem>
        ))}
      </FaqList>
    </Section>
  );
}
