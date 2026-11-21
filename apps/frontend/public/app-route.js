// The prerendered home page also serves /admin, /employee, /kiosk...: hide its text off its own path.
// A file rather than an inline script, because the CSP allows only same-origin scripts.
if (location.pathname !== document.currentScript.dataset.path) document.documentElement.className += " app-route";
