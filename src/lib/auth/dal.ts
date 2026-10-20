import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findDemoUser, type User } from "./demo-users";
import { can, type Permission } from "./permissions";
import { getSession } from "./session";

/**
 * Data access layer: the one place that decides who the current user is.
 * Pages and data functions call these instead of reading cookies themselves,
 * so authorization happens on the server, right next to the data.
 *
 * Wrapped in React's cache() so the session is read once per request, however
 * many components ask for the user.
 */
/** The signed-in user, or null. For pages that work either way, like /login. */
export const getOptionalUser = cache(async (): Promise<User | null> => {
  const { userId } = await getSession();
  return (userId && findDemoUser(userId)) || null;
});

/** The signed-in user. Redirects to /login if there's no valid session. */
export async function getCurrentUser(): Promise<User> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the current user if they have the permission, otherwise null. */
export async function getUserWithPermission(
  permission: Permission,
): Promise<User | null> {
  const user = await getCurrentUser();
  return can(user.role, permission) ? user : null;
}
