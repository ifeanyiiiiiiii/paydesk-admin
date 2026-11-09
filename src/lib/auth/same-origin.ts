import "server-only";
import type { NextRequest } from "next/server";

/**
 * True when a form post came from PayDesk itself. Browsers always send an
 * Origin header with a POST, so a form on another site can't sign visitors in
 * or out (cross-site request forgery). Server Actions do this check for you;
 * plain route handlers have to do it themselves.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
