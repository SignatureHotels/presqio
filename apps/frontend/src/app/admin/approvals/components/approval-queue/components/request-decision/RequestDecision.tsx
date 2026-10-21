import type { Approval } from "@presqio/lib";
import { StatusChip } from "@/components/status-chip";
export function RequestDecision({
  approval,
  name,
  onReview,
}: {
  approval: Approval;
  name: string;
  onReview: (approval: Approval) => void;
}) {
  return approval.status === "Pending" ? (
    <button
      className="btn"
      aria-label={`Review ${name}`}
      onClick={() => onReview(approval)}
    >
      Review
    </button>
  ) : (
    <StatusChip status={approval.status} />
  );
}
