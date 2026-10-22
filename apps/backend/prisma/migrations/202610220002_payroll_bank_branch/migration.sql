-- AlterTable
ALTER TABLE "employee_payroll_profiles" ADD COLUMN "bank_ifsc" TEXT NOT NULL DEFAULT '',
ADD COLUMN "bank_branch" TEXT NOT NULL DEFAULT '';
