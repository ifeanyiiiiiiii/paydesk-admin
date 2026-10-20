/**
 * Dates are always shown in Lagos time. Without a fixed time zone the server
 * (UTC on Vercel) and the browser could render different times for the same
 * transaction.
 */
const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "2026-10-20T13:05:00Z" → "20 Oct 2026, 14:05" (Lagos is UTC+1). */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const numberFormat = new Intl.NumberFormat("en-NG");

export function formatCount(n: number): string {
  return numberFormat.format(n);
}
