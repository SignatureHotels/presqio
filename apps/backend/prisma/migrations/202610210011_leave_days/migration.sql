-- Employees take leave for any day themselves (no approval). A cancelled leave is kept for the
-- record; at most one active leave per employee per day.
BEGIN;

CREATE TABLE "leave_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(3),
    CONSTRAINT "leave_days_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leave_days_reason_length" CHECK ("reason" IS NULL OR char_length("reason") <= 200)
);
CREATE UNIQUE INDEX "leave_days_business_id_id_key" ON "leave_days"("business_id", "id");
CREATE INDEX "leave_days_business_id_leave_date_idx" ON "leave_days"("business_id", "leave_date");
CREATE INDEX "leave_days_business_id_employee_id_leave_date_idx" ON "leave_days"("business_id", "employee_id", "leave_date");
CREATE UNIQUE INDEX "leave_days_one_active_per_day" ON "leave_days"("employee_id", "leave_date") WHERE "cancelled_at" IS NULL;
ALTER TABLE "leave_days" ADD CONSTRAINT "leave_days_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "leave_days" ADD CONSTRAINT "leave_days_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

COMMIT;
