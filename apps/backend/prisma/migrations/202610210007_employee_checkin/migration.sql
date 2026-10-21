-- Employee check-in: GPS perimeter is the deciding check; the live selfie is kept as evidence.
-- Automatic face comparison is optional until a provider is chosen, but if a face check is
-- recorded for an attempt it must pass.
BEGIN;

CREATE TABLE "attendance_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_photos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_photos_size" CHECK ("size_bytes" > 0 AND "size_bytes" <= 600000),
    CONSTRAINT "attendance_photos_type" CHECK ("content_type" IN ('image/jpeg', 'image/webp'))
);
CREATE UNIQUE INDEX "attendance_photos_attempt_id_key" ON "attendance_photos"("attempt_id");
CREATE UNIQUE INDEX "attendance_photos_business_id_id_key" ON "attendance_photos"("business_id", "id");
CREATE INDEX "attendance_photos_business_id_employee_id_created_at_idx" ON "attendance_photos"("business_id", "employee_id", "created_at");
ALTER TABLE "attendance_photos" ADD CONSTRAINT "attendance_photos_business_id_attempt_id_fkey" FOREIGN KEY ("business_id", "attempt_id") REFERENCES "attendance_attempts"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "attendance_photos" ADD CONSTRAINT "attendance_photos_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "attendance_photos" ADD CONSTRAINT "attendance_photos_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE OR REPLACE FUNCTION validate_attendance_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  attempt attendance_attempts%ROWTYPE;
  attendance attendance_sessions%ROWTYPE;
BEGIN
  SELECT * INTO attempt FROM attendance_attempts WHERE id = NEW.attempt_id FOR UPDATE;
  SELECT * INTO attendance FROM attendance_sessions WHERE id = NEW.session_id FOR UPDATE;
  IF attempt.id IS NULL OR attendance.id IS NULL
    OR attempt.business_id <> NEW.business_id OR attempt.employee_id <> NEW.employee_id
    OR attempt.branch_id <> NEW.branch_id OR attempt.action <> NEW.type
    OR attendance.business_id <> NEW.business_id OR attendance.employee_id <> NEW.employee_id
    OR attendance.branch_id <> NEW.branch_id
    OR attempt.status <> 'CONSUMED' OR attempt.consumed_at IS NULL
    OR attempt.expires_at <= clock_timestamp()
    -- Server-checked GPS inside the branch perimeter.
    OR NOT EXISTS (SELECT 1 FROM location_checks WHERE attempt_id = attempt.id AND result = 'PASS')
    -- A live selfie captured for this attempt.
    OR NOT EXISTS (SELECT 1 FROM attendance_photos WHERE attempt_id = attempt.id)
    -- Optional automatic face comparison: when present it must pass.
    OR EXISTS (SELECT 1 FROM face_checks WHERE attempt_id = attempt.id AND result <> 'PASS')
  THEN
    RAISE EXCEPTION 'Attendance event requires a matching unexpired consumed attempt, a passing location check and a live photo';
  END IF;
  NEW.occurred_at := clock_timestamp();
  NEW.created_at := NEW.occurred_at;
  RETURN NEW;
END;
$$;

CREATE INDEX "attendance_sessions_business_id_employee_id_work_date_idx"
  ON "attendance_sessions"("business_id", "employee_id", "work_date");

COMMIT;
