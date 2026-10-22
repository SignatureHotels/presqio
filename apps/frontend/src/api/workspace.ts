import { businessApi, organizationsApi } from "./endpoints";

/** Use the business already returned at sign-in to avoid a serial network round trip. */
export async function fetchWorkspace(organizationId: string, knownBusinessId?: string) {
  const detailRequest = organizationsApi.get(organizationId);
  const businessId = knownBusinessId ?? (await detailRequest).defaultBusiness?.id;
  if (!businessId) throw new Error("This organization has no branch records yet.");
  const [organization, branches, shifts, employees, overview, approvals] = await Promise.all([
    detailRequest,
    businessApi.branches(organizationId, businessId),
    businessApi.shifts(organizationId, businessId),
    businessApi.employees(organizationId, businessId),
    businessApi.overview(organizationId, businessId),
    businessApi.corrections(organizationId, businessId),
  ]);
  return { organization, branches, shifts, employees, overview, approvals };
}
