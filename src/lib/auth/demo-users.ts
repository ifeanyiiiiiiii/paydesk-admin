import type { Role } from "./permissions";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Fictional demo accounts, one per role. There are no passwords: the login
 * page lets visitors pick an account so they can explore each role.
 */
export const demoUsers: readonly User[] = [
  {
    id: "usr_adaeze",
    name: "Adaeze Okafor",
    email: "adaeze@paydesk.example",
    role: "super_admin",
  },
  {
    id: "usr_tunde",
    name: "Tunde Bakare",
    email: "tunde@paydesk.example",
    role: "operations",
  },
  {
    id: "usr_ngozi",
    name: "Ngozi Eze",
    email: "ngozi@paydesk.example",
    role: "viewer",
  },
];

export function findDemoUser(id: string): User | undefined {
  return demoUsers.find((user) => user.id === id);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
