# Presqio Attendance UI Prototype

This is an interactive **UI-only web prototype**. It is not connected to a backend, geolocation provider, camera, or real biometric face verification. All employee records and attendance values are fictional sample data.

## Files
- attendance_ui_preview.html: switch between Admin desktop and Employee mobile using the top tabs
- presqio_admin_desktop.html: opens with the Admin view selected
- presqio_employee_mobile.html: opens with the mobile Employee view selected

## How to view
Open any HTML file in a desktop web browser. No installation or server is required. The mobile interface is inside a phone-sized frame when viewed on a desktop; if opened on a phone, it occupies the full screen.

## Try these interactions
- Admin: click Overview / Live Attendance / Employees / Branches / Shifts / Approvals / Reports / Settings, change business selector, add a fictional employee, or download example CSV.
- Employee: click Start Check In > Continue to selfie > Simulate verification. Then return to Admin to see the example employee attendance change. Use History, Requests, and Profile from the mobile bottom navigation.

## Important
All biometric and GPS verification results in this prototype are **simulations** and cannot be used as real attendance records. Build the secure NestJS backend, geofence validation, live-camera integration, face-liveness API, and audit logging before production use.

Working title: Presqio (not trademark-cleared or verified as an available domain).
