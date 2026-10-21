import { useState } from "react";
import type { BranchRecord } from "@presqio/lib";
import { Icon } from "@/components";
import { useAdmin } from "@/hooks/use-admin";
import { BranchCard } from "./components/branch-card";
import { BranchDialog } from "./components/branch-dialog";
import { PageActions } from "./BranchesPage.style";

export function BranchesPage() {
  const { scopedBranches, organization } = useAdmin();
  const [editing, setEditing] = useState<BranchRecord | "new" | null>(null);
  const limit = organization?.subscription?.limits.maxBranches ?? null;
  const total = scopedBranches.length;
  return (
    <>
      <PageActions>
        <span className="muted sm">
          {total} {total === 1 ? "branch" : "branches"}
          {limit !== null && ` · your plan allows ${limit}`}
        </span>
        <button className="btn primary" onClick={() => setEditing("new")}>
          <Icon name="plus" className="tiny" />
          Add branch
        </button>
      </PageActions>
      <div className="page-grid">
        {scopedBranches.map((branch) => (
          <BranchCard key={branch.id} branch={branch} onManage={setEditing} />
        ))}
      </div>
      {editing && (
        <BranchDialog
          key={editing === "new" ? "new" : editing.id}
          branch={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
