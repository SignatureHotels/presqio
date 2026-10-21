# Presqio SaaS tenancy, admin auth and onboarding design

Status (21 October 2026): **schema, auth API and admin entry pages implemented.** Migrations `202610210003_saas_tenancy` and `202610210004_refresh_rotation_grace` are applied to Neon. Built: register, login, refresh (rotating, 60 s grace for a lost response; reuse after that revokes the session), logout, me, email verification, forgot/reset password; organization create/read/update; business, branch (with PostGIS perimeter) and shift create/list with plan limits; frontend home page, register, login, forgot/reset password, verify email, organization picker and the 6-step setup wizard. Not yet built: invitations/member management, employee PIN login, real email provider (dev logs emails to the API console). The admin pages after setup still show sample data.

Routing note: the admin workspace stays at `/admin/*` with the active organization kept in the session (remembered in localStorage) rather than `/o/:orgSlug/...` URLs; the API still authorizes every request by membership.

> **Update (21 October 2026): the product is now organization → branches.** Each organization is created with exactly one business record (`BusinessesService.createDefault`) that holds its branches and shifts; there is no UI or API to add a second business. That record's `code` is the employee sign-in code and it follows the organization's name and time zone. Setup is Organization → Branches & perimeter → Shift → Team → Done (the stored `BUSINESS` onboarding step is treated as `BRANCH`). Plans limit branches: Free 1, Starter 3, Growth 10 (migration `202610210005_branch_based_plans`). Sections below that describe multiple businesses per organization are superseded; the tables are unchanged so a business level can be reintroduced later without a data migration.

## 1. Tenant hierarchy

```
User (global login: email + password)
 └─ Organization membership ── role: OWNER | ADMIN | MEMBER
     Organization  (the SaaS customer = billing + data-isolation boundary)
      ├─ Subscription (plan, limits, trial)
      └─ Business 1..n  (a company/brand the organization runs)
           ├─ Business membership ── role: BUSINESS_ADMIN | BRANCH_MANAGER | VIEWER
           │    └─ branch scope (optional: manager limited to some branches)
           ├─ Branch 1..n ── geofence, shifts
           └─ Employee 1..n ── attendance, face enrollment
```

- **Organization** is the tenant. One customer signs up once, then adds one or many businesses under it. A solo shop has one organization with one business; a group with five restaurants has one organization with five businesses.
- **One admin manages many businesses** in two ways:
  - Organization `OWNER`/`ADMIN` automatically manages **every** business in the organization (no per-business rows needed).
  - Organization `MEMBER` sees only businesses where they have a `business_memberships` row (e.g. a manager of business 2 only).
- **One user can belong to several organizations** (e.g. an accountant or consultant serving multiple customers). After login they pick an organization; every API request is still authorized against membership, never against what the UI shows.
- **Employees are per business.** The same person working for two businesses has two `employees` rows, optionally linked to the same `users` row. Employees log in on mobile with business code + employee code + PIN (existing `credentials.pin_hash`), separate from admin email login.

Today's `groups` table already plays the organization role; it is renamed rather than duplicated.

## 2. Schema changes

### Renamed / extended

| Current | Change |
|---|---|
| `groups` | Rename to `organizations`. Add `slug` (unique, used in URLs), `status` (`ACTIVE`/`SUSPENDED`), `country`, `default_timezone`, `onboarding_step`, `onboarding_completed_at`, `created_by`. |
| `group_memberships` | Rename to `organization_memberships`. `role` enum becomes `OrganizationRole { OWNER, ADMIN, MEMBER }`. Add `status` (`ACTIVE`/`DISABLED`), `created_at`. Invariant: every organization keeps ≥1 active `OWNER` (to enforce in the member-management service when it is built). |
| `businesses.group_id` | Rename to `organization_id`. Add `slug` (unique per organization), `industry`, `country`, `address`, `logo_key`, `updated_at`. Keep global unique `code` (employees type it at mobile login). |
| `users` | Add `email` (`citext`, unique, nullable for employee-only users), `email_verified_at`, `last_login_at`, `updated_at`. |
| `credentials` | Generalize: add `password_hash` (nullable), make `pin_hash` nullable, `CHECK (password_hash IS NOT NULL OR pin_hash IS NOT NULL)`. Admins use password (argon2id), employees use PIN. |
| `business_memberships` | Role enum `BusinessRole { BUSINESS_ADMIN, BRANCH_MANAGER, VIEWER }`. Replace free-form `scope_json` with `business_membership_branches` table. |
| `sessions` | Add `kind` (`ADMIN`/`EMPLOYEE`), `last_used_at`, `ip`, `user_agent`. Refresh token rotation; refresh token in httpOnly cookie, short-lived access JWT in memory. |
| `audit_logs.group_id` | Rename to `organization_id`. |

### New tables

