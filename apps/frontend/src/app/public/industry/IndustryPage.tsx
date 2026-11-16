import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Icon } from "@/components";
import { useAuth } from "@/hooks/use-auth";
import { landingPath } from "@/utils/auth-routing";
import { businessPreset } from "@/utils/business-types";
import { industryBySlug } from "../industries";
import { HomeNav } from "../home/components/home-nav";
import { HomeFooter } from "../home/components/home-footer";
import { ClosingCta } from "../home/components/closing-cta";
import { Feature, FeatureGrid, FeatureIcon } from "../home/components/features/Features.style";
import { FaqItem, FaqList } from "../home/components/faq/Faq.style";
import { Actions, Badge, HeroSection, Headline, Lead, Note } from "../home/components/hero/Hero.style";
import { Eyebrow, LargeAnchor, LargeLink, PageRoot, Section, SectionTitle } from "../home/HomePage.style";
import { Fixes, Setup } from "./IndustryPage.style";

const twelve = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const days = (list: number[]) =>
  list.length === 7 ? "every day" : list.length === 6 && !list.includes(7) ? "Mon–Sat" : list.length === 5 && list.every((d) => d <= 5) ? "Mon–Fri" : list.map((d) => DAYS[d - 1]).join(", ");

function setMeta(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.name = name; document.head.appendChild(tag); }
  tag.content = content;
}

/** /for/<slug>: Presqio for one kind of business, with the setup it starts with. */
export function IndustryPage() {
  const { slug } = useParams();
  const industry = industryBySlug(slug);
  const { status, me, activeOrganization } = useAuth();
  const signedIn = Boolean(status === "authenticated" && me);
  const workspacePath = me ? landingPath(me, activeOrganization) : "/login";

  useEffect(() => {
    if (!industry) return;
    document.title = `${industry.headline} · Presqio`;
    setMeta("description", industry.lead);
    window.scrollTo(0, 0);
  }, [industry]);

  if (!industry) return <Navigate to="/" replace />;
  const preset = businessPreset(industry.type);
  const trialPath = `/register?type=${industry.type}`;
  const primaryPath = signedIn ? workspacePath : trialPath;

  return (
    <PageRoot>
      <HomeNav signedIn={signedIn} workspacePath={workspacePath} away trialPath={trialPath} />
      <main>
        <HeroSection>
          <div>
            <Badge>Presqio for {industry.name.toLowerCase()}</Badge>
            <Headline>{industry.headline}</Headline>
            <Lead>{industry.lead}</Lead>
            <Actions>
              <LargeLink className="btn primary" to={primaryPath}>
                {signedIn ? "Open your workspace" : "Start 14-day free trial"}
                <Icon name="arrow" className="tiny" />
              </LargeLink>
              <LargeAnchor className="btn" href="#fit">See how it fits</LargeAnchor>
            </Actions>
            <Note>No card needed · Set up in minutes with the settings below</Note>
          </div>
          <Setup aria-label="What your workspace starts with">
            <span className="eyebrow">Your workspace starts with</span>
            <h2>Shifts</h2>
            <ul>
              {preset.shifts.map((s) => (
                <li key={s.name}><b>{s.name}</b><span>{twelve(s.start)}–{twelve(s.end)} · {days(s.workingDays)}</span></li>
              ))}
            </ul>
            <h2>Leave</h2>
            <ul>
              {preset.leaveTypes.map((l) => (
                <li key={l.name}><b>{l.name}</b><span>{l.paid ? `${l.daysPerYear ?? "No limit"}${l.daysPerYear ? " days a year" : ""}` : "Unpaid"}</span></li>
              ))}
            </ul>
            <p className="tip">{preset.tip}</p>
          </Setup>
        </HeroSection>

        <Section id="fit">
          <Eyebrow>What changes</Eyebrow>
          <SectionTitle>What gets easier</SectionTitle>
          <Fixes>
            {industry.pains.map((p) => (
              <article key={p.problem} className="card">
                <s>{p.problem}</s>
                <p><Icon name="check" className="tiny" /> {p.fix}</p>
              </article>
            ))}
          </Fixes>
        </Section>

        <Section>
          <Eyebrow>Made for {industry.name.toLowerCase()}</Eyebrow>
          <SectionTitle>The parts you'll use every day</SectionTitle>
          <FeatureGrid>
            {industry.highlights.map((h) => (
              <Feature key={h.title}>
                <FeatureIcon><Icon name={h.icon} /></FeatureIcon>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </Feature>
            ))}
            <Feature>
              <FeatureIcon><Icon name="user" /></FeatureIcon>
              <h3>English, हिंदी, తెలుగు</h3>
              <p>Your team uses the app and the kiosk in their own language.</p>
            </Feature>
            <Feature>
              <FeatureIcon><Icon name="shield" /></FeatureIcon>
              <h3>No background tracking</h3>
              <p>Location is read only at check-in and check-out, and selfies are seen only by your admins.</p>
            </Feature>
          </FeatureGrid>
        </Section>

        <Section>
          <Eyebrow>Questions</Eyebrow>
          <SectionTitle>What {industry.name.toLowerCase()} ask us</SectionTitle>
          <FaqList>
            {industry.faqs.map((f) => (
              <FaqItem key={f.q} className="card">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </FaqItem>
            ))}
          </FaqList>
        </Section>

        <ClosingCta signedIn={signedIn} primaryPath={primaryPath} />
      </main>
      <HomeFooter />
    </PageRoot>
  );
}
