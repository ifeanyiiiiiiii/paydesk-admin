/** Builds a link to the transactions page with filters, for chart drill-downs. */
export function transactionsHref(filters: {
  from: string;
  to: string;
  status?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  params.set("from", filters.from);
  params.set("to", filters.to);
  return `/transactions?${params}`;
}

const shortDay = new Intl.DateTimeFormat("en-NG", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const longDay = new Intl.DateTimeFormat("en-NG", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "2026-10-14" → "14 Oct". The input is already a Lagos day, so format it as-is. */
export function formatDay(day: string): string {
  return shortDay.format(new Date(`${day}T00:00:00Z`));
}

/** "2026-10-14" → "Wed, 14 Oct 2026". */
export function formatLongDay(day: string): string {
  return longDay.format(new Date(`${day}T00:00:00Z`));
}
