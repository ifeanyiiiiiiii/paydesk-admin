import "server-only";
import { generateWallets } from "@/lib/wallets/wallets";
import { generateBusinesses, generateTransactions } from "./seed";
import type { Business, Transaction, Wallet } from "./types";

/**
 * In-memory stand-in for a database. Generated once per server instance and
 * shared by every request; swap these functions for real queries later
 * without touching the pages.
 */
let businesses: Business[] | undefined;
let transactions: Transaction[] | undefined;
let wallets: Wallet[] | undefined;

export function getBusinesses(): Business[] {
  businesses ??= generateBusinesses();
  return businesses;
}

export function getAllTransactions(): Transaction[] {
  transactions ??= generateTransactions(getBusinesses());
  return transactions;
}

/** The shared starting wallets. Each visitor's own changes are layered on top (see lib/sandbox). */
export function getSeedWallets(): Wallet[] {
  wallets ??= generateWallets(getBusinesses(), getAllTransactions());
  return wallets;
}
