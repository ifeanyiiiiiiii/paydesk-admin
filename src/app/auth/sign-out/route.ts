import { type NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { deleteSession } from "@/lib/auth/session";

/** POST /auth/sign-out: ends the session with a full page load to /login. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new Response("Cross-site sign-out refused", { status: 403 });
  }
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
