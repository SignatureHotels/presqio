import { useState } from "react";
import type { Approval } from "@presqio/lib";
import { useAdmin } from "@/hooks/use-admin";
import { ApprovalQueue } from "./components/approval-queue";
import { ReviewDialog } from "./components/review-dialog";
export function ApprovalsPage() {
  const { scopedApprovals } = useAdmin();
  const [filter, setFilter] = useState("Pending");
  const [reviewing, setReviewing] = useState<Approval | null>(null);
  const filtered = scopedApprovals.filter(
    (approval) => filter === "all" || approval.status === filter,
  );
  return (
    <>
      <div className="controls-row">
        <select
          className="company-switch"
          aria-label="Filter requests"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All requests</option>
          {["Pending", "Approved", "Rejected"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <span className="muted sm">
          Every decision needs a reason and is kept in the audit trail. Original check-ins are never
          overwritten.
        </span>
      </div>
      <ApprovalQueue
        approvals={filtered}
        filter={filter}
        onReview={setReviewing}
      />
      {reviewing && (
        <ReviewDialog
          key={reviewing.id}
          approval={reviewing}
          onClose={() => setReviewing(null)}
        />
      )}
    </>
  );
}
