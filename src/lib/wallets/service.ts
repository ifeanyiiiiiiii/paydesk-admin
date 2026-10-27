import "server-only";
import { getSeedWallets } from "@/lib/data/store";
import type { Wallet } from "@/lib/data/types";
import { getSandbox, saveSandbox } from "@/lib/sandbox/sandbox";
import {
  applyWalletOverrides,
  changeWalletStatus,
  type StatusChangeResult,
  type WalletStatusChange,
} from "./wallets";

/** The shared wallets with this visitor's own changes applied. */
export async function getWallets(): Promise<Wallet[]> {
  const sandbox = await getSandbox();
  return applyWalletOverrides(getSeedWallets(), sandbox.wallets);
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
  const wallet = applyWalletOverrides(getSeedWallets(), sandbox.wallets).find(
    (w) => w.id === id,
  );
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
