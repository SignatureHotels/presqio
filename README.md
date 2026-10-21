# Presqio attendance platform

Yarn monorepo based on [the architecture](attendance-platform-architecture.md). Read [the architecture review](docs/architecture-review.md) for implementation decisions, missing requirements and the boundary of this foundation.

The [current product and hosting plan](docs/product-plan.md) covers Cloudflare Pages + Render + PostgreSQL/PostGIS, selfie evidence and GPS attendance, private photo storage, and CSV reporting. Google Sheets and face recognition are deferred for this version. See [deployment instructions](docs/deployment.md) for hosting and release smoke checks.

## Admin UI

Run `yarn ui:dev` and open http://localhost:300. The admin workspace uses authenticated APIs for employees, branches, shifts, attendance, corrections and settings, with scoped filters and CSV export. The employee mobile portal is at `/employee` and uses a separate session for check-in/out, selfies, GPS, history, leave and corrections. See [deployment instructions](docs/deployment.md) for hosting and validation.

## Production planning

Read the [readiness review and rollout plan](docs/production-readiness.md) before a production release. It records implemented flows, missing functionality, access-policy decisions and staging gates.

## Requirements

Node 24 LTS (see `.nvmrc`), Yarn 1.22.22, and Docker Compose for local PostgreSQL/PostGIS and Redis. Alternatively use existing PostgreSQL 16+ with PostGIS and Redis instances. Docker is not needed to run the UI or API liveness endpoint.

## Start development

```sh
yarn install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
yarn infra:up
yarn db:deploy
yarn db:seed
```

Run in separate terminals from the repository root:

```sh
yarn ui:dev
```

```sh
yarn backend:dev
```

- UI: http://localhost:300
- API liveness: http://localhost:8080/api/v1/health
- Database readiness: http://localhost:8080/api/v1/health/ready
- Swagger (development only): http://localhost:8080/api/docs

The UI proxies the `VITE_API_URL` path to the frontend environment's `BACKEND_ORIGIN`. Set both in `apps/frontend/.env` (see the example). No secrets or AWS credentials belong in frontend environment variables. API uses `.env` in `apps/backend`; default development configuration also allows startup without copying it. Database CLI commands require `DATABASE_URL` from that file or the environment. Installation generates Prisma Client without requiring a running database.

Optional queue observer: `yarn worker:dev`. Redis must be running. Background job consumers are not implemented yet.

## Database migrations

All migration files live under `apps/backend/prisma/migrations/`:

- `202610210001_initial/migration.sql`: extensions, enums, tables, indexes and tenant-scoped foreign keys.
- `202610210002_invariants/migration.sql`: PostGIS spatial index, partial uniqueness, validity checks and immutable-record/verification triggers.

Apply committed migrations to an empty or existing database:

```sh
yarn db:deploy
yarn db:status
```

Create a migration after editing `apps/backend/prisma/schema.prisma`:

```sh
yarn db:migrate --name describe_change
yarn db:generate
```

`db:migrate` is for development and requires shadow database creation permissions. `db:deploy` applies existing migrations without a shadow database; use it in deployments. PostGIS must be available on the server and the migration account needs extension creation permissions (or the extension must be pre-provisioned by a DBA). Keep production application credentials separate from migration credentials.

Custom SQL owns partial/spatial indexes, extra checks and triggers. Inspect every generated migration to preserve these features; do not replace the migration chain with `prisma db push`. Never edit applied migrations. Use parameterized raw SQL for the unsupported geography field. Seed is optional, rerunnable and creates only a demo group, business and branch, with no default passwords or biometric records.

## Layout

See [project structure and conventions](docs/project-structure.md) for page/component ownership, backend feature layers and shared table types.

```text
apps/frontend/                    React + Vite + MUI portal shells, PWA baseline
apps/backend/src/app/features/   NestJS domain module boundaries and health endpoints
apps/backend/prisma/        Prisma schema, SQL migrations and seed
apps/worker/                BullMQ queue observer foundation
packages/lib/         Shared domain, API and table types
packages/config/            Shared TypeScript configuration
scripts/                    Database integration checks
.github/workflows/          Install, migrate, test and build CI
```

## Attendance register

The admin [attendance grid](docs/attendance-register.md) supports selected dates, every in/out session, hours, rest days, leave, corrections and authenticated selfie previews.

## Checks

```sh
yarn typecheck
yarn test
yarn build
```

Database integration checks require an already migrated, disposable database:

```sh
cd apps/backend
node --env-file=.env ../../scripts/test-database.cjs
```

Tests use a transaction and roll back their data. CI runs these against a fresh PostGIS service. `yarn infra:down` stops containers without deleting their named volumes.

Admin and employee flows now use live APIs and database records. Face recognition and Google Sheets are outside the current release scope. Background job consumers remain unimplemented. See [deployment validation](docs/deployment.md) for what automated checks cover and which live checks are required before release.
