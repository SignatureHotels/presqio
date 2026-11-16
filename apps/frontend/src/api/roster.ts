import type { RosterResponse, SaveRosterRequest } from "@presqio/lib";
import { api } from "./client";

const base = (o: string, b: string) => `/organizations/${o}/businesses/${b}/roster`;

/** Who works which shift on which date (admin). */
export const rosterApi = {
  get: (o: string, b: string, from: string, to: string, branchId?: string) =>
    api<RosterResponse>(`${base(o, b)}?from=${from}&to=${to}${branchId ? `&branchId=${branchId}` : ""}`),
  save: (o: string, b: string, body: SaveRosterRequest) => api<{ saved: number }>(base(o, b), { method: "PUT", body }),
};
