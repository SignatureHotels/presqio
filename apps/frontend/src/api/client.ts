import type { ApiError, AuthSessionResponse } from "@presqio/lib";

const BASE = "/api/v1";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The access token lives only in memory; the refresh token is an httpOnly cookie. */
let accessToken: string | null = null;
/** Endpoints that never carry a session worth refreshing for. */
const NO_REFRESH =
  /^\/auth\/(login|register|refresh|logout|verify-email|forgot-password|reset-password)$/;
let refreshing: Promise<AuthSessionResponse | null> | null = null;
let onSessionChange: (session: AuthSessionResponse | null) => void = () => {};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const subscribeToSession = (listener: typeof onSessionChange) => {
  onSessionChange = listener;
};

/** Turns a fetch response into data, or an ApiRequestError with the server's message. */
export async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 202) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as ApiError | null)?.message;
    throw new ApiRequestError(
      response.status,
      Array.isArray(message)
        ? message.join(". ")
        : (message ?? "Something went wrong. Please try again."),
    );
  }
  return body as T;
}

/** Uses the refresh cookie to get a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<AuthSessionResponse | null> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setAccessToken(null);
          onSessionChange(null);
        }
        return null;
      }
      const session = await parse<AuthSessionResponse>(response);
      setAccessToken(session.accessToken);
      onSessionChange(session);
      return session;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const send = () =>
    fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "include",
      headers: {
        ...(init.body !== undefined && { "content-type": "application/json" }),
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  let response = await send();
  if (response.status === 401 && accessToken && !NO_REFRESH.test(path)) {
    if (await refreshSession()) response = await send();
  }
  return parse<T>(response);
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

/** Authenticated binary download (e.g. a check-in photo) as an object URL for <img src>. */
export async function apiObjectUrl(path: string): Promise<string> {
  const send = () =>
    fetch(`${BASE}${path}`, {
      credentials: "include",
      headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    });
  let response = await send();
  if (response.status === 401 && accessToken && (await refreshSession())) response = await send();
  if (!response.ok) await parse(response);
  return URL.createObjectURL(await response.blob());
}
