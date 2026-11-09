import { type NextRequest, NextResponse } from "next/server";
import { getAdmins } from "@/lib/admins/service";
import { findDemoUser } from "@/lib/auth/demo-users";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { createSession } from "@/lib/auth/session";

/**
 * POST /auth/sign-in, from a plain HTML form. Answering with a redirect makes
 * the browser load the next page in full, so nothing from an earlier session
 * on this tab survives in memory.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new Response("Cross-site sign-in refused", { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  // Never trust form input: check the account really exists and is active
  const user = findDemoUser(String(form?.get("userId") ?? ""));
  const admin = user && (await getAdmins()).find((a) => a.id === user.id);
  if (!user || admin?.status !== "active") {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  await createSession(user.id);
  const to = safeRedirectPath(form?.get("from")?.toString());
  // 303 turns the POST into a normal GET of the next page
  return NextResponse.redirect(new URL(to, request.url), 303);
}
