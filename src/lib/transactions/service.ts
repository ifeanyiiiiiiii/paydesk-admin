import "server-only";
import { redirect } from "next/navigation";
import { getUserWithPermission } from "@/lib/auth/dal";
import { getAllTransactions } from "@/lib/data/store";
import {
  queryTransactions,
  type TransactionPage,
  type TransactionQuery,
} from "./query";

/**
 * The only way pages read transactions. Checks permission next to the data,
 * so even a page that forgot its own check can't leak transactions.
 */
export async function listTransactions(
  query: TransactionQuery,
): Promise<TransactionPage> {
  if (!(await getUserWithPermission("transactions:view"))) {
    redirect("/overview");
  }
  return queryTransactions(getAllTransactions(), query);
}
