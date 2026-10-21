BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('GROUP_OWNER');

-- CreateEnum
CREATE TYPE "BusinessRole" AS ENUM ('BUSINESS_ADMIN', 'BRANCH_MANAGER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AttendanceAction" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('INITIATED', 'CAPTURING', 'VERIFYING', 'APPROVED', 'CONSUMED', 'RETRYABLE_FAILURE', 'REVIEW_REQUIRED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('PASS', 'RETRY', 'REVIEW_REQUIRED', 'FAIL');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'GROUP_OWNER',

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "BusinessRole" NOT NULL,
    "scope_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'PENDING',
    "joined_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "issued_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "device_metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "center" geography(Point,4326) NOT NULL,
    "radius_m" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "max_accuracy_m" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "active_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_to" TIMESTAMPTZ(3),

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_branch_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(3),

    CONSTRAINT "employee_branch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_local" TIME(0) NOT NULL,
    "ends_local" TIME(0) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "grace_min" INTEGER NOT NULL DEFAULT 10,
    "break_min" INTEGER NOT NULL DEFAULT 0,
    "overnight" BOOLEAN NOT NULL DEFAULT false,
    "policy_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "weekly_pattern" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "calendar_date" DATE NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT false,
    "policy_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "image_object_key" TEXT NOT NULL,
    "provider_version" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMPTZ(3),

    CONSTRAINT "face_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "action" "AttendanceAction" NOT NULL,
    "challenge_nonce_hash" TEXT NOT NULL,
    "liveness_session_id" TEXT,
    "status" "AttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "idempotency_key" TEXT NOT NULL,
    "policy_snapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "attendance_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "liveness_score" DOUBLE PRECISION,
    "similarity_score" DOUBLE PRECISION,
    "provider" TEXT NOT NULL DEFAULT 'AWS_REKOGNITION',
    "result" "VerificationResult" NOT NULL,
    "reason" TEXT,
    "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "reported_lat" DOUBLE PRECISION NOT NULL,
    "reported_lon" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION NOT NULL,
    "client_position_timestamp" TIMESTAMPTZ(3) NOT NULL,
    "distance_m" DOUBLE PRECISION,
    "geofence_id" UUID NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "reason" TEXT,
    "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "shift_assignment_id" UUID,
    "work_date" DATE NOT NULL,
    "opened_at" TIMESTAMPTZ(3) NOT NULL,
    "closed_at" TIMESTAMPTZ(3),
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "minutes_worked_cached" INTEGER,
    "shift_snapshot" JSONB NOT NULL DEFAULT '{}',
    "branch_snapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "AttendanceAction" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "requested_in" TIMESTAMPTZ(3),
    "requested_out" TIMESTAMPTZ(3),
    "reason" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "correction_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "decision" "ReviewStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "correction_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "approved_in" TIMESTAMPTZ(3),
    "approved_out" TIMESTAMPTZ(3),
    "approved_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "business_id" UUID,
    "actor_id" UUID,
    "object_type" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "filters_json" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "output_object_key" TEXT,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_notices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_acknowledgements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "cutoff_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "retention_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_code_key" ON "businesses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_group_id_id_key" ON "businesses"("group_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "group_memberships_group_id_user_id_key" ON "group_memberships"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_business_id_user_id_role_key" ON "business_memberships"("business_id", "user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_business_id_id_key" ON "business_memberships"("business_id", "id");

-- CreateIndex
CREATE INDEX "employees_business_id_status_idx" ON "employees"("business_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_business_id_employee_code_key" ON "employees"("business_id", "employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_business_id_user_id_key" ON "employees"("business_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_business_id_id_key" ON "employees"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_key" ON "credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "activation_tokens_token_hash_key" ON "activation_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "activation_tokens_business_id_id_key" ON "activation_tokens"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "branches_business_id_code_key" ON "branches"("business_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "branches_business_id_id_key" ON "branches"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "geofences_business_id_id_key" ON "geofences"("business_id", "id");

-- CreateIndex
CREATE INDEX "employee_branch_assignments_business_id_employee_id_effecti_idx" ON "employee_branch_assignments"("business_id", "employee_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "employee_branch_assignments_business_id_id_key" ON "employee_branch_assignments"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_business_id_id_key" ON "shifts"("business_id", "id");

-- CreateIndex
CREATE INDEX "shift_assignments_business_id_employee_id_effective_from_idx" ON "shift_assignments"("business_id", "employee_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_business_id_id_key" ON "shift_assignments"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "calendars_business_id_calendar_date_key" ON "calendars"("business_id", "calendar_date");

-- CreateIndex
CREATE UNIQUE INDEX "calendars_business_id_id_key" ON "calendars"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "face_enrollments_business_id_id_key" ON "face_enrollments"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_attempts_challenge_nonce_hash_key" ON "attendance_attempts"("challenge_nonce_hash");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_attempts_liveness_session_id_key" ON "attendance_attempts"("liveness_session_id");

-- CreateIndex
CREATE INDEX "attendance_attempts_employee_id_issued_at_idx" ON "attendance_attempts"("employee_id", "issued_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_attempts_business_id_employee_id_idempotency_key_key" ON "attendance_attempts"("business_id", "employee_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_attempts_business_id_id_key" ON "attendance_attempts"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "face_checks_attempt_id_key" ON "face_checks"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "face_checks_business_id_id_key" ON "face_checks"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "location_checks_attempt_id_key" ON "location_checks"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_checks_business_id_id_key" ON "location_checks"("business_id", "id");

-- CreateIndex
CREATE INDEX "attendance_sessions_business_id_work_date_branch_id_idx" ON "attendance_sessions"("business_id", "work_date", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_business_id_id_key" ON "attendance_sessions"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_attempt_id_key" ON "attendance_events"("attempt_id");

-- CreateIndex
CREATE INDEX "attendance_events_business_id_employee_id_occurred_at_idx" ON "attendance_events"("business_id", "employee_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_business_id_id_key" ON "attendance_events"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_corrections_business_id_id_key" ON "attendance_corrections"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_business_id_correction_id_reviewer_id_key" ON "approvals"("business_id", "correction_id", "reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_business_id_id_key" ON "approvals"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_adjustments_correction_id_key" ON "attendance_adjustments"("correction_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_adjustments_business_id_id_key" ON "attendance_adjustments"("business_id", "id");

-- CreateIndex
CREATE INDEX "audit_logs_business_id_occurred_at_idx" ON "audit_logs"("business_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_jobs_business_id_id_key" ON "report_jobs"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_notices_business_id_version_key" ON "privacy_notices"("business_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_notices_business_id_id_key" ON "privacy_notices"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_acknowledgements_business_id_employee_id_notice_id_key" ON "privacy_acknowledgements"("business_id", "employee_id", "notice_id");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_acknowledgements_business_id_id_key" ON "privacy_acknowledgements"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "retention_jobs_business_id_id_key" ON "retention_jobs"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_jobs_business_id_id_key" ON "notification_jobs"("business_id", "id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "activation_tokens" ADD CONSTRAINT "activation_tokens_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "activation_tokens" ADD CONSTRAINT "activation_tokens_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "activation_tokens" ADD CONSTRAINT "activation_tokens_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "employee_branch_assignments" ADD CONSTRAINT "employee_branch_assignments_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "employee_branch_assignments" ADD CONSTRAINT "employee_branch_assignments_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "employee_branch_assignments" ADD CONSTRAINT "employee_branch_assignments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_business_id_shift_id_fkey" FOREIGN KEY ("business_id", "shift_id") REFERENCES "shifts"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "face_enrollments" ADD CONSTRAINT "face_enrollments_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "face_enrollments" ADD CONSTRAINT "face_enrollments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "face_enrollments" ADD CONSTRAINT "face_enrollments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "face_checks" ADD CONSTRAINT "face_checks_business_id_attempt_id_fkey" FOREIGN KEY ("business_id", "attempt_id") REFERENCES "attendance_attempts"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "face_checks" ADD CONSTRAINT "face_checks_business_id_enrollment_id_fkey" FOREIGN KEY ("business_id", "enrollment_id") REFERENCES "face_enrollments"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "face_checks" ADD CONSTRAINT "face_checks_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "location_checks" ADD CONSTRAINT "location_checks_business_id_attempt_id_fkey" FOREIGN KEY ("business_id", "attempt_id") REFERENCES "attendance_attempts"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "location_checks" ADD CONSTRAINT "location_checks_business_id_geofence_id_fkey" FOREIGN KEY ("business_id", "geofence_id") REFERENCES "geofences"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "location_checks" ADD CONSTRAINT "location_checks_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_business_id_shift_assignment_id_fkey" FOREIGN KEY ("business_id", "shift_assignment_id") REFERENCES "shift_assignments"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_business_id_session_id_fkey" FOREIGN KEY ("business_id", "session_id") REFERENCES "attendance_sessions"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_business_id_attempt_id_fkey" FOREIGN KEY ("business_id", "attempt_id") REFERENCES "attendance_attempts"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_business_id_session_id_fkey" FOREIGN KEY ("business_id", "session_id") REFERENCES "attendance_sessions"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_business_id_correction_id_fkey" FOREIGN KEY ("business_id", "correction_id") REFERENCES "attendance_corrections"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_business_id_correction_id_fkey" FOREIGN KEY ("business_id", "correction_id") REFERENCES "attendance_corrections"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_business_id_session_id_fkey" FOREIGN KEY ("business_id", "session_id") REFERENCES "attendance_sessions"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_group_id_business_id_fkey" FOREIGN KEY ("group_id", "business_id") REFERENCES "businesses"("group_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "privacy_notices" ADD CONSTRAINT "privacy_notices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "privacy_acknowledgements" ADD CONSTRAINT "privacy_acknowledgements_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "privacy_acknowledgements" ADD CONSTRAINT "privacy_acknowledgements_business_id_notice_id_fkey" FOREIGN KEY ("business_id", "notice_id") REFERENCES "privacy_notices"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "privacy_acknowledgements" ADD CONSTRAINT "privacy_acknowledgements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "retention_jobs" ADD CONSTRAINT "retention_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

COMMIT;
