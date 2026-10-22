import "server-only";
import { redirect } from "next/navigation";
import { getUserWithPermission } from "@/lib/auth/dal";
import { getAllTransactions } from "@/lib/data/store";
import type { Transaction } from "@/lib/data/types";
import {
  filterTransactions,
  queryTransactions,
  type TransactionPage,
  type TransactionQuery,
} from "./query";

/*
 * The only way pages read transactions. Each function checks permission next
 * to the data, so even a page that forgot its own check can't leak anything.
 */

export async function listTransactions(
  query: TransactionQuery,
): Promise<TransactionPage> {
  if (!(await getUserWithPermission("transactions:view"))) {
    redirect("/overview");
  }
  return queryTransactions(getAllTransactions(), query);
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  if (!(await getUserWithPermission("transactions:view"))) {
    redirect("/overview");
  }
  return getAllTransactions().find((txn) => txn.id === id) ?? null;
}

/** Every transaction matching the filters, for CSV export. Null if not allowed. */
export async function exportTransactions(
  query: TransactionQuery,
): Promise<Transaction[] | null> {
  if (!(await getUserWithPermission("transactions:export"))) return null;
  return filterTransactions(getAllTransactions(), query);
}

export async function canExportTransactions(): Promise<boolean> {
  return Boolean(await getUserWithPermission("transactions:export"));
}
