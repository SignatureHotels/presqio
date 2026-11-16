import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useActiveSection } from "../../hooks/use-active-section";
import { useScrollState } from "../../hooks/use-scroll-state";
import { Actions, LoginLink, NavBar, ProgressBar, SectionLinks } from "./HomeNav.style";

const sections = [
  { id: "how", label: "How it works" },
  { id: "industries", label: "Industries" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];
const sectionIds = sections.map((section) => section.id);

export function HomeNav({
  signedIn,
  workspacePath,
  away = false,
  trialPath = "/register",
}: {
  signedIn: boolean;
  workspacePath: string;
  /** On another page (an industry page): section links go back to the homepage. */
  away?: boolean;
  trialPath?: string;
}) {
  const { scrolled, progress } = useScrollState();
  const active = useActiveSection(sectionIds);
  return (
    <NavBar scrolled={scrolled}>
      <Link to="/" className="brand-wrap" aria-label="Presqio home">
        <img className="brand-logo" src="/logo.png" alt="Presqio" width={180} height={60} />
      </Link>
      <SectionLinks aria-label="Sections">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`${away ? "/" : ""}#${section.id}`}
            aria-current={active === section.id ? "true" : undefined}
          >
            {section.label}
          </a>
        ))}
      </SectionLinks>
      <Actions>
        {signedIn ? (
          <Link className="btn primary" to={workspacePath}>
            Open workspace
          </Link>
        ) : (
          <>
            <LoginLink to="/login">Log in</LoginLink>
            <Link className="btn primary" to={trialPath}>
              Start free trial
            </Link>
          </>
        )}
      </Actions>
      <ProgressBar aria-hidden="true" style={{ "--progress": progress } as CSSProperties} />
    </NavBar>
  );
}
