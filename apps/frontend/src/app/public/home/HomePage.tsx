import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { landingPath } from "@/utils/auth-routing";
import { HomeNav } from "./components/home-nav";
import { Hero } from "./components/hero";
import { HowItWorks } from "./components/how-it-works";
import { Features } from "./components/features";
import { MultiBusiness } from "./components/multi-business";
import { Pricing } from "./components/pricing";
import { Faq } from "./components/faq";
import { ClosingCta } from "./components/closing-cta";
import { HomeFooter } from "./components/home-footer";
import { useReducedMotion } from "./hooks/use-reduced-motion";
import { PageRoot } from "./HomePage.style";

export function HomePage() {
  const { status, me, activeOrganization } = useAuth();
  const signedIn = Boolean(status === "authenticated" && me);
  // Signed-in visitors are sent to their workspace instead of the sign-up page.
  const workspacePath = me ? landingPath(me, activeOrganization) : "/login";
  const primaryPath = signedIn ? workspacePath : "/register";

  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.title = "Presqio · Selfie and GPS attendance for multi-branch businesses";
  }, []);

  // Glide to in-page anchors (How it works, Pricing …) while this page is open.
  useEffect(() => {
    if (reducedMotion) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = previous;
    };
  }, [reducedMotion]);

  return (
    <PageRoot>
      <HomeNav signedIn={signedIn} workspacePath={workspacePath} />
      <main>
        <Hero signedIn={signedIn} primaryPath={primaryPath} />
        <HowItWorks />
        <Features />
        <MultiBusiness signedIn={signedIn} primaryPath={primaryPath} />
        <Pricing />
        <Faq />
        <ClosingCta signedIn={signedIn} primaryPath={primaryPath} />
      </main>
      <HomeFooter />
    </PageRoot>
  );
}
