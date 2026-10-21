-- SaaS tenancy: groups become organizations, admin email/password auth,
-- invitations, auth tokens, plans and subscriptions. See docs/saas-tenancy-design.md.
BEGIN;

-- Enums
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "OnboardingStep" AS ENUM ('ORGANIZATION', 'BUSINESS', 'BRANCH', 'SHIFT', 'TEAM', 'COMPLETED');
CREATE TYPE "AuthTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TYPE "SessionKind" AS ENUM ('ADMIN', 'EMPLOYEE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
ALTER TYPE "BusinessRole" ADD VALUE 'VIEWER';

-- groups -> organizations (rename in place, keeps any rows)
ALTER TABLE "groups" RENAME TO "organizations";
ALTER TABLE "organizations" RENAME CONSTRAINT "groups_pkey" TO "organizations_pkey";
ALTER TABLE "organizations"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN "default_timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN "onboarding_step" "OnboardingStep" NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(3),
  ADD COLUMN "created_by" UUID,
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "organizations" SET "slug" = 'org-' || substr(replace("id"::text, '-', ''), 1, 12) WHERE "slug" IS NULL;
ALTER TABLE "organizations" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_format"
  CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") BETWEEN 3 AND 48);

-- group_memberships -> organization_memberships
ALTER TABLE "group_memberships" RENAME TO "organization_memberships";
ALTER TABLE "organization_memberships" RENAME COLUMN "group_id" TO "organization_id";
ALTER TABLE "organization_memberships" RENAME CONSTRAINT "group_memberships_pkey" TO "organization_memberships_pkey";
ALTER TABLE "organization_memberships" RENAME CONSTRAINT "group_memberships_group_id_fkey" TO "organization_memberships_organization_id_fkey";
ALTER TABLE "organization_memberships" RENAME CONSTRAINT "group_memberships_user_id_fkey" TO "organization_memberships_user_id_fkey";
ALTER INDEX "group_memberships_group_id_user_id_key" RENAME TO "organization_memberships_organization_id_user_id_key";
ALTER TABLE "organization_memberships" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "organization_memberships"
  ALTER COLUMN "role" TYPE "OrganizationRole" USING 'OWNER'::"OrganizationRole";
ALTER TABLE "organization_memberships" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
ALTER TABLE "organization_memberships"
  ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "organization_memberships_user_id_idx" ON "organization_memberships"("user_id");
DROP TYPE "GroupRole";

-- businesses
ALTER TABLE "businesses" RENAME COLUMN "group_id" TO "organization_id";
ALTER TABLE "businesses" RENAME CONSTRAINT "businesses_group_id_fkey" TO "businesses_organization_id_fkey";
ALTER INDEX "businesses_group_id_id_key" RENAME TO "businesses_organization_id_id_key";
ALTER TABLE "businesses"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN "address" TEXT,
  ADD COLUMN "logo_key" TEXT,
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "businesses" SET "slug" = trim(both '-' from regexp_replace(lower("code"), '[^a-z0-9]+', '-', 'g')) WHERE "slug" IS NULL;
ALTER TABLE "businesses" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "businesses_organization_id_slug_key" ON "businesses"("organization_id", "slug");
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_slug_format"
  CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") BETWEEN 2 AND 48);

-- audit_logs
ALTER TABLE "audit_logs" RENAME COLUMN "group_id" TO "organization_id";
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_logs_group_id_fkey" TO "audit_logs_organization_id_fkey";
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_logs_group_id_business_id_fkey" TO "audit_logs_organization_id_business_id_fkey";

-- business_memberships: one role per user per business; branch scope moves to its own table
DROP INDEX "business_memberships_business_id_user_id_role_key";
ALTER TABLE "business_memberships" DROP COLUMN "scope_json",
  ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "business_memberships_business_id_user_id_key" ON "business_memberships"("business_id", "user_id");
CREATE INDEX "business_memberships_user_id_idx" ON "business_memberships"("user_id");

CREATE TABLE "business_membership_branches" (
    "business_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    CONSTRAINT "business_membership_branches_pkey" PRIMARY KEY ("membership_id","branch_id")
);
ALTER TABLE "business_membership_branches" ADD CONSTRAINT "business_membership_branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "business_membership_branches" ADD CONSTRAINT "business_membership_branches_business_id_membership_id_fkey" FOREIGN KEY ("business_id", "membership_id") REFERENCES "business_memberships"("business_id", "id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "business_membership_branches" ADD CONSTRAINT "business_membership_branches_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- users: admin identity
ALTER TABLE "users"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "email_verified_at" TIMESTAMPTZ(3),
  ADD COLUMN "last_login_at" TIMESTAMPTZ(3),
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("email" IS NULL OR "email" = lower("email"));
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- credentials: password for admins, PIN for employees
ALTER TABLE "credentials" ADD COLUMN "password_hash" TEXT, ALTER COLUMN "pin_hash" DROP NOT NULL;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_secret_present" CHECK ("password_hash" IS NOT NULL OR "pin_hash" IS NOT NULL);

-- sessions
ALTER TABLE "sessions"
  ADD COLUMN "kind" "SessionKind" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "last_used_at" TIMESTAMPTZ(3),
  ADD COLUMN "ip" TEXT,
  ADD COLUMN "user_agent" TEXT;

-- invitations
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "organization_role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "business_id" UUID,
    "business_role" "BusinessRole",
    "token_hash" TEXT NOT NULL,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invitations_email_lowercase" CHECK ("email" = lower("email")),
    CONSTRAINT "invitations_business_role_pair" CHECK (("business_id" IS NULL) = ("business_role" IS NULL)),
    CONSTRAINT "invitations_not_owner" CHECK ("organization_role" <> 'OWNER')
);
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");
CREATE INDEX "invitations_organization_id_email_idx" ON "invitations"("organization_id", "email");
CREATE UNIQUE INDEX "invitations_one_pending_per_email" ON "invitations"("organization_id", "email")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_business_id_fkey" FOREIGN KEY ("organization_id", "business_id") REFERENCES "businesses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- email verification / password reset tokens
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX "auth_tokens_user_id_purpose_idx" ON "auth_tokens"("user_id", "purpose");
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- plans and subscriptions (billing is per organization)
CREATE TABLE "plans" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_businesses" INTEGER,
    "max_branches" INTEGER,
    "max_employees" INTEGER,
    "monthly_price_minor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "plan_code" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trial_ends_at" TIMESTAMPTZ(3),
    "current_period_end" TIMESTAMPTZ(3),
    "provider" TEXT,
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("code") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Plan catalogue. Prices are placeholders (paise) until pricing is decided.
INSERT INTO "plans" ("code", "name", "max_businesses", "max_branches", "max_employees", "monthly_price_minor") VALUES
  ('FREE',    'Free',    1, 1,    10,   0),
  ('STARTER', 'Starter', 1, 3,    50,   99900),
  ('GROWTH',  'Growth',  5, NULL, 250,  299900);

COMMIT;
