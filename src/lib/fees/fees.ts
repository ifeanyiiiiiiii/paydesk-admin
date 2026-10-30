import { z } from "zod";
import {
  channelLabels,
  type Transaction,
  transactionChannels,
} from "@/lib/data/types";
import {
  calculateFee,
  type FeeRule,
  formatNaira,
  type Kobo,
  kobo,
  parseNaira,
  sumKobo,
  toNairaDecimal,
} from "@/lib/money";

/**
 * Fee rules: a default per channel, plus custom rates agreed with individual
 * businesses. Pure (no cookies, no server APIs), so the fee form can preview a
 * rule with the same code the server charges with.
 */

/** The ways PayDesk charges: the payment channels, plus withdrawing to a bank. */
export const feeChannels = [...transactionChannels, "withdrawal"] as const;
export type FeeChannel = (typeof feeChannels)[number];
export const feeChannelSchema = z.enum(feeChannels);

export const feeChannelLabels: Record<FeeChannel, string> = {
  ...channelLabels,
  withdrawal: "Withdrawal",
};

export const feeChannelDescriptions: Record<FeeChannel, string> = {
  card: "Charged when a customer pays by card",
  bank_transfer: "Charged when a customer pays by bank transfer",
  ussd: "Charged when a customer pays by USSD",
  withdrawal: "Charged when a business withdraws to a bank",
};

export const defaultFeeRules: Record<FeeChannel, FeeRule> = {
  card: { percentBps: 150, flat: kobo(10_000), cap: kobo(200_000) }, // 1.5% + ₦100, max ₦2,000
  bank_transfer: { percentBps: 100, flat: kobo(0), cap: kobo(150_000) }, // 1%, max ₦1,500
  ussd: { percentBps: 200, flat: kobo(0), cap: kobo(100_000) }, // 2%, max ₦1,000
  withdrawal: { percentBps: 50, flat: kobo(2_500), cap: kobo(100_000) }, // 0.5% + ₦25, max ₦1,000
};

/** A rule and who last changed it. Rules nobody has changed have no by or at. */
export interface ChangedRule {
  rule: FeeRule;
  by?: string;
  at?: string;
}

export interface CustomFee extends ChangedRule {
  businessId: string;
  channel: FeeChannel;
}

export interface FeeConfig {
  defaults: Record<FeeChannel, ChangedRule>;
  custom: CustomFee[];
}

/** The config with business names, as the fees page shows it. */
export interface FeeList extends FeeConfig {
  custom: (CustomFee & { businessName: string })[];
}

/** Custom rates in the seed data. All dated after the last seeded transaction. */
const seedCustomFees: CustomFee[] = [
  {
    businessId: "biz_002", // Ayo Logistics
    channel: "withdrawal",
    rule: { percentBps: 25, flat: kobo(1_000), cap: kobo(50_000) },
    by: "Adaeze Okafor",
    at: "2026-10-21T09:15:00.000Z",
  },
  {
    businessId: "biz_007", // Ikeja Gadgets Hub
    channel: "card",
    rule: { percentBps: 120, flat: kobo(5_000), cap: kobo(150_000) },
    by: "Adaeze Okafor",
    at: "2026-10-21T09:20:00.000Z",
  },
  {
    businessId: "biz_009", // Bright Minds Tutors
    channel: "ussd",
    rule: { percentBps: 150, flat: kobo(0), cap: kobo(50_000) },
    by: "Adaeze Okafor",
    at: "2026-10-21T09:25:00.000Z",
  },
];

/** Each custom rate is stored in a cookie, so there's a limit on how many. */
export const MAX_CUSTOM_FEES = 10;

/** A visitor's own changes on top of the shared rules. */
export interface FeeOverrides {
  defaults: Partial<Record<FeeChannel, ChangedRule>>;
  /** By "businessId:channel". Null removes a rate from the seed data. */
  custom: Record<string, ChangedRule | null>;
}

export const emptyFeeOverrides = (): FeeOverrides => ({
  defaults: {},
  custom: {},
});

function customFeeKey(businessId: string, channel: FeeChannel): string {
  return `${businessId}:${channel}`;
}

