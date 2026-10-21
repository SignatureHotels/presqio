# @presqio/lib

Shared, framework-neutral public types for the frontend and backend. Each domain owns `src/types/<domain>/<domain>.types.ts` and an explicit type-only export.

Use `import type { EmployeeTableRow, Branch, HealthResponse } from '@presqio/lib'`.

Keep React renderers and presentation-only fields in the frontend. Keep Prisma models, credentials, token hashes and provider secrets in the backend. Runtime request validation remains a backend responsibility.

`yarn workspace @presqio/lib build` emits declarations and an empty CommonJS entry point to `dist`. Root `yarn install`, `yarn build` and `yarn typecheck` build this package before consumers. Rebuild it after changing shared types during development.

See [project structure](../../docs/project-structure.md) for ownership and table conventions.
