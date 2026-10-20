"use server";

import { redirect } from "next/navigation";
import { findDemoUser } from "./demo-users";
import { safeRedirectPath } from "./redirect";
import { createSession, deleteSession } from "./session";

export async function signIn(formData: FormData): Promise<void> {
  // Never trust form input: check the account really exists
  const user = findDemoUser(String(formData.get("userId") ?? ""));
  if (!user) redirect("/login");

  await createSession(user.id);
  redirect(safeRedirectPath(formData.get("from")?.toString()));
}

export async function signOut(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
