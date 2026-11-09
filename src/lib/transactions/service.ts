import "server-only";
import { redirect } from "next/navigation";
import { appendAudit } from "@/lib/audit/audit";
import { getUserWithPermission } from "@/lib/auth/dal";
import { getSandbox, saveSandbox } from "@/lib/sandbox/sandbox";
import { getVisitorTransactions } from "@/lib/wallets/service";
import type { Transaction } from "@/lib/data/types";
import {
  filterTransactions,
  queryTransactions,
  type TransactionPage,
  type TransactionQuery,
  toSearchParams,
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
  return queryTransactions(await getVisitorTransactions(), query);
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  if (!(await getUserWithPermission("transactions:view"))) {
    redirect("/overview");
  }
  return (await getVisitorTransactions()).find((txn) => txn.id === id) ?? null;
}

/** Every transaction matching the filters, for CSV export. Null if not allowed. */
export async function exportTransactions(
  query: TransactionQuery,
): Promise<Transaction[] | null> {
  const user = await getUserWithPermission("transactions:export");
  if (!user) return null;
  const rows = filterTransactions(await getVisitorTransactions(), query);

  // Customer data leaving the system is exactly what an audit log is for
  const filters = [...toSearchParams({ ...query, page: 1, pageSize: 25 })]
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  const sandbox = await getSandbox();
  sandbox.audit = appendAudit(sandbox.audit, user, {
    action: "transactions.export",
    target: "Transactions (CSV)",
    detail: `${rows.length.toLocaleString("en-NG")} rows${filters ? `, ${filters}` : ", no filters"}`,
  });
  await saveSandbox(sandbox);
  return rows;
}

export async function canExportTransactions(): Promise<boolean> {
  return Boolean(await getUserWithPermission("transactions:export"));
}
