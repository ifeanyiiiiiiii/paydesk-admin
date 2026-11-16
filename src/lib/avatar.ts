/**
 * Tints for people's initials. Green, amber and red are left out on purpose:
 * on this dashboard they mean successful, pending and failed.
 */
const tones = [
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
] as const;

/** The same name always gets the same tint, on every page. */
export function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tones[hash % tones.length];
}
