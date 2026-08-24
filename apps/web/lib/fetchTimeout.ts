/** Fetch with an abort timeout so hung API calls do not freeze the UI. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 12_000,
): Promise<Response> {
  const signal = init?.signal ?? AbortSignal.timeout(timeoutMs);
  return fetch(input, { ...init, signal });
}
