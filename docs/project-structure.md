# Project structure and conventions

The repository follows the feature and component organisation in the supplied reference screenshots. This refactor preserves the admin UI, dev commands and backend routes. It does not implement new authentication or attendance features.

```text
apps/
  frontend/src/
    app/
      App.tsx
      admin/
        AdminWorkspace.tsx
        overview/
          OverviewPage.tsx
          OverviewPage.css
          index.ts
          mock-data/
          components/
            attendance-chart/
              AttendanceChart.tsx
              AttendanceChart.css
              index.ts
            attendance-breakdown/
            business-performance/
            recent-activity/
        employees/
          EmployeesPage.tsx
          index.ts
          components/
            employee-filters/
            employee-dialog/
            employee-details/
        branches/
          BranchesPage.tsx
          components/
            branch-dialog/
            branch-card/
              BranchCard.tsx
              BranchCard.css
              index.ts
              components/geofence-preview/
        attendance/
        shifts/
        approvals/
        reports/
        settings/
        mock-data/             # Shared fictional domain fixtures
      employee/                # Existing mobile placeholder
      owner/                   # Existing owner placeholder
      not-found/
    components/                # Components reused across pages
      icon/
      section-header/
      data-table/              # Generic, typed rows/columns
      employee-table/          # Employee-specific table composition
      employee-avatar/
      attendance-summary/
      status-chip/
      navbar/
      sidebar/
      footer/
      preview-notice/
      portal-placeholder/
    context/                   # Context definition and value types
    hooks/                     # State, context access, export behavior
    layouts/admin-layout/      # Shell + toolbar + notifications
    providers/                 # App and preview-state providers
    router/                    # Route elements and navigation metadata
    theme/                     # Palette, typography, global base styles
    types/                     # Frontend-only presentation types
    utils/                     # Formatting, CSV, attendance calculations
    main.tsx
  backend/
    src/
      main.ts
      app/
        app.module.ts
        common/
          config/              # Environment and Swagger setup
          database/            # Prisma lifecycle and Nest module
          filters/             # Uniform API exception response
          middlewares/         # Request ID
          pipes/               # Shared request validation
        features/
          health/
            health.controller.ts
            health.service.ts
            health.module.ts
          auth/
          groups/
          businesses/
          memberships/
          branches/
          employees/
          geofences/
          shifts/
          face/
          attendance/
          corrections/
          reports/
          notifications/
          audit/
          privacy/
    prisma/                    # Schema, existing migrations and seed
    test/
  worker/
packages/
  lib/
    src/
      index.ts
      types/
        common/                # Error envelope, ISO dates, pagination, columns
        auth/
        businesses/
        branches/
        employees/             # EmployeeSummary and EmployeeTableRow
        shifts/
        attendance/
        approvals/
        audit/
        health/
  config/
```

## Frontend ownership

- Each route has a page folder with its page component and an explicit `index.ts` export. Pages compose sections rather than containing every dialog and table implementation.
- Keep components used by one page under that page's `components/`. A component with meaningful smaller parts can have its own `components/` folder. For example, `BranchCard` owns `GeofencePreview`, and `GoogleSheetsPanel` owns its integration dialog.
- Move components used across pages into `src/components/`. Each folder owns its component, styles when needed, and public exports. Do not add empty style/type/hook files to satisfy a template.
- Styles are colocated with their owner. `theme/global.css` holds base rules and shared primitives, rather than charts, reports, branch cards and dialogs. These are ordinary CSS stylesheets; a forced migration to `styles.ts` would add unrelated styling changes.
- `router/` owns route composition and navigation metadata. `layouts/` owns the page shell. Providers supply state; hooks expose or implement behavior; context files define the context itself.
- Use `@/` for imports from the frontend source root. Use relative imports within a component or page folder. Export explicit names from local barrels; avoid importing private subcomponent internals across features.
- Fictional data lives under `mock-data/`, with the weekly chart fixture next to its owning page. Admin preview state remains in memory and resets on refresh.
- Add `api/` clients and API hooks when real authorized endpoints are connected. Preview state is not labelled as server state, and this refactor does not invent unused API adapters.

The shared UI colours are documented in [the palette guide](theme.md), with brand values defined once in `src/theme/colors.ts`.

## Shared library and tables

`packages/lib` replaces `packages/contracts` and is installed as `@presqio/lib` in both applications. Its type folders each contain a domain `.types.ts` file and an explicit type-only barrel. The package has no React, NestJS, Prisma or browser dependency.

```ts
import type {
  EmployeeTableRow,
  Approval,
  TableColumnDefinition,
  HealthResponse,
  ApiError,
} from "@presqio/lib";
```

Use the shared types for public domain summaries, API response contracts and table row models. Backend health responses and the exception envelope already use them. Frontend state and tables use shared employee, branch, business, shift, attendance, approval and activity shapes. `EmployeeTableRow` combines an employee summary and attendance snapshot; the avatar colour is a frontend-only extension under `src/types/admin-preview.ts`.

`DataTableColumn<Row>` in the frontend extends the framework-neutral `TableColumnDefinition` with a React cell renderer. `DataTable` is reused by employee and approval tables. Render functions are checked against the row type, so they cannot silently access unrelated table fields.

Public types deliberately do not expose raw credentials, refresh/activation token hashes, private image payloads, or Prisma persistence records. Prisma remains the backend source for database types. A shared public row is not a claim that every database column is safe to send to the frontend. Timestamps in API contracts use ISO strings.

The shared library builds to `packages/lib/dist`. Root installation builds it before Prisma generation. Root `yarn build` and `yarn typecheck` also build it before checking consumers. When changing shared contracts during development, run `yarn workspace @presqio/lib build` before consumer checks; generated outputs stay ignored.

## Backend ownership

- Keep framework setup in `main.ts` small. Configuration, middleware, pipes and filters belong in `app/common` and remain independent of attendance feature logic.
- Every domain lives under `app/features/<feature>/`. A module wires its controller, service and providers. Controllers handle transport and validation; services handle business rules and orchestration; repositories own nontrivial database queries.
- The health feature now demonstrates separate controller/service/module files. Unimplemented domains retain their honest module boundaries. Add controllers, DTOs, repositories and services when there is behavior to implement, rather than empty classes or unauthenticated CRUD endpoints.
- Add feature-local `dto/` for validated request classes, and `repositories/` or `types/` for persistence-specific concerns when needed. Shared TypeScript interfaces do not replace runtime validation or Swagger schemas.
- Derive tenant/user access on the server. Sharing an interface never makes browser-supplied roles, business IDs, verification flags or timestamps authoritative.
- Existing Prisma schema/migrations, environment values and database contents are unchanged by this refactor.

## Verification

Use `yarn typecheck`, `yarn build` and `yarn test` at the root. Admin browser regression checks cover the current forms, scoped filters, exports, routing and responsive layouts. Backend smoke checks cover liveness, the error envelope and Swagger without querying or migrating the configured database.
