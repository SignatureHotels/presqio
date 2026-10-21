import { Link } from "react-router-dom";
import { Icon } from "@/components";
import { Eyebrow, Section, SectionIntro, SectionTitle } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { Flag, Lead, Limits, PlanCard, PlanGrid, PlanNote, Price } from "./Pricing.style";

// Mirrors the `plans` table (branch-based limits); prices are placeholders until pricing is final.
const plans = [
  {
    name: "Free",
    price: "₹0",
    note: "For a single location",
    limits: ["1 branch", "Up to 10 employees", "Selfie + GPS check-in"],
  },
  {
    name: "Starter",
    price: "₹999",
    note: "For a growing team",
    limits: ["Up to 3 branches", "Up to 50 employees", "Shifts, corrections and reports"],
  },
  {
    name: "Growth",
    price: "₹2,999",
    note: "For groups with many branches",
    limits: ["Up to 10 branches", "Up to 250 employees", "Attendance across branches"],
    featured: true,
  },
];

export function Pricing() {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  return (
    <Section id="pricing" ref={ref}>
      <SectionIntro data-reveal-children={state}>
        <Eyebrow style={stagger(0)}>Pricing</Eyebrow>
        <SectionTitle style={stagger(1)}>Simple plans per organization</SectionTitle>
        <Lead style={stagger(2)}>
          Monthly prices, excluding taxes. Every plan starts with a 14-day Growth trial.
        </Lead>
      </SectionIntro>
      <PlanGrid data-reveal-children={state}>
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.name}
            className="card"
            featured={plan.featured}
            style={stagger(index + 3)}
          >
            {plan.featured && <Flag>Most flexible</Flag>}
            <h3>{plan.name}</h3>
            <PlanNote>{plan.note}</PlanNote>
            <Price>
              {plan.price}
              <span>/month</span>
            </Price>
            <Limits>
              {plan.limits.map((limit) => (
                <li key={limit}>
                  <Icon name="check" className="tiny" />
                  {limit}
                </li>
              ))}
            </Limits>
            <Link className={`btn ${plan.featured ? "primary" : ""}`} to="/register">
              Start free trial
            </Link>
          </PlanCard>
        ))}
      </PlanGrid>
    </Section>
  );
}
