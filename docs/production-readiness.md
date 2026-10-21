# Production readiness and rollout plan

Reviewed 21 October 2026 against the current repository. This is a code review and
local automated verification, not a certification that the deployed flows work.
No deployment, migration of a live database, or paid service creation was performed.

## Release decision

Prepare a **staging deployment first**. Do not call this a complete public SaaS
release yet. The attendance workflow is implemented, but access policy,
operational checks and the remaining launch gates still need work. Google Sheets
and face recognition are deferred by the current scope and do not block this release.

A controlled pilot can use organization owners/admins, selfie evidence + GPS,
attendance grids, CSV and corrections to existing sessions after the staging gates
below pass. Employee ID-only login is the existing deliberate product behavior;
its access to attendance history, leave and correction actions must be accepted
for that pilot or replaced with a second credential before staff data is exposed.
Branch-manager accounts should not be provisioned until branch authorization is
implemented and tested. UI branch filters are not authorization.

## Changes completed during this review

- Removed deprecated frontend `baseUrl`; the `@/*` alias now maps to `./src/*`.
- Replaced deprecated Node/Node10 resolution with matching `Node16` module and
  resolution settings in backend, worker and shared library. These packages
  remain CommonJS at runtime because their package manifests have no ESM type.
- Made Node ambient types explicit. Added a frontend test tsconfig, included in
  typechecking, so frontend tests are checked as well as application/Vite code.
- Added editor settings for the installed workspace TypeScript SDK. The repository
  remains on its pinned TypeScript 5.9 dependency; no version upgrade or warning
  suppression was used. [TypeScript 6 migration reference](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).
- Assigned unique object keys to each selfie upload. Rejected or duplicate
  submissions remove only their own object; they cannot replace/delete a photo
  from an already successful attendance attempt.
- Preserved refresh cookies on transient backend failures and preserved admin
  client session state on throttling/server errors. Expired sessions still clear.
- Required active business/organization records when refreshing employee sessions.
- Removed Sheets connection screens and face-recognition status/model queries.
  Attendance uses saved selfies, server time and passing GPS. Corrected claims
  about branch-manager isolation.
- Ensured the backend process receives shutdown signals after startup migrations.

## Functionality inventory

| Area | Current behavior | Remaining work |
| --- | --- | --- |
| Admin authentication | Registration, password login, email verification/reset, access/refresh tokens and logout exist | Verify delivered mail and concurrent tabs/restarts on staging; consider admin MFA for a wider release |
| Organization setup | Organization/business, branch perimeter, shifts, team setup and limits exist | Test complete setup from a new account on a fresh migrated database |
| Employee directory | Add/edit staff, assign branch/shift, pause/reactivate, view details | Employee self-service profile editing and stronger login credentials are not implemented |
| Employee sign-in | Employee ID alone creates/restores a separate employee session | Decide ID-only policy; a PIN/password/OTP flow would require UI/API, recovery and database changes |
| Attendance | GPS/time checks, saved photos, multiple in/out sessions and early departure exist | Complete real-device, permission denial, retries, concurrent submission and overnight tests |
| Attendance register | Up to 31 dates, 25 employees/page, in/out photos/times, totals, filters and CSV | CSV exports the current page; full-organization exports and payroll calculations need implementation |
| Corrections | Request/approve/reject changes to an existing attendance session | A completely missed day with no session cannot currently be requested or created through this flow |
| Leave and rest | Employee records/cancels individual leave dates; rest days derive from shift working days | No leave approval, balances, holiday calendar, leave ranges or separate approved-break tracking |
| Roles | Organization/business membership and action-role checks exist | Branch-manager data access is business-wide; assigned branch IDs are not enforced in read/write/photo queries |
| Selfie evidence | Both in/out photos and server dates/times are recorded and visible to admins | Face recognition and liveness are outside this release scope |
| Reporting | Attendance register, CSV and overview exist | Scheduled reports and payroll exports; Google Sheets is deferred |
| Staff invitations | Schema/module foundations exist | Invite, accept, revoke and membership-management APIs/UI |
| Notifications | Workspace lists pending corrections; SMTP supports account emails | Durable mail retries, push/SMS and background notifications; worker only observes a queue |
| Storage/retention | Photos in Postgres by default; private B2 is supported | Configure/test bucket lifecycle; database photo purge and retention/export/deletion workflows are absent |
| Billing | Plan rows, limits and trial dates exist | Checkout, payment webhooks, plan changes and expiration enforcement; displayed prices are provisional |
| Platform owner | Owner route is a placeholder | Platform administration/support tooling |

Relevant implementation: `apps/backend/src/app/common/auth/business-access.guard.ts`,
`features/employee-auth/employee-auth.service.ts`, `features/employee-portal/employee-portal.service.ts`,
`features/attendance/attendance-register.service.ts`, and the empty memberships,
privacy, reports and notifications modules. The worker logs that handlers
are pending; installing Redis does not implement these features.

