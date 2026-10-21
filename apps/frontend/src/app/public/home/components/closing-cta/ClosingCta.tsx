import { LargeLink } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { CtaBand } from "./ClosingCta.style";

export function ClosingCta({
  signedIn,
  primaryPath,
}: {
  signedIn: boolean;
  primaryPath: string;
}) {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <CtaBand ref={ref} data-reveal-children={revealState(shown)}>
      <h2 style={stagger(0)}>Replace the attendance register this week.</h2>
      <LargeLink className="btn primary" to={primaryPath} style={stagger(1)}>
        {signedIn ? "Open workspace" : "Start free trial"}
      </LargeLink>
    </CtaBand>
  );
}
