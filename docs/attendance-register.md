# Admin attendance register

Open **Attendance register** in the sidebar (`/admin/attendance/live`).
`/admin/attendance/history` also opens the register. The default range is the last
seven calendar days in the business time zone. Choose From/To and Show attendance
for any inclusive range of up to 31 days.

Employees appear as rows and dates as columns, with a sticky employee column and
scrollable dates. Each date has separate In and Out sections showing the time and original selfie
directly in the grid. Multiple sessions are stacked as separate in/out pairs.
Cells also show status and completed hours. A next-day punch is marked `+1d`.
Open Day details to see each session's branch/shift, full local dates and times,
early departure, corrected times, and check-in/out selfies. Select a selfie to
enlarge it. Photos use the existing authenticated endpoint. Grid thumbnails load when near
the visible scroll area, and clicking a thumbnail enlarges it. Missing/deleted photos and corrections without a checkout
photo are labelled explicitly. Original selfies are kept alongside corrected times.

The toolbar's branch and search filters apply. Branch filtering includes employees
assigned there during the period and employees who recorded sessions there;
only that branch's sessions appear. Employee search matches name or employee ID.
The API paginates employees in groups of 25 and returns all selected dates for
those employees. Export this page writes one CSV row per recorded session plus
rows for empty dates, using the current applied range/filters. It does not export
photo URLs or image data. Use Next/Previous for more employees. The current page
refreshes every 30 seconds and when the window gains focus.

- Present/Late comes from recorded sessions and the saved shift start/grace.
- Rest day comes from the shift assignment's saved working days for that date.
- On leave uses uncancelled recorded leave.
- Not employed marks dates before the employee's joined date (creation date if absent).
- No record describes a past day without attendance; it does not assert absence.
- Not checked in describes an empty day today; Scheduled describes a future day.
- Hours include completed sessions only. Ongoing sessions are labelled separately.
- Gaps between sessions are shown in details. They do not establish an approved break;
  the system does not currently track approved breaks separately.

No schema migration is required. The API endpoint is
`GET /api/v1/organizations/:organizationId/businesses/:businessId/attendance/register`
with `from`, `to`, optional `branchId`, optional `search`, and `page` query parameters.
It uses the existing organization/business access guards. Requests are bounded to
31 dates and 25 employees, and all data queries are business-scoped.

Regression checks cover date boundaries, multiple/overnight/ongoing sessions,
leave/rest/missing-day labels, correction and selfie metadata, tenant/filter
query scope, pagination, timezone display and CSV escaping. Service checks use
database doubles. Verify the grid and image previews against a deployed database
and browser before release.
