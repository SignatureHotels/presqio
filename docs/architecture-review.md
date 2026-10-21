# Architecture review and implementation decisions

See [the current product and hosting plan](product-plan.md) for the later hosting/product clarification. The AWS references in this review describe the original baseline, rather than a selected cloud provider; no provider integrations are implemented yet.

The architecture document defines the full product. This repository implements its phase 1 foundation, with domain module boundaries prepared for subsequent phases. It does not implement login, authorization, biometric verification or attendance recording endpoints.

## Decisions applied

- Yarn Classic workspaces replace the proposed pnpm setup, per the requested commands. Node 24 LTS is the recommended runtime; `.nvmrc` selects it. Dependencies and Prisma CLI/client versions are locked together.
- One React/Vite/MUI UI workspace serves employee, business admin and owner route shells on port 300. Separate employee and admin deployments can be extracted later without duplicating the initial tooling. Port selection is strict.
- NestJS API runs on port 8080 with `/api/v1`, development Swagger, configuration validation, security headers, request IDs, error envelopes and basic process-local throttling. Domain modules intentionally expose no unprotected data endpoints. DTO validation uses class-validator; Zod is only for environment configuration.
- Database ownership lives in `apps/backend/prisma`, including schema, migrations and seed, as requested. PostgreSQL/PostGIS stores geofences as geography; spatial queries must use parameterized raw SQL with longitude first in `ST_MakePoint`.
- Composite business/entity foreign keys prevent references to another business's employees, branches, attempts and sessions. Unique partial indexes enforce one open session and one active enrollment per employee. Append-only triggers protect punches, adjustments and audit records from normal UPDATE/DELETE operations. Database owners can still alter triggers; production runtime credentials must not own the schema.
- Additional tables cover calendars, approvals, derived attendance adjustments, privacy acknowledgements, notifications and retention jobs mentioned in the document but omitted from its principal column list. Shift and branch snapshots preserve historical policy context.
- The worker workspace connects to Redis as a BullMQ queue observer. It deliberately has no consumers until report, notification and retention handlers exist; it cannot accidentally acknowledge unfinished jobs.
- PWA manifest and a minimal production service worker are present. Only the icon is cached; attendance and API responses are never cached. Offline attendance is unsupported. PNG install icons and actual mobile installation/liveness validation remain follow-up work.

## Gaps that must be resolved before feature rollout

1. **Server identity and authorization:** define principal/session context and owner/admin/manager membership policies before exposing CRUD routes. Database foreign keys prevent cross-business links, but do not authorize reads. Add tenant isolation tests to every domain. Business scope must come from authenticated memberships.
2. **Authentication:** activation and PIN-setting session lifetime, admin/owner login and recovery are not fully specified. Implement Argon2id, atomic activation consumption, refresh rotation/reuse detection, revocation, CSRF controls and shared Redis account/IP throttling. Current throttling is only a development baseline.
3. **Enrollment:** the document describes enrollment challenges but has no dedicated enrollment-attempt entity. Add this before the provider integration, binding employee, authentication session, nonce, expiry and provider result. Decide the temporary AWS credential exchange and validate region/browser availability before committing to a deployment region.
4. **Attendance transaction:** lock attempt and employee/session, verify server-side provider results, evaluate current branch/shift assignment, enforce freshness/geofence policy, consume once and create event/session atomically. The migration gate requires matching passing evidence; it cannot authenticate AWS evidence or enforce all service-level policy by itself. Return the original result on idempotent retries. Do not create an approved result from client flags.
5. **Session consistency:** CHECK_IN/CHECK_OUT transitions and agreement between session endpoints and event types must be implemented and tested in the service transaction. One-open-session and timestamp checks alone are insufficient.
6. **Scheduling:** specify overlapping shifts/assignments, holidays, DST, split shifts, branch changes during an open session and timezone precedence. Compute work date using the scheduled shift start, rather than calendar midnight.
7. **Corrections:** define the risk policy and two-reviewer requirement; preserve original events and write a derived adjustment. Review identity checks in the schema are a baseline, not the approval workflow.
8. **Privacy and operations:** establish approved retention values, deletion procedures compatible with immutable audit records, S3 lifecycle/encryption, redaction and restricted evidence URLs. No biometric retention values or public object stores are assumed. A distinct maintenance role is needed for authorized retention purges.
9. **Production:** add distributed rate limits, structured redacted logs, metrics, provider health, object-store integration, deployment containers/reverse proxy, migrations with separate DB credentials, backup restore checks and managed secrets. Readiness currently checks database connectivity and the base schema only, not Redis/AWS or migration-version parity.

## Verification boundaries

CI starts PostGIS and applies the committed migrations from an empty database, runs an idempotent seed twice, tests the database constraints, then builds all workspaces. Local UI/API may start without infrastructure; readiness returns 503 until a migrated database is available. Feature-level security and provider tests belong to the later phases in the original architecture.

Reference implementation guidance: [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/), [NestJS setup](https://docs.nestjs.com/first-steps), [Prisma unsupported database features](https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-database-features), [Vite setup](https://vite.dev/guide/).
