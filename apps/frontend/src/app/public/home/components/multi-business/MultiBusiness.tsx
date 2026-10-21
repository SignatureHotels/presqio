import { Link } from "react-router-dom";
import { Eyebrow } from "../../HomePage.style";
import { revealState, stagger, useReveal } from "../../hooks/use-reveal";
import { Band, Copy, Tree, TreeChildren, TreeNode } from "./MultiBusiness.style";

// Example organization: one hotel group whose hotels are its branches.
const exampleBranches = [
  { name: "Hiwa Boutique", meta: "Branch · Medipalli" },
  { name: "Hotel Airport Zone", meta: "Branch" },
  { name: "Elite Hotel", meta: "Branch" },
];

export function MultiBusiness({
  signedIn,
  primaryPath,
}: {
  signedIn: boolean;
  primaryPath: string;
}) {
  const [ref, shown] = useReveal<HTMLElement>();
  const state = revealState(shown);
  return (
    <Band ref={ref}>
      <Copy data-reveal-children={state}>
        <Eyebrow light style={stagger(0)}>
          Built for groups
        </Eyebrow>
        <h2 style={stagger(1)}>One login for every branch you run</h2>
        <p style={stagger(2)}>
          Your organization is the whole group, and every hotel, shop or outlet is a branch
          with its own check-in perimeter, shifts and employees. Owners and admins review all their branches from one workspace.
        </p>
        <Link className="btn primary" to={primaryPath} style={stagger(3)}>
          {signedIn ? "Open workspace" : "Create your organization"}
        </Link>
      </Copy>
      <Tree aria-hidden="true">
        <TreeNode root data-reveal={state} style={stagger(2)}>
          Signature Group of Hotels
        </TreeNode>
        <TreeChildren data-reveal-children={state}>
          {exampleBranches.map((branch, index) => (
            <TreeNode key={branch.name} style={stagger(index + 4)}>
              <strong>{branch.name}</strong>
              <span>{branch.meta}</span>
            </TreeNode>
          ))}
        </TreeChildren>
      </Tree>
    </Band>
  );
}
