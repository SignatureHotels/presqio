import { ForbiddenException } from "@nestjs/common";

/** Branches a branch manager or viewer may see; null means every branch (owners and admins). */
export type BranchScope = string[] | null | undefined;

/** Prisma `where` for employees whose current branch is in scope. */
export const employeesInScope = (scope: BranchScope) =>
  scope ? { employee_branch_assignments_employee_id_rows: { some: { branch_id: { in: scope }, effective_to: null } } } : {};

export function assertBranchInScope(scope: BranchScope, branchId: string | null | undefined) {
  if (scope && (!branchId || !scope.includes(branchId)))
    throw new ForbiddenException("That branch isn't one of yours. Ask an admin.");
}
