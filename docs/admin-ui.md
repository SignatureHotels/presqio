# Admin UI: first development pass

The admin desktop prototype in `presqio_ui_prototype/presqio_admin_desktop.html` is now implemented as React components in `apps/frontend/src/app/admin/`. The original HTML files remain unchanged as design references. The employee prototype is reserved for the subsequent employee development pass.

Run `yarn ui:dev` from the repository root, then open http://localhost:300/admin/overview. The root URL redirects to this screen.

## Screens and working interactions

| Route                    | Current behavior                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `/admin/overview`        | Sample attendance counts, illustrative weekly chart, status breakdown, recent records, business performance and activity |
| `/admin/attendance/live` | Sample snapshot, search and status filters, employee details, CSV download                                               |
| `/admin/employees`       | Business-scoped directory, search, status filter, add employee form, details and scoped CSV download                     |
| `/admin/branches`        | Branch cards, sample perimeter illustrations and editable coordinates/radius/GPS accuracy                                |
| `/admin/shifts`          | Business shift templates, overnight shift creation, break/grace validation and required product policies                 |
| `/admin/corrections`     | Scoped review queue, required decision reason, pending/approved/rejected filters and sample activity updates             |
| `/admin/reports`         | Daily CSV export, derived sample statistics and an explicit disconnected Google Sheets setup explanation                 |
| `/admin/settings`        | Preview organization name and accurate implementation status for pending integrations                                    |

The business selector scopes counts, lists, requests and exports. Employee IDs are checked for duplicates within a business, and a new employee must belong to a branch of that business. Search retains focus while typing. CSV output escapes delimiters and spreadsheet formula prefixes. Forms use accessible MUI dialogs with keyboard/focus handling. Sidebar links use real React Router routes, support direct navigation and have accessible names in the collapsed layout.

Counters are derived from the sample employee records, rather than the prototype's separate larger totals. Late arrivals are a subset of present employees. Employees who have not checked in remain pending rather than being immediately marked absent. The weekly chart explicitly uses illustrative historical values; it does not claim to load actual histories.

Shared components now live in `apps/frontend/src/components`, the shell in `src/layouts/admin-layout`, and domain/table contracts in `packages/lib`. See [the structure guide](project-structure.md).

## Data and implementation boundary

A persistent on-screen notice identifies the fictional sample workspace. Changes live in React state only and reset on refresh. All screens use the fixed sample date 21 October 2026, with times labelled IST. No attendance, employee, biometric, spreadsheet or policy data is read from or written to Neon. No activation codes or real login accounts are created.

A sample approval changes only the sample review queue and activity feed; it does not create or modify punches. There are no controls for simulating a successful biometric attendance event. Reference photo storage, camera capture, real GPS validation, Google Sheets synchronization, and authentication/authorization remain unimplemented. These statuses are shown honestly in the UI.

`/home` is an employee-development placeholder; the employee flow has not been converted yet. `/owner/*` is a placeholder for a dedicated owner portal. The all-business selector is for visual review, not an implementation of production authorization.

## Verification and next work

Verify the frontend with `yarn workspace @presqio/frontend build`. Browser checks exercise navigation, business/search filtering, employee creation and details, scoped CSV contents, geofence editing, overnight shifts, request review and organization settings. Layouts are checked at desktop, tablet and mobile widths. Temporary browser-testing tools and screenshots are kept outside the repository.

Next implement authenticated admin sessions and server-derived memberships, then authorized business/branch/employee APIs and durable CRUD with tenant isolation tests. Connect these UI screens only after those boundaries exist. Add secure profile-photo enrollment, shifts/attendance workflows and durable Google Sheets synchronization before developing the employee camera/GPS flow against live data.
