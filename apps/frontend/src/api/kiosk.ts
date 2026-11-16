import type {
  CreateKioskRequest, KioskInfo, KioskLookupResponse, KioskPairing, KioskPairResponse, KioskPunchRequest, KioskPunchResponse, KioskRecord,
} from "@presqio/lib";
import { api, parse } from "./client";
import { API_BASE_URL as BASE } from "./config";
import { request } from "./request";

const KEY = "presqio.kiosk";

/** The device's kiosk token, kept on this device only (the server stores just its hash). */
export const kioskToken = {
  get(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  },
  set(token: string) {
    try { localStorage.setItem(KEY, token); } catch { /* private mode: paired for this tab only */ }
    memory = token;
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
    memory = null;
  },
};
let memory: string | null = null;

function call<T>(path: string, body?: unknown): Promise<T> {
  const token = kioskToken.get() ?? memory;
  return request(`${BASE}/kiosk${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body !== undefined && { "content-type": "application/json" }),
      ...(token && { "x-kiosk-token": token }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, (response) => parse<T>(response));
}

/** The shared check-in device. */
export const kioskApi = {
  pair: (code: string) => call<KioskPairResponse>("/pair", { code }),
  me: () => call<KioskInfo>("/me"),
  lookup: (employeeCode: string) => call<KioskLookupResponse>("/lookup", { employeeCode }),
  punch: (body: KioskPunchRequest) => call<KioskPunchResponse>("/punch", body),
};

const base = (o: string, b: string) => `/organizations/${o}/businesses/${b}/kiosks`;
/** Kiosk management (admin). */
export const kiosksAdminApi = {
  list: (o: string, b: string) => api<KioskRecord[]>(base(o, b)),
  create: (o: string, b: string, body: CreateKioskRequest) => api<KioskPairing>(base(o, b), { method: "POST", body }),
  repair: (o: string, b: string, id: string) => api<KioskPairing>(`${base(o, b)}/${id}/pairing`, { method: "POST" }),
  revoke: (o: string, b: string, id: string) => api<void>(`${base(o, b)}/${id}`, { method: "DELETE" }),
};
