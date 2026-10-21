/** The browser talks to the same-origin API proxy; deployment addresses stay server-side. */
export function readApiPath(value: string | undefined) {
  const path = value?.trim().replace(/\/+$/, "");
  if (!path || !/^\/api\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path)) {
    throw new Error("Set VITE_API_URL to the same-origin API path, for example /api/v1. Put the backend host in BACKEND_ORIGIN.");
  }
  return path;
}

export function readBackendOrigin(value: string | undefined) {
  try {
    const origin = new URL(value?.trim() ?? "");
    if (!["http:", "https:"].includes(origin.protocol) || origin.pathname !== "/" || origin.username || origin.password || origin.search || origin.hash) throw new Error();
    return origin.origin;
  } catch {
    throw new Error("Set BACKEND_ORIGIN to your backend's HTTP(S) origin, without an API path, credentials or query.");
  }
}