```prisma
model business_membership_branches {   // optional branch scoping for managers
  business_id   String @db.Uuid
  membership_id String @db.Uuid
  branch_id     String @db.Uuid
  @@id([membership_id, branch_id])
  // composite FKs (business_id, membership_id) and (business_id, branch_id) keep it in one business
}

model invitations {
  id              String   @id @db.Uuid
  organization_id String   @db.Uuid
  email           String   @db.Citext
  organization_role OrganizationRole @default(MEMBER)
  business_id     String?  @db.Uuid          // optional: also grant a business role
  business_role   BusinessRole?
  token_hash      String   @unique
  invited_by      String   @db.Uuid
  expires_at      DateTime
  accepted_at     DateTime?
  revoked_at      DateTime?
  // partial unique: one pending invite per (organization_id, email)
}

model auth_tokens {                      // email verification + password reset
  id          String   @id @db.Uuid
  user_id     String   @db.Uuid
  purpose     AuthTokenPurpose           // VERIFY_EMAIL | RESET_PASSWORD
  token_hash  String   @unique
  expires_at  DateTime
  consumed_at DateTime?
}

model plans {                            // seeded catalogue, not tenant data
  code              String @id           // FREE | STARTER | GROWTH
  name              String
  max_businesses    Int?                 // null = unlimited
  max_branches      Int?
  max_employees     Int?
  monthly_price_minor Int
  currency          String
}

model subscriptions {
  id                    String @id @db.Uuid
  organization_id       String @unique @db.Uuid
  plan_code             String
  status                SubscriptionStatus   // TRIALING | ACTIVE | PAST_DUE | CANCELED
  trial_ends_at         DateTime?
  current_period_end    DateTime?
  provider              String?              // razorpay / stripe, later
  provider_customer_id  String?
  provider_subscription_id String?
}
```

### Isolation rules

- Every tenant row resolves to exactly one organization: business-scoped tables already carry `business_id` with composite FKs `(business_id, id)`; businesses carry `organization_id`. Cross-tenant joins are therefore impossible at the FK level.
- Backend resolves an `AccessContext { userId, organizationId, role, businessIds[] }` per request from the session + `X-Organization-Id` header (or `/o/:slug` route), and every repository query filters by it. Postgres row-level security can be added later as defense in depth.
- Plan limits (`max_businesses`, `max_employees`) are checked in the same transaction as the insert.

## 3. Admin web flows

### Public pages
| Route | Content |
|---|---|
| `/` | Home: hero ("Selfie + GPS attendance for every branch"), how it works (3 steps), features (geofence, face check, shifts, Sheets export, multi-business), pricing (plans table), FAQ, CTA → Register. Header: Login / Start free trial. |
| `/register` | Full name, work email, password (+ strength), organization name, accept terms. Creates user + organization + OWNER membership + TRIALING subscription in **one transaction**, sends verification email, signs in, redirects to onboarding. |
| `/login` | Email + password, "Forgot password", lockout after repeated failures (reuse `failed_attempts`/`locked_until`). |
| `/forgot-password`, `/reset-password?token=` | Single-use, 30-minute token from `auth_tokens`. |
| `/verify-email?token=` | Marks `email_verified_at`. Unverified admins can finish onboarding but cannot invite users or export data. |
| `/invite/:token` | Accept invitation: existing user signs in, new user sets name + password. |
| `/employee/login` | Business code + employee code + PIN (mobile). |

### Post-login routing
```
login → memberships?
   0 orgs (invite-less user)          → /onboarding (create organization)
   1 org, onboarding incomplete       → /onboarding/<step>
   1 org, complete                    → /o/<org-slug>  (dashboard)
   >1 org                             → /select-organization
```

### Onboarding wizard (`/onboarding`, progress saved in `organizations.onboarding_step`)
1. **Organization**: name (prefilled), country, default timezone.
2. **First business**: name, industry, business code (auto-suggested, unique; employees use it to log in).
3. **First branch + perimeter**: address search, map pin, radius (default 100 m), max GPS accuracy.
4. **Default shift**: name, start/end, grace minutes, overnight toggle, working days.
5. **Team** (skippable): invite admins/managers by email; add first employees manually or via CSV.
6. **Done**: summary + "Go to dashboard". Sets `onboarding_completed_at`.

Every step is resumable; going back edits rather than duplicates (idempotent upsert keyed on organization).

### Admin app shell
- URL: `/o/:orgSlug/...` for organization overview and `/o/:orgSlug/b/:businessSlug/...` for the existing admin pages (overview, live attendance, employees, branches, shifts, approvals, reports, settings).
- Top bar **business switcher**: "All businesses" (OWNER/ADMIN only: totals per business) + each accessible business + "Add business" (plan-limited).
- New organization settings: Members & invitations, Businesses, Billing & plan, Organization profile.

## 4. Backend modules (NestJS `features/`)

| Module | Endpoints |
|---|---|
| `auth` | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` (user + memberships) |
| `organizations` | `GET/PATCH /organizations/:id`, `GET /organizations/:id/overview`, onboarding `GET/PUT /organizations/:id/onboarding` |
| `members` | list/update/remove members, `POST /invitations`, `POST /invitations/:token/accept`, revoke |
| `businesses` | CRUD under organization, plan-limit check |
| `billing` | `GET /subscription`, plans list (payment provider later) |
| `employee-auth` | `POST /employee-auth/login` (code + PIN), activation |

Guards: `AuthGuard` (JWT) → `OrganizationGuard` (membership + role) → `BusinessGuard` (OWNER/ADMIN or business membership) → role decorator `@Roles(...)`.

## 5. Decisions

Decided: users may belong to multiple organizations; billing is per organization; auth is in-house (argon2id passwords, 15-minute HS256 access JWT, rotating 30-day refresh token in an httpOnly `presqio_rt` cookie scoped to `/api/v1/auth`).

Implemented defaults to confirm:
- New organizations start a 14-day `GROWTH` trial (5 businesses, 250 employees). Seeded plan prices (Starter ₹999, Growth ₹2,999/month) are placeholders.
- Trial expiry is not enforced yet; only `CANCELED` blocks adding businesses.
- 5 failed logins lock the account for 15 minutes.

Open:
1. Email provider for verification/invites: Resend, Brevo, or SMTP.
2. Payments provider: Razorpay (India) or Stripe.
3. Final plan names, limits and prices.
