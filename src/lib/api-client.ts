/** An error with the server's message, so the UI can show it as-is. */
class ApiError extends Error {}

/** Calls one of our JSON APIs, turning any failure into a readable message. */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  }).catch(() => {
    throw new ApiError(
      "We couldn't reach the server. Check your connection and try again.",
    );
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.error ?? "Something went wrong. Please try again.",
    );
  }
  return body as T;
}
