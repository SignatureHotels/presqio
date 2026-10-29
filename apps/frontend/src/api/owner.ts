import type {
  ClientState,
  DeletedClient,
  OwnerClientDetail,
  OwnerClientList,
  OwnerOverview,
  OwnerPlan,
  UpdateClientSubscriptionRequest,
} from "@presqio/lib";
import { api } from "./client";

export interface ClientQuery {
  search?: string;
  state?: ClientState | "";
  sort?: string;
  page?: number;
}

/** Presqio's owner console. The server answers 404 to anyone not in PLATFORM_OWNER_EMAILS. */
export const ownerApi = {
  overview: () => api<OwnerOverview>("/owner/overview"),
  plans: () => api<OwnerPlan[]>("/owner/plans"),
  clients: (query: ClientQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value));
    return api<OwnerClientList>(`/owner/clients?${params}`);
  },
  client: (id: string) => api<OwnerClientDetail>(`/owner/clients/${id}`),
  updateSubscription: (id: string, body: UpdateClientSubscriptionRequest) =>
    api<OwnerClientDetail>(`/owner/clients/${id}/subscription`, { method: "PATCH", body }),
  suspend: (id: string, reason: string) =>
    api<OwnerClientDetail>(`/owner/clients/${id}/suspend`, { method: "POST", body: { reason } }),
  reactivate: (id: string) => api<OwnerClientDetail>(`/owner/clients/${id}/reactivate`, { method: "POST" }),
  /** Permanent. `confirmName` must equal the business name. */
  deleteClient: (id: string, confirmName: string) =>
    api<DeletedClient>(`/owner/clients/${id}`, { method: "DELETE", body: { confirmName } }),
  resendVerification: (id: string) =>
    api<{ sent: boolean }>(`/owner/clients/${id}/resend-verification`, { method: "POST" }),
};
