import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic auth check: only looks for the session cookie, without decrypting
 * it, to send signed-out visitors to /login quickly. The real check happens in
 * the data access layer (src/lib/auth/dal.ts), which every protected page and
 * data call goes through.
 *
 * It deliberately doesn't redirect /login to the dashboard when a cookie
 * exists: an expired or tampered cookie would then bounce between the two
 * pages forever. The login page checks the decrypted session instead.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname !== "/login" && !request.cookies.has(SESSION_COOKIE)) {
    // APIs answer with a status code; redirecting them to an HTML login
    // page would hand the client a web page where it expects JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
