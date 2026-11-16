import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components";
import { INDUSTRIES } from "../../../industries";
import { Eyebrow, Section, SectionIntro, SectionTitle } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { FeatureIcon } from "../features/Features.style";
import { Chips, Panel } from "./Industries.style";

/** Pick your kind of business and see how Presqio fits it. */
export function Industries() {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  const [slug, setSlug] = useState(INDUSTRIES[0].slug);
  const industry = INDUSTRIES.find((i) => i.slug === slug) ?? INDUSTRIES[0];
  return (
    <Section id="industries" ref={ref}>
      <SectionIntro data-reveal-children={state}>
        <Eyebrow style={stagger(0)}>Built for your kind of business</Eyebrow>
        <SectionTitle style={stagger(1)}>Shops, kitchens, clinics, factories, sites and teams on the move</SectionTitle>
      </SectionIntro>
      <Chips role="tablist" aria-label="Kind of business">
        {INDUSTRIES.map((i) => (
          <button key={i.slug} type="button" role="tab" id={`tab-${i.slug}`} aria-selected={i.slug === slug} aria-controls="industry-panel"
            onClick={() => setSlug(i.slug)}>
            {i.name}
          </button>
        ))}
      </Chips>
      <Panel id="industry-panel" role="tabpanel" aria-labelledby={`tab-${industry.slug}`}>
        <div>
          <h3>{industry.headline}</h3>
          <p className="lead">{industry.lead}</p>
          <ul className="fixes">
            {industry.pains.map((p) => (
              <li key={p.problem}>
                <s>{p.problem}</s>
                <span>{p.fix}</span>
              </li>
            ))}
          </ul>
          <Link className="more link" to={`/for/${industry.slug}`}>
            Presqio for {industry.name.toLowerCase()} <Icon name="arrow" className="tiny" />
          </Link>
        </div>
        <div className="points">
          {industry.highlights.map((h) => (
            <div key={h.title}>
              <FeatureIcon><Icon name={h.icon} /></FeatureIcon>
              <h4>{h.title}</h4>
              <p>{h.text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </Section>
  );
}
