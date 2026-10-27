import "server-only";
import { getOptionalUser } from "./dal";
import type { User } from "./demo-users";
import { can, type Permission } from "./permissions";

/**
 * Permission check for API routes. Unlike pages, an API shouldn't redirect
 * to the login page: it answers with a status code the client can handle.
 * 401 = not signed in, 403 = signed in but not allowed.
 */
export async function authorizeApi(
  permission: Permission,
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  const user = await getOptionalUser();
  if (!user) {
    return {
      error: Response.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  if (!can(user.role, permission)) {
    return {
      error: Response.json(
        { error: "You don't have permission to do this" },
        { status: 403 },
      ),
    };
  }
  return { user };
}
