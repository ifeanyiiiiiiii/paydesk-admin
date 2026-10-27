import "server-only";
import { redirect } from "next/navigation";
import { lagosDay } from "@/lib/analytics/overview";
import { getUserWithPermission } from "@/lib/auth/dal";
import { DATA_END } from "@/lib/data/seed";
import { getAllTransactions, getBusinesses } from "@/lib/data/store";
import { getWallets } from "@/lib/wallets/service";
import { type BusinessRow, summariseBusinesses } from "./businesses";

export async function listBusinesses(): Promise<BusinessRow[]> {
  if (!(await getUserWithPermission("businesses:view"))) redirect("/overview");
  return summariseBusinesses(
    getBusinesses(),
    getAllTransactions(),
    // Includes this visitor's own wallet changes
    await getWallets(),
    lagosDay(new Date(DATA_END).toISOString()),
  );
}
