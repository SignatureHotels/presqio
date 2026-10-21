import type { ISODateTime } from "../common";
export interface HealthResponse {
  status: "ok";
  service: string;
  serverTime: ISODateTime;
}
export interface ReadinessResponse {
  status: "ok";
  database: "connected";
  schema: "available";
}
