# Deploy Presqio: Cloudflare Pages + Render

Read the [production readiness review](production-readiness.md) for remaining functionality and release gates.

Both services build from the repository root. Use Node 24 and Yarn 1.22.22.
The frontend is a Vite SPA. Cloudflare Pages hosts its build and runs the
`public/_worker.js` API proxy. The backend runs as a Docker service on Render.
The frontend Dockerfile is an alternative Nginx host; Cloudflare Pages builds
and publishes static files rather than running that container.

## 1. Database

Provision PostgreSQL with PostGIS (for example Neon with PostGIS enabled).
Committed Prisma migrations install extensions and the schema. The migration
account needs extension creation permissions. Use a provider connection string
with SSL as required by that provider. Do not use local development credentials.

## 2. Render backend

Connect this repository using the root `render.yaml` Blueprint, or create a
Docker web service with Dockerfile `apps/backend/Dockerfile` and Docker context `.`.
The Blueprint selects the paid Starter plan because this app sends email over
SMTP. [Render Free blocks outbound SMTP ports 25, 465 and 587](https://render.com/docs/free).
Switching to Free requires an email provider on another supported port or an
HTTPS email integration (not currently implemented). Set the following in Render:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | Your Postgres connection string |
| `JWT_SECRET` | Random secret, at least 32 characters; Blueprint generates one |
| `UI_ORIGIN` | Exact frontend origin, e.g. `https://presqio.pages.dev`, no trailing slash |
| `APP_URL` | Same public frontend origin, used in email links |

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`
for verification/reset emails. Without SMTP, production messages are not sent; only a warning is logged. Configure all five `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET`,
`B2_KEY_ID`, `B2_APPLICATION_KEY` values for private object storage; otherwise
selfies are stored in Postgres. Redis is only needed for the separate optional
worker, which this Blueprint does not deploy.

The container runs committed migrations before starting the API. Do not override
its start command unless you also arrange `prisma migrate deploy`. The readiness
path is `/api/v1/health/ready`. `/api/v1/health` checks process liveness only.

## 3. Cloudflare Pages frontend

Connect the repository as a Pages project with:

| Setting | Value |
| --- | --- |
| Root directory | Repository root (leave blank) |
| Framework preset | None |
| Build command | `yarn workspace @presqio/lib build && yarn workspace @presqio/frontend build` |
| Build output directory | `apps/frontend/dist` |
| Build environment `NODE_VERSION` | `24` |
| Build environment `YARN_VERSION` | `1.22.22` |
| Build environment `VITE_API_URL` | `/api/v1` |
| Production runtime variable `BACKEND_ORIGIN` | Your Render origin, e.g. `https://presqio-backend.onrender.com` |

`BACKEND_ORIGIN` must be HTTPS, with no path, credentials, or query. Do not add
`/api/v1`. The Worker forwards `/api/*`, including cookie, authorization, request
body, and original Origin. API responses are never cached. Everything else is
served by Pages, including SPA fallback for `/admin/*` and `/employee/*`.
The generated `dist/_worker.js` and `dist/_routes.json` must be included in the
Pages deployment. Do not deploy `src` or the repository as the output directory.

Use **both** variables. `VITE_API_URL` is the public same-origin API path compiled
into the browser bundle. `BACKEND_ORIGIN` is the backend host read by the Pages
Worker at runtime. Do not put the Render address into `VITE_API_URL`. Change the
public path only when backend routes and proxy routes are updated together.
Vite refuses to build without a valid `VITE_API_URL`; there is no URL fallback.

The browser calls the configured `/api/v1` path on the frontend origin. Refresh cookies consequently
remain first party with the existing HttpOnly, Secure and SameSite=Lax settings.
Do not change browser API URLs to the Render address. After assigning a custom
frontend domain, update `UI_ORIGIN` and `APP_URL` in Render. Preview deployment
origins need a matching staging backend; production accepts its configured origin.
No JWT, database, mail, or storage credentials belong in frontend variables.

## Alternative Docker frontend

From the repository root:

```sh
docker build -f apps/backend/Dockerfile -t presqio-backend .
docker build -f apps/frontend/Dockerfile --build-arg VITE_API_URL=/api/v1 -t presqio-frontend .
docker run --rm -p 8080:8080 --env-file /path/to/production-backend.env presqio-backend
docker run --rm -p 3000:80 -e BACKEND_ORIGIN=https://presqio-backend.onrender.com presqio-frontend
```

The Docker build requires the `VITE_API_URL` build argument, and the frontend
container requires `BACKEND_ORIGIN` at runtime. Neither has a default value.
Use an origin without a trailing slash for the Nginx proxy. Serve this frontend
behind HTTPS for camera and location permissions, and set backend `UI_ORIGIN`
to that frontend's origin. `.dockerignore` excludes local `.env` files.

## Deployment smoke checks

1. Open `/api/v1/health/ready` on the **frontend** origin; expect JSON with connected database/schema.
2. Register an admin, follow email verification, finish onboarding, create a branch with a perimeter and a shift.
3. Add an employee, edit their branch/shift/contact fields, and copy their employee ID.
4. On an HTTPS phone browser, open `/employee`, sign in with that ID, and reload to verify cookie restoration.
5. Allow camera and location. Check in within the perimeter; verify a saved selfie, history entry, and admin attendance within 30 seconds or after window focus.
6. Check out early; verify worked minutes and the early departure indication. Check in again to test multiple sessions.
7. Attempt a check-in outside the branch, deny permissions, and retry a rejected attempt. No rejected attempt should create attendance.
8. Take future leave and cancel it. Take today's leave then check in; today's leave should cancel automatically. Past leave and leave on an attended day must fail.
9. Request a time correction, approve/reject it as admin, and verify employee status/history after returning to those pages. Invalid time order should show a readable validation error.
10. Pause an employee, verify attendance is denied, then reactivate. Sign out and switch employees on a shared phone. Verify CSV export and branch/status/search filters.
11. Sign out as admin and employee separately; verify neither session signs out the other.

## Verification boundary

`yarn typecheck`, `yarn test`, and `yarn build` cover compilation, regression
checks and production bundle generation. New service tests use database doubles;
they do not prove actual PostGIS/Prisma transactions. Run
`node scripts/test-database.cjs` only against a migrated disposable database.
Docker image builds require Docker, which was unavailable in the development
environment used for this change. Deployment smoke checks above remain necessary.
Google Sheets sync and face recognition are deferred and are not required for
this release. Each accepted in/out punch stores selfie evidence, checks GPS and
records its date/time on the server.

Provider references: [Cloudflare Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/),
[Function routing](https://developers.cloudflare.com/pages/functions/routing/),
[Render Blueprint fields](https://render.com/docs/blueprint-spec).

## Local frontend environment

Copy `apps/frontend/.env.example` to `apps/frontend/.env` and set:

```dotenv
VITE_API_URL=/api/v1
BACKEND_ORIGIN=http://localhost:8080
```

Replace the backend origin if your local API uses another address or port.
Vite development and preview proxies read this value from the environment; no
backend address is embedded in their configuration. Restart Vite after changes.
The local `.env` remains ignored by Git and Docker. CI sets the public API path
explicitly. Node frontend tests load the nonsecret example environment and inject
the same build constant that Vite normally supplies.

[Vite environment variables](https://vite.dev/guide/env-and-mode) are compiled at
build time; [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)
provide the Worker runtime environment. Redeploy Pages after setting/changing
these values. Backend secrets still belong only in Render.
