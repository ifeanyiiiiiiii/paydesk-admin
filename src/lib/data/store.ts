import "server-only";
import { generateBusinesses, generateTransactions } from "./seed";
import type { Business, Transaction } from "./types";

/**
 * In-memory stand-in for a database. Generated once per server instance and
 * shared by every request; swap these functions for real queries later
 * without touching the pages.
 */
let businesses: Business[] | undefined;
let transactions: Transaction[] | undefined;

export function getBusinesses(): Business[] {
  businesses ??= generateBusinesses();
  return businesses;
}

export function getAllTransactions(): Transaction[] {
  transactions ??= generateTransactions(getBusinesses());
  return transactions;
}
