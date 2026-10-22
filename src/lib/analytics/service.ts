import "server-only";
import { redirect } from "next/navigation";
import { getUserWithPermission } from "@/lib/auth/dal";
import { DATA_END } from "@/lib/data/seed";
import { getAllTransactions } from "@/lib/data/store";
import {
  computeOverview,
  lagosDay,
  type Overview,
  type Range,
} from "./overview";

// The demo data is fixed, so each range is computed once per server instance
const cache = new Map<Range, Overview>();

/**
 * The overview for the last `range` days of the demo data. Periods end on
 * the data's last day rather than today, so the dashboard never goes empty
 * as the real calendar moves on.
 */
export async function getOverview(range: Range): Promise<Overview> {
  if (!(await getUserWithPermission("overview:view"))) redirect("/login");

  let overview = cache.get(range);
  if (!overview) {
    const lastDay = lagosDay(new Date(DATA_END).toISOString());
    overview = computeOverview(getAllTransactions(), range, lastDay);
    cache.set(range, overview);
  }
  return overview;
}