export function applyFeeOverrides(overrides: FeeOverrides): FeeConfig {
  const defaults = Object.fromEntries(
    feeChannels.map((channel) => [
      channel,
      overrides.defaults[channel] ?? { rule: defaultFeeRules[channel] },
    ]),
  ) as Record<FeeChannel, ChangedRule>;

  const custom = new Map(
    seedCustomFees.map((fee) => [customFeeKey(fee.businessId, fee.channel), fee]),
  );
  for (const [key, change] of Object.entries(overrides.custom)) {
    const [businessId, channel] = key.split(":");
    if (change) {
      custom.set(key, {
        ...change,
        businessId,
        channel: channel as FeeChannel,
      });
    } else {
      custom.delete(key);
    }
  }
  return { defaults, custom: [...custom.values()] };
}

/** Sets a custom rate. Null means the limit is reached and it's a new rate. */
export function withCustomFee(
  overrides: FeeOverrides,
  businessId: string,
  channel: FeeChannel,
  change: ChangedRule,
): FeeOverrides | null {
  const { custom } = applyFeeOverrides(overrides);
  const exists = custom.some(
    (fee) => fee.businessId === businessId && fee.channel === channel,
  );
  if (!exists && custom.length >= MAX_CUSTOM_FEES) return null;
  return {
    ...overrides,
    custom: {
      ...overrides.custom,
      [customFeeKey(businessId, channel)]: change,
    },
  };
}

/** Removes a custom rate. Null means there was no such rate. */
export function withoutCustomFee(
  overrides: FeeOverrides,
  businessId: string,
  channel: FeeChannel,
): FeeOverrides | null {
  const key = customFeeKey(businessId, channel);
  const exists = applyFeeOverrides(overrides).custom.some(
    (fee) => customFeeKey(fee.businessId, fee.channel) === key,
  );
  if (!exists) return null;

  const custom = { ...overrides.custom };
  delete custom[key];
  // A rate from the seed data needs a marker, or it would simply come back
  const isSeeded = seedCustomFees.some(
    (fee) => customFeeKey(fee.businessId, fee.channel) === key,
  );
  if (isSeeded) custom[key] = null;
  return { ...overrides, custom };
}

/** The rule a business pays: its custom rate if it has one, else the default. */
export function resolveFeeRule(
  config: FeeConfig,
  businessId: string,
  channel: FeeChannel,
): FeeRule {
  const custom = config.custom.find(
    (fee) => fee.businessId === businessId && fee.channel === channel,
  );
  return (custom ?? config.defaults[channel]).rule;
}

const MAX_PERCENT_BPS = 1_000; // 10%
const MAX_FLAT = 500_000; // ₦5,000
const MAX_CAP = 5_000_000; // ₦50,000

/** A rule as the API accepts it, in basis points and kobo. */
export const feeRuleSchema = z
  .object({
    percentBps: z
      .int()
      .min(0)
      .max(MAX_PERCENT_BPS, "The percentage can't be more than 10%"),
    flat: z
      .int()
      .min(0)
      .max(MAX_FLAT, `The flat fee can't be more than ${shortNaira(kobo(MAX_FLAT))}`),
    cap: z
      .int()
      .positive("A cap of ₦0 would make this free. Leave it empty for no cap")
      .max(MAX_CAP, `The cap can't be more than ${shortNaira(kobo(MAX_CAP))}`)
      .optional(),
  })
  .refine(({ flat, cap }) => cap === undefined || cap >= flat, {
    path: ["cap"],
    message: "The cap can't be lower than the flat fee",
  })
  .transform(({ percentBps, flat, cap }): FeeRule => ({
    percentBps,
    flat: kobo(flat),
    ...(cap !== undefined && { cap: kobo(cap) }),
  }));

