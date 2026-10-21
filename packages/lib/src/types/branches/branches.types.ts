export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  maxAccuracy: number;
}
/** A saved branch with its active perimeter, as returned by the API. */
export interface BranchRecord extends Branch {
  code: string;
}
export interface CreateBranchRequest {
  name: string;
  /** Short branch code; suggested from the name when omitted. */
  code?: string;
  address?: string;
  latitude: number;
  longitude: number;
  /** Perimeter radius in metres. */
  radius: number;
  /** Reject GPS readings less accurate than this many metres. */
  maxAccuracy: number;
}
export type UpdateBranchRequest = Partial<CreateBranchRequest>;
