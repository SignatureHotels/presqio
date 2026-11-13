-- Staff who don't always work at their home branch:
--  * employee_sites: other branches an employee may also check in at (a security guard's client
--    sites, staff covering two shops). Check-out happens at the site the day was checked in at.
--  * employees.check_in_anywhere: no distance limit at all (work from home, field sales, home
--    visits). The selfie and the GPS reading are still required and kept.
-- The home branch (employee_branch_assignments) is unchanged.
BEGIN;

ALTER TABLE "employees" ADD COLUMN "check_in_anywhere" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "employee_sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_sites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_sites_business_id_id_key" ON "employee_sites"("business_id", "id");
CREATE UNIQUE INDEX "employee_sites_employee_id_branch_id_key" ON "employee_sites"("employee_id", "branch_id");
CREATE INDEX "employee_sites_business_id_employee_id_idx" ON "employee_sites"("business_id", "employee_id");
ALTER TABLE "employee_sites" ADD CONSTRAINT "employee_sites_business_id_employee_id_fkey"
    FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employee_sites" ADD CONSTRAINT "employee_sites_business_id_branch_id_fkey"
    FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employee_sites" ADD CONSTRAINT "employee_sites_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- an off-site check-in from anywhere may be away from every perimeter
ALTER TABLE "location_checks" ALTER COLUMN "geofence_id" DROP NOT NULL;

COMMIT;
