-- Leave types (e.g. Casual leave: paid, 12 days a year; Unpaid leave) and the type of each leave day.
-- Existing leave days keep no type and behave as before (the admin decides how payroll treats them).
-- Holidays need no new table: a "calendars" row for a date with is_working_day = false is a holiday.
BEGIN;

CREATE TABLE "leave_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "days_per_year" INTEGER,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leave_types_name_length" CHECK (char_length("name") BETWEEN 2 AND 40),
    CONSTRAINT "leave_types_days_per_year" CHECK ("days_per_year" IS NULL OR "days_per_year" BETWEEN 0 AND 366)
);
CREATE UNIQUE INDEX "leave_types_business_id_id_key" ON "leave_types"("business_id", "id");
-- one active type per name in a business (an archived name can be used again)
CREATE UNIQUE INDEX "leave_types_one_active_name" ON "leave_types"("business_id", lower("name")) WHERE "archived_at" IS NULL;
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "leave_days" ADD COLUMN "leave_type_id" UUID;
-- same business only; a type in use can't be deleted (it is archived instead)
ALTER TABLE "leave_days" ADD CONSTRAINT "leave_days_business_id_leave_type_id_fkey"
    FOREIGN KEY ("business_id", "leave_type_id") REFERENCES "leave_types"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX "leave_days_business_id_leave_type_id_leave_date_idx" ON "leave_days"("business_id", "leave_type_id", "leave_date");

COMMIT;
