/**
 * Returns `path` only if it's a same-site path like "/transactions?page=2".
 * Anything else ("https://evil.com", "//evil.com", "/\\evil.com") falls back,
 * so a crafted ?from= link can't send someone to another site after login.
 */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback = "/overview",
): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}