## Priority before launch

| Priority | Work | Acceptance criterion |
| --- | --- | --- |
| P0 | Employee access policy | Choose controlled ID-only pilot or implement a second credential; test protection of employee history, leave and correction actions |
| P0 if using managers | Enforce branch scope in backend | Manager assigned to branch A cannot list/export/view photos/change employees/approve corrections in B, including direct HTTP requests; owner/admin access remains correct |
| P0 | Database and Docker verification | CI passes migrations, rerunnable seed, database integration checks, both image builds and production builds from a clean checkout |
| P0 | Staging end-to-end | All smoke checks in `deployment.md` pass through the Cloudflare origin with real database, mail and storage; record evidence |
| P0 | Operational recovery | Backup/restore rehearsal, private photo lifecycle configuration, uptime/error alerts and a named rollback operator are in place |
| P1 | Session/retry concurrency | Two tabs, refresh response loss, first login on two phones, double submit, logout during refresh and temporary outages preserve valid sessions/evidence without creating duplicate attendance |
| P1 | Missed-day correction | Admin/employee can create an auditable missing-day request without an existing attendance session |
| P1 | Retention and staff data controls | Selected retention policy covers B2 and DB fallback; cleanup/recovery is tested, access is documented |
| P1 | Trustworthy payroll rules | Confirm overnight work-date rules, edited shift histories, late/absence policy, holidays, breaks and leave rules before using totals for payroll |
| P1 before selling | Billing lifecycle | Real plan selection, expiration behavior and payment processing agree with advertised pricing |
| P2 | Additional features | Push, scheduled exports and full owner portal, based on agreed product scope |

No new identity, leave-approval or payroll policy was invented in this review.
These require product decisions before implementation. ID-only login and
selfie evidence do not establish that a particular person is present.

## Rollout sequence

1. **Verify source.** Use Node 24/Yarn 1.22.22. Run `yarn install --frozen-lockfile`,
   `yarn typecheck`, `yarn test`, `yarn build`. CI also migrates/seeds a fresh PostGIS
   database and runs `scripts/test-database.cjs`. Use only a disposable database
   for integration fixtures. Build both Dockerfiles from the repository root.
2. **Create staging.** Separate Postgres/PostGIS database, Render backend and
   Cloudflare Pages project; separate JWT, mail and private bucket credentials.
   Follow `deployment.md` for the exact build/output/environment settings.
3. **Verify the public path.** Configure Pages `BACKEND_ORIGIN`; Render
   `UI_ORIGIN`/`APP_URL` must be the exact frontend HTTPS origin. Test readiness,
   cookie restoration, authorization and selfies through the frontend host.
   A preview origin needs its own matching staging backend configuration.
4. **Complete functional checks.** Use two organizations, two branches and two
   employees. Check tenant isolation, every in/out pair and photo in the grid,
   multiple sessions, corrections, leave, overnight dates, exports, permissions
   and suspended accounts. Use both an Android and iPhone browser if supported.
5. **Rehearse recovery.** Back up the staging database, restore it to a separate
   database, and verify records/photos. Test storage unavailability and API
   restart. Configure alerts for readiness failures and repeated 5xx responses.
6. **Pilot.** Use a small team and owner/admin accounts under the chosen employee
   login policy. Verify attendance against the expected register for several
   working days, including an overnight shift if applicable.
7. **Release.** Back up production, deploy the reviewed backend image/migrations,
   verify readiness, deploy Pages, and rerun the short auth/check-in/grid/photo
   smoke check. Keep the previous backend image and frontend deployment available.
   Migrations currently run before API start; coordinate multiple releases.
8. **Rollback when necessary.** Restore the prior frontend deployment and prior
   compatible backend image. Revert application code only if the current schema
   remains compatible. Do not delete migration history or run destructive reverse
   SQL automatically; restore a verified backup into a replacement database if
   schema recovery is required.

## Hosting prerequisites

Use the existing Render Starter configuration for SMTP. [Render Free blocks
SMTP ports 25, 465 and 587](https://render.com/docs/free). Configure and verify mail
sending, not just the SMTP connection. Configure all five B2 values together for
private object storage; otherwise plan database photo capacity and retention.
Database backups do not restore B2 objects, so object retention/recovery must be
planned separately. Do not provision the optional worker until it has actual job
handlers. Do not expose production preview deployments with mismatched origins.

## Verification limits

Local checks cover configured TypeScript 5.9, unit/service regression tests and
production bundle generation. Database doubles do not establish correct SQL,
real authorization behavior or transaction concurrency. No local Docker engine
or browser automation package was available during this review; clean image
builds and real-device workflows are release gates, not claimed completed checks.
The TypeScript 6-specific deprecations identified in the screenshot were removed,
but the entire application was not compiled with TypeScript 6 locally.
