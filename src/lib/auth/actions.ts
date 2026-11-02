"use server";

import { redirect } from "next/navigation";
import { getAdmins } from "@/lib/admins/service";
import { findDemoUser } from "./demo-users";
import { safeRedirectPath } from "./redirect";
import { createSession, deleteSession } from "./session";

export async function signIn(formData: FormData): Promise<void> {
  // Never trust form input: check the account really exists and is active
  const user = findDemoUser(String(formData.get("userId") ?? ""));
  const admin = user && (await getAdmins()).find((a) => a.id === user.id);
  if (!user || admin?.status !== "active") redirect("/login");

  await createSession(user.id);
  redirect(safeRedirectPath(formData.get("from")?.toString()));
}

export async function signOut(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
