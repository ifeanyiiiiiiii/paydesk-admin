import "server-only";
import { DATA_END } from "@/lib/data/seed";
import { getAllTransactions, getBusinesses } from "@/lib/data/store";
import type { FeeRule } from "@/lib/money";
import { getSandbox, saveSandbox } from "@/lib/sandbox/sandbox";
import {
  applyFeeOverrides,
  estimateFeeChange,
  type FeeChannel,
  type FeeConfig,
  type FeeEstimate,
  type FeeList,
  resolveFeeRule,
  withCustomFee,
  withoutCustomFee,
} from "./fees";

const ESTIMATE_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

function toFeeList(config: FeeConfig): FeeList {
  const names = new Map(getBusinesses().map((b) => [b.id, b.name]));
  return {
    ...config,
    custom: config.custom.flatMap((fee) => {
      const businessName = names.get(fee.businessId);
      return businessName ? [{ ...fee, businessName }] : [];
    }),
  };
}

/** The fee rules as this visitor sees them. */
export async function getFees(): Promise<FeeList> {
  return toFeeList(applyFeeOverrides((await getSandbox()).fees));
}

/** Changes a default rule. Callers must check the fees:manage permission first. */
export async function setDefaultFee(
  channel: FeeChannel,
  rule: FeeRule,
  actor: string,
): Promise<FeeList> {
  const sandbox = await getSandbox();
  sandbox.fees.defaults[channel] = {
    rule,
    by: actor,
    at: new Date().toISOString(),
  };
  await saveSandbox(sandbox);
  return toFeeList(applyFeeOverrides(sandbox.fees));
}

export type CustomFeeResult =
  | { ok: true; fees: FeeList }
  | { ok: false; error: "business_not_found" | "too_many" | "not_found" };

/**
 * Adds or replaces a business's custom rate. Callers must check the
 * fees:manage permission first.
 */
export async function setCustomFee(
  businessId: string,
  channel: FeeChannel,
  rule: FeeRule,
  actor: string,
): Promise<CustomFeeResult> {
  if (!getBusinesses().some((b) => b.id === businessId)) {
    return { ok: false, error: "business_not_found" };
  }
  const sandbox = await getSandbox();
  const fees = withCustomFee(sandbox.fees, businessId, channel, {
    rule,
    by: actor,
    at: new Date().toISOString(),
  });
  if (!fees) return { ok: false, error: "too_many" };
  sandbox.fees = fees;
  await saveSandbox(sandbox);
  return { ok: true, fees: toFeeList(applyFeeOverrides(fees)) };
}

/** Puts a business back on the default rate. Callers must check fees:manage. */
export async function removeCustomFee(
  businessId: string,
  channel: FeeChannel,
): Promise<CustomFeeResult> {
  const sandbox = await getSandbox();
  const fees = withoutCustomFee(sandbox.fees, businessId, channel);
  if (!fees) return { ok: false, error: "not_found" };
  sandbox.fees = fees;
  await saveSandbox(sandbox);
  return { ok: true, fees: toFeeList(applyFeeOverrides(fees)) };
}

/**
 * What a proposed rule would have earned over the last 30 days, compared with
 * the rule in place now. A change to a default skips businesses on a custom
 * rate, because it wouldn't affect them.
 */
export async function estimateFee(
  channel: FeeChannel,
  businessId: string | undefined,
  proposed: FeeRule,
): Promise<FeeEstimate> {
  const config = applyFeeOverrides((await getSandbox()).fees);
  const since = DATA_END - ESTIMATE_DAYS * DAY;
  const onCustomRate = new Set(
    config.custom
      .filter((fee) => fee.channel === channel)
      .map((fee) => fee.businessId),
  );
  const transactions = getAllTransactions().filter(
    (txn) =>
      Date.parse(txn.createdAt) > since &&
      (businessId
        ? txn.businessId === businessId
        : !onCustomRate.has(txn.businessId)),
  );
  const current = businessId
    ? resolveFeeRule(config, businessId, channel)
    : config.defaults[channel].rule;
  return estimateFeeChange(transactions, channel, current, proposed);
}
