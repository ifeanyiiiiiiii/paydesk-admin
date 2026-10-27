import { lagosDay } from "@/lib/analytics/overview";
import type {
  Business,
  Transaction,
  Wallet,
  WalletStatus,
} from "@/lib/data/types";
import { type Kobo, kobo } from "@/lib/money";

export interface BusinessRow extends Business {
  /** Successful volume and transaction count in the last 30 days. */
  volume30d: Kobo;
  transactions30d: number;
  walletId: string;
  balance: Kobo;
  walletStatus: WalletStatus;
}

/**
 * One row per business for the directory: its profile, 30 days of activity
 * up to and including `to` (a Lagos day), and its wallet. Sorted by volume.
 */
export function summariseBusinesses(
  businesses: readonly Business[],
  transactions: readonly Transaction[],
  wallets: readonly Wallet[],
  to: string,
): BusinessRow[] {
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - 29 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const activity = new Map<string, { volume: number; count: number }>();
  for (const txn of transactions) {
    if (txn.status !== "successful") continue;
    const day = lagosDay(txn.createdAt);
    if (day < from || day > to) continue;
    const entry = activity.get(txn.businessId) ?? { volume: 0, count: 0 };
    entry.volume += txn.amount;
    entry.count += 1;
    activity.set(txn.businessId, entry);
  }

  const walletByBusiness = new Map(wallets.map((w) => [w.businessId, w]));

  return businesses
    .map((business) => {
      const wallet = walletByBusiness.get(business.id);
      if (!wallet) throw new Error(`No wallet for ${business.id}`);
      const { volume = 0, count = 0 } = activity.get(business.id) ?? {};
      return {
        ...business,
        volume30d: kobo(volume),
        transactions30d: count,
        walletId: wallet.id,
        balance: wallet.balance,
        walletStatus: wallet.status,
      };
    })
    .sort((a, b) => b.volume30d - a.volume30d);
}