/** Parses a typed percentage from its digits: "1.25" → 125 basis points. */
export function tryParsePercent(input: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(
    input.replace(/[%\s]/g, ""),
  );
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function tryParseOptionalNaira(input: string): Kobo | null {
  try {
    return parseNaira(input);
  } catch {
    return null;
  }
}

/**
 * The fee form's fields. Parses the text, then runs the same schema the API
 * uses, so the form and the server can't disagree about what's allowed.
 */
export const feeRuleFormSchema = z
  .object({ percent: z.string(), flat: z.string(), cap: z.string() })
  .superRefine(({ percent, flat, cap }, ctx) => {
    const percentBps = tryParsePercent(percent);
    if (percentBps === null) {
      ctx.addIssue({
        code: "custom",
        path: ["percent"],
        message: "Enter a percentage, like 1.5",
      });
    }
    const flatFee = flat.trim() ? tryParseOptionalNaira(flat) : kobo(0);
    if (flatFee === null || flatFee < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["flat"],
        message: "Enter an amount, like 100",
      });
    }
    const capFee = cap.trim() ? tryParseOptionalNaira(cap) : undefined;
    if (capFee === null || (capFee !== undefined && capFee < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["cap"],
        message: "Enter an amount, or leave it empty for no cap",
      });
    }

    if (percentBps === null || flatFee === null || capFee === null) return;
    const result = feeRuleSchema.safeParse({
      percentBps,
      flat: flatFee,
      cap: capFee,
    });
    for (const issue of result.error?.issues ?? []) {
      const field = issue.path[0] === "percentBps" ? "percent" : issue.path[0];
      ctx.addIssue({ code: "custom", path: [field], message: issue.message });
    }
  });
export type FeeRuleForm = z.infer<typeof feeRuleFormSchema>;

/** The rule a filled-in form describes, or null while it isn't valid. */
export function formToFeeRule(values: FeeRuleForm): FeeRule | null {
  if (!feeRuleFormSchema.safeParse(values).success) return null;
  const { percent, flat, cap } = values;
  return {
    percentBps: tryParsePercent(percent) ?? 0,
    flat: flat.trim() ? parseNaira(flat) : kobo(0),
    ...(cap.trim() && { cap: parseNaira(cap) }),
  };
}

function trimmedNaira(amount: Kobo): string {
  return toNairaDecimal(amount).replace(/\.00$/, "");
}

export function feeRuleToForm(rule: FeeRule): FeeRuleForm {
  return {
    percent: String(rule.percentBps / 100),
    flat: trimmedNaira(rule.flat),
    cap: rule.cap === undefined ? "" : trimmedNaira(rule.cap),
  };
}

export function sameFeeRule(a: FeeRule, b: FeeRule): boolean {
  return (
    a.percentBps === b.percentBps && a.flat === b.flat && a.cap === b.cap
  );
}

/** ₦2,000 rather than ₦2,000.00; rules are almost always whole naira. */
function shortNaira(amount: Kobo): string {
  return formatNaira(amount).replace(/\.00$/, "");
}

/** A rule in words: "1.5% + ₦100, max ₦2,000". */
export function describeFeeRule({ percentBps, flat, cap }: FeeRule): string {
  const parts = [
    ...(percentBps > 0 ? [`${percentBps / 100}%`] : []),
    ...(flat > 0 ? [shortNaira(flat)] : []),
  ];
  if (parts.length === 0) return "Free";
  const rate = parts.join(" + ");
  return cap === undefined ? rate : `${rate}, max ${shortNaira(cap)}`;
}

/** The transactions a rule applies to. Failed payments are never charged. */
export function isChargedOn(txn: Transaction, channel: FeeChannel): boolean {
  if (txn.status === "failed") return false;
  return channel === "withdrawal"
    ? txn.type === "payout"
    : txn.type === "collection" && txn.channel === channel;
}

export interface FeeEstimate {
  count: number;
  current: Kobo;
  proposed: Kobo;
}

/**
 * What two rules would each earn on the same transactions. Both are worked
 * out from the rule, not the stored fee, so the comparison is like for like.
 */
export function estimateFeeChange(
  transactions: readonly Transaction[],
  channel: FeeChannel,
  current: FeeRule,
  proposed: FeeRule,
): FeeEstimate {
  const charged = transactions.filter((txn) => isChargedOn(txn, channel));
  return {
    count: charged.length,
    current: sumKobo(charged.map((txn) => calculateFee(txn.amount, current))),
    proposed: sumKobo(charged.map((txn) => calculateFee(txn.amount, proposed))),
  };
}

export const feeEstimateRequestSchema = z.object({
  channel: feeChannelSchema,
  businessId: z.string().optional(),
  rule: feeRuleSchema,
});
