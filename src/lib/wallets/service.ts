import "server-only";
import { getAllTransactions, getSeedWallets } from "@/lib/data/store";
import type { PayableWallet, Transaction, Wallet } from "@/lib/data/types";
import type { Role } from "@/lib/auth/permissions";
import { applyFeeOverrides, resolveFeeRule } from "@/lib/fees/fees";
import { kobo } from "@/lib/money";
import { getSandbox, type Sandbox, saveSandbox } from "@/lib/sandbox/sandbox";
import { lookupAccount } from "./bank-lookup";
import {
  applyWalletOverrides,
  changeWalletStatus,
  type StatusChangeResult,
  walletForRole,
  type WalletStatusChange,
} from "./wallets";
import {
  applyWalletDebits,
  checkWithdrawal,
  quoteWithdrawal,
  type Withdrawal,
  type WithdrawalError,
  type WithdrawalRequest,
  withdrawalToTransaction,
} from "./withdrawals";

const WITHDRAWAL_HISTORY_LIMIT = 10;

/** The seed wallets as this visitor sees them. */
function walletsFor(sandbox: Sandbox): PayableWallet[] {
  const fees = applyFeeOverrides(sandbox.fees);
  return applyWalletDebits(
    applyWalletOverrides(getSeedWallets(), sandbox.wallets),
    sandbox.debits,
  ).map((wallet) => ({
    ...wallet,
    withdrawalFee: resolveFeeRule(fees, wallet.businessId, "withdrawal"),
  }));
}

/**
 * The shared wallets with this visitor's own changes applied. For use on the
 * server: anything sent to a browser should come from getWalletsFor.
 */
export async function getWallets(): Promise<Wallet[]> {
  return walletsFor(await getSandbox());
}

/** The wallets as this role may see them. */
export async function getWalletsFor(role: Role): Promise<Wallet[]> {
  return (await getWallets()).map((wallet) => walletForRole(wallet, role));
}

/** The shared transactions plus this visitor's own withdrawals, newest first. */
export async function getVisitorTransactions(): Promise<Transaction[]> {
  const { withdrawals } = await getSandbox();
  if (withdrawals.length === 0) return getAllTransactions();

  const wallets = new Map(getSeedWallets().map((w) => [w.id, w]));
  const own = withdrawals.flatMap((withdrawal) => {
    const wallet = wallets.get(withdrawal.walletId);
    return wallet ? [withdrawalToTransaction(withdrawal, wallet)] : [];
  });
  return [...own, ...getAllTransactions()];
}

/**
 * Freezes or unfreezes a wallet in this visitor's sandbox. Callers must
 * check the wallets:freeze permission first.
 */
export async function setWalletStatus(
  id: string,
  change: WalletStatusChange,
  actor: string,
): Promise<StatusChangeResult | { ok: false; error: "not_found" }> {
  const sandbox = await getSandbox();
  const wallet = walletsFor(sandbox).find((w) => w.id === id);
  if (!wallet) return { ok: false, error: "not_found" };

  const result = changeWalletStatus(
    wallet,
    change,
    actor,
    new Date().toISOString(),
  );
  if (result.ok) {
    const { status, frozen } = result.wallet;
    sandbox.wallets[id] = frozen ? { status, frozen } : { status };
    await saveSandbox(sandbox);
  }
  return result;
}

export type WithdrawalResult =
  | { ok: true; wallet: Wallet; withdrawal: Withdrawal; replayed: boolean }
  | { ok: false; error: WithdrawalError | "not_found" | "account_not_found" };

/**
 * Withdraws from a wallet. Everything that matters is decided here, not by
 * the client: the balance and freeze status are re-checked, the fee is
 * recalculated, and the account name comes from the lookup. Callers must
 * check the wallets:withdraw permission first.
 */
export async function createWithdrawal(
  walletId: string,
  request: WithdrawalRequest,
  actor: string,
): Promise<WithdrawalResult> {
  const sandbox = await getSandbox();
  const wallet = walletsFor(sandbox).find((w) => w.id === walletId);
  if (!wallet) return { ok: false, error: "not_found" };

  // Idempotency: a retry or double submit with the same key returns the
  // original result instead of paying a second time
  const existing = sandbox.withdrawals.find(
    (w) => w.id === request.idempotencyKey,
  );
  if (existing) {
    return { ok: true, wallet, withdrawal: existing, replayed: true };
  }

  const amount = kobo(request.amount);
  const error = checkWithdrawal(wallet, amount);
  if (error) return { ok: false, error };

  const accountName = lookupAccount(request.accountNumber);
  if (!accountName) return { ok: false, error: "account_not_found" };

  const { fee, total } = quoteWithdrawal(amount, wallet.withdrawalFee);
  // Never charge a different fee from the one the admin just approved
  if (fee !== request.expectedFee) return { ok: false, error: "fee_changed" };

  const withdrawal: Withdrawal = {
    id: request.idempotencyKey,
    walletId,
    amount,
    fee,
    bankCode: request.bankCode,
    accountName,
    accountLast4: request.accountNumber.slice(-4),
    by: actor,
    at: new Date().toISOString(),
  };

  sandbox.withdrawals = [withdrawal, ...sandbox.withdrawals].slice(
    0,
    WITHDRAWAL_HISTORY_LIMIT,
  );
  sandbox.debits[walletId] = (sandbox.debits[walletId] ?? 0) + total;
  await saveSandbox(sandbox);

  return {
    ok: true,
    wallet: { ...wallet, balance: kobo(wallet.balance - total) },
    withdrawal,
    replayed: false,
  };
}
