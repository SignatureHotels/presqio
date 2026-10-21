export type ReviewStatus = "Pending" | "Approved" | "Rejected";
export interface Approval {
  id: string;
  employeeId: string;
  type: string;
  submitted: string;
  reason: string;
  status: ReviewStatus;
  decisionReason?: string;
}

export interface DecideCorrectionRequest {
  decision: Exclude<ReviewStatus, "Pending">;
  reason: string;
}
