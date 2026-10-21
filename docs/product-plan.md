# Current product scope and hosting plan

Updated 21 October 2026. The current scope is selfie evidence + GPS attendance.
Google Sheets connection/sync, face recognition, reference-photo enrollment and
liveness detection are deferred by the user's decision. They are not release
requirements for this version.

## Attendance flow

1. An admin creates branches with GPS perimeters, shifts and employees.
2. An employee signs in using the current employee ID flow.
3. For each check-in or check-out, the employee app captures a camera selfie and
   requests a current location reading. It receives an expiring server attempt.
4. The backend validates the employee/session, attempt, GPS accuracy, freshness
   and branch perimeter. The selfie is saved as evidence.
5. An accepted punch records its date/time on the server and opens/closes the
   attendance session. Attendance time does not come from image metadata or a
   trusted client clock. A selfie is evidence for admin review.
6. Admins see each date's In time + selfie and Out time + selfie directly in the
   attendance grid. Each additional session has its own pair. Clicking a photo
   enlarges it; day details show full dates/times, branch, shift and corrections.
7. CSV exports provide attendance data and selfie availability. Image bytes are
   viewed through the authenticated app rather than embedded in CSV files.

Both in and out still require a selfie and passing GPS. Early checkouts and
multiple sessions are supported. An ongoing session remains open until checkout
or an approved correction; no checkout time or photo is invented.

## Hosting

| Responsibility | Current implementation |
| --- | --- |
| Web frontend and API proxy | Cloudflare Pages |
| NestJS backend | Render Docker service |
| Attendance records and spatial checks | PostgreSQL with PostGIS, such as Neon |
| Selfie storage | Database by default; optional private Backblaze B2 via S3 API |
| Account email | Configured SMTP server |
| Reporting | Admin date grid, overview and CSV |

No Google credentials or face-provider credentials are needed for this scope.
Photo previews require an authorized admin API request. Browser camera/location
require HTTPS in deployment. No background location tracking is performed.

## Deferred and separate work

Sheets and face recognition can be reconsidered later. Legacy face tables and
previous migrations remain intact to preserve existing database history; the
application no longer loads the empty face module, queries face status for
attendance, or displays face-verification fields in its API/export models.
No destructive database change is required for this scope update.

Other readiness items remain separate: employee login policy, backend branch
access restrictions, completely missed-day corrections, retention, operational
recovery and live end-to-end testing. See the [production readiness plan](production-readiness.md)
and [deployment guide](deployment.md).

Earlier architecture documents describe a broader proposed product. This current
scope takes precedence where those documents describe face matching or Sheets.
