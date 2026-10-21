-- Admin-managed employee details, and fast "recent activity" reads per organization.
ALTER TABLE "employees" ADD COLUMN "job_title" TEXT, ADD COLUMN "email" TEXT;
CREATE INDEX "audit_logs_organization_id_occurred_at_idx" ON "audit_logs"("organization_id", "occurred_at");
