/** Bound the whole request, including reading the response body. Never retry writes here. */
export async function request<T>(
  url: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(url, { ...init, signal: controller.signal }).then(read),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("The server is taking too long to respond. Please try again."));
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
