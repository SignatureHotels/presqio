import type { AttendanceAction } from "./attendance";

/** A shared check-in device at a branch entrance. */
export interface KioskRecord {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  /** PAIRING: waiting for its code to be entered on the device. */
  status: "PAIRING" | "ACTIVE" | "REVOKED";
  pairingExpiresAt: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}
export interface CreateKioskRequest {
  name: string;
  branchId: string;
}
/** A one-time code to enter on the device (shown once; only its hash is kept). */
export interface KioskPairing {
  kiosk: KioskRecord;
  code: string;
  expiresAt: string;
}

/** What the device shows about itself. */
export interface KioskInfo {
  name: string;
  branchName: string;
  organizationName: string;
  timezone: string;
  /** Start of this business's employee IDs, e.g. "SGH" for SGH0001. */
  employeeIdPrefix: string;
}
export interface KioskPairRequest {
  code: string;
}
export interface KioskPairResponse {
  /** Sent as the X-Kiosk-Token header on every kiosk request. */
  token: string;
  kiosk: KioskInfo;
}
export interface KioskLookupRequest {
  employeeCode: string;
}
export interface KioskLookupResponse {
  employeeCode: string;
  name: string;
  firstName: string;
  /** What a punch now would do. */
  action: AttendanceAction;
  /** Local HH:mm of today's open check-in, when checking out. */
  checkedInAt: string | null;
  /** Today's shift name(s), e.g. "Lunch + Dinner". */
  shift: string | null;
}
export interface KioskPunchRequest {
  employeeCode: string;
  action: AttendanceAction;
  /** Live selfie as a data URL (image/jpeg or image/webp). */
  photo: string;
  idempotencyKey: string;
}
export type KioskPunchResponse =
  | { accepted: true; action: AttendanceAction; time: string; name: string; earlyMinutes: number | null }
  | { accepted: false; message: string };
