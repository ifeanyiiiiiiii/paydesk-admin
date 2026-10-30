import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/data/types";
import { kobo } from "@/lib/money";
import {
  applyFeeOverrides,
  type ChangedRule,
  defaultFeeRules,
  describeFeeRule,
  emptyFeeOverrides,
  estimateFeeChange,
  feeRuleFormSchema,
  feeRuleSchema,
  feeRuleToForm,
  formToFeeRule,
  isChargedOn,
  MAX_CUSTOM_FEES,
  resolveFeeRule,
  sameFeeRule,
  tryParsePercent,
  withCustomFee,
  withoutCustomFee,
} from "./fees";

const change: ChangedRule = {
  rule: { percentBps: 100, flat: kobo(0) },
  by: "Adaeze Okafor",
  at: "2026-10-30T10:00:00.000Z",
};

describe("tryParsePercent", () => {
  it("reads the digits, so there's no floating-point rounding", () => {
    expect(tryParsePercent("1.5")).toBe(150);
    expect(tryParsePercent("1.15")).toBe(115); // 1.15 * 100 = 114.99999… as a float
    expect(tryParsePercent("0.07")).toBe(7);
    expect(tryParsePercent("2%")).toBe(200);
  });

  it("rejects anything else", () => {
    expect(tryParsePercent("abc")).toBeNull();
    expect(tryParsePercent("")).toBeNull();
    expect(tryParsePercent("1.234")).toBeNull();
    expect(tryParsePercent("-1")).toBeNull();
  });
});

describe("feeRuleSchema", () => {
  it("accepts a rule without a cap", () => {
    expect(feeRuleSchema.parse({ percentBps: 150, flat: 10_000 })).toEqual({
      percentBps: 150,
      flat: 10_000,
    });
  });

  it("accepts a free rule", () => {
    expect(feeRuleSchema.safeParse({ percentBps: 0, flat: 0 }).success).toBe(
      true,
    );
  });

  it.each([
    [{ percentBps: -1, flat: 0 }],
    [{ percentBps: 1.5, flat: 0 }],
    [{ percentBps: 1_001, flat: 0 }],
    [{ percentBps: 0, flat: 10.5 }],
    [{ percentBps: 0, flat: 500_001 }],
    [{ percentBps: 100, flat: 0, cap: 0 }],
    [{ percentBps: 100, flat: 0, cap: 5_000_001 }],
    [{ percentBps: 100, flat: 10_000, cap: 9_999 }],
  ])("rejects %j", (rule) => {
    expect(feeRuleSchema.safeParse(rule).success).toBe(false);
  });
});

describe("feeRuleFormSchema", () => {
  const valid = { percent: "1.5", flat: "100", cap: "2,000" };

  it("accepts valid input, with flat and cap optional", () => {
    expect(feeRuleFormSchema.safeParse(valid).success).toBe(true);
    expect(
      feeRuleFormSchema.safeParse({ percent: "1", flat: "", cap: "" }).success,
    ).toBe(true);
  });

  it.each([
    [{ percent: "abc" }, "percent", "Enter a percentage, like 1.5"],
    [{ percent: "11" }, "percent", "The percentage can't be more than 10%"],
    [{ flat: "abc" }, "flat", "Enter an amount, like 100"],
    [{ flat: "-5" }, "flat", "Enter an amount, like 100"],
    [{ flat: "6,000", cap: "" }, "flat", "The flat fee can't be more than ₦5,000"],
    [{ cap: "abc" }, "cap", "Enter an amount, or leave it empty for no cap"],
    [{ cap: "50" }, "cap", "The cap can't be lower than the flat fee"],
    [
      { cap: "0" },
      "cap",
      "A cap of ₦0 would make this free. Leave it empty for no cap",
    ],
  ])("rejects %j", (values, field, message) => {
    const result = feeRuleFormSchema.safeParse({ ...valid, ...values });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: [field],
      message,
    });
  });
});

describe("formToFeeRule and feeRuleToForm", () => {
  it("turns a form into a rule", () => {
    expect(
      formToFeeRule({ percent: "1.5", flat: "100", cap: "2,000" }),
    ).toEqual({ percentBps: 150, flat: 10_000, cap: 200_000 });
    expect(formToFeeRule({ percent: "1", flat: "", cap: "" })).toEqual({
      percentBps: 100,
      flat: 0,
    });
  });

  it("gives null while the form is invalid", () => {
    expect(formToFeeRule({ percent: "x", flat: "", cap: "" })).toBeNull();
  });

  it("round-trips every default rule", () => {
    for (const rule of Object.values(defaultFeeRules)) {
      expect(formToFeeRule(feeRuleToForm(rule))).toEqual(rule);
    }
  });
});

describe("sameFeeRule", () => {
  it("compares every part, including a missing cap", () => {
    const rule = { percentBps: 100, flat: kobo(0), cap: kobo(1_000) };
    expect(sameFeeRule(rule, { ...rule })).toBe(true);
    expect(sameFeeRule(rule, { percentBps: 100, flat: kobo(0) })).toBe(false);
    expect(sameFeeRule(rule, { ...rule, percentBps: 101 })).toBe(false);
  });
});

describe("describeFeeRule", () => {
  it.each([
    [defaultFeeRules.card, "1.5% + ₦100, max ₦2,000"],
    [defaultFeeRules.ussd, "2%, max ₦1,000"],
    [{ percentBps: 125, flat: kobo(0) }, "1.25%"],
    [{ percentBps: 0, flat: kobo(5_050) }, "₦50.50"],
    [{ percentBps: 0, flat: kobo(0) }, "Free"],
  ])("describes %j", (rule, text) => {
    expect(describeFeeRule(rule)).toBe(text);
  });
});

describe("applyFeeOverrides", () => {
  it("starts from the defaults and the seeded custom rates", () => {
    const config = applyFeeOverrides(emptyFeeOverrides());
    expect(config.defaults.card).toEqual({ rule: defaultFeeRules.card });
    expect(config.custom).toHaveLength(3);
  });

  it("replaces only the default that changed", () => {
    const config = applyFeeOverrides({
      ...emptyFeeOverrides(),
      defaults: { card: change },
    });
    expect(config.defaults.card).toEqual(change);
    expect(config.defaults.ussd.rule).toEqual(defaultFeeRules.ussd);
  });
});

describe("resolveFeeRule", () => {
  const config = applyFeeOverrides(emptyFeeOverrides());

  it("prefers the business's custom rate", () => {
    expect(resolveFeeRule(config, "biz_002", "withdrawal").percentBps).toBe(25);
  });

  it("falls back to the default for other channels and businesses", () => {
    expect(resolveFeeRule(config, "biz_002", "card")).toEqual(
      defaultFeeRules.card,
    );
    expect(resolveFeeRule(config, "biz_001", "withdrawal")).toEqual(
      defaultFeeRules.withdrawal,
    );
  });
});

describe("withCustomFee", () => {
  it("adds a rate", () => {
    const overrides = withCustomFee(
      emptyFeeOverrides(),
      "biz_001",
      "card",
      change,
    )!;
    const config = applyFeeOverrides(overrides);
    expect(resolveFeeRule(config, "biz_001", "card")).toEqual(change.rule);
  });

  it("replaces an existing rate rather than adding another", () => {
    const overrides = withCustomFee(
      emptyFeeOverrides(),
      "biz_002",
      "withdrawal",
      change,
    )!;
    const config = applyFeeOverrides(overrides);
    expect(config.custom).toHaveLength(3);
    expect(resolveFeeRule(config, "biz_002", "withdrawal")).toEqual(
      change.rule,
    );
  });

  it("refuses a new rate at the limit, but still allows replacing one", () => {
    let overrides = emptyFeeOverrides();
    for (let i = 0; i < MAX_CUSTOM_FEES - 3; i++) {
      overrides = withCustomFee(overrides, `biz_1${i}`, "card", change)!;
    }
    expect(withCustomFee(overrides, "biz_999", "card", change)).toBeNull();
    expect(
      withCustomFee(overrides, "biz_002", "withdrawal", change),
    ).not.toBeNull();
  });
});

describe("withoutCustomFee", () => {
  it("removes a rate added by the visitor", () => {
    const added = withCustomFee(emptyFeeOverrides(), "biz_001", "card", change)!;
    const removed = withoutCustomFee(added, "biz_001", "card")!;
    expect(removed.custom).toEqual({});
  });

  it("keeps a seeded rate removed, so the business goes back to the default", () => {
    const removed = withoutCustomFee(
      emptyFeeOverrides(),
      "biz_002",
      "withdrawal",
    )!;
    const config = applyFeeOverrides(removed);
    expect(config.custom).toHaveLength(2);
    expect(resolveFeeRule(config, "biz_002", "withdrawal")).toEqual(
      defaultFeeRules.withdrawal,
    );
  });

  it("gives null when there's no such rate", () => {
    expect(
      withoutCustomFee(emptyFeeOverrides(), "biz_001", "card"),
    ).toBeNull();
  });
});

describe("isChargedOn", () => {
  const txn = (change: Partial<Transaction>) =>
    ({
      type: "collection",
      channel: "card",
      status: "successful",
      ...change,
    }) as Transaction;

  it("matches collections to their channel", () => {
    expect(isChargedOn(txn({}), "card")).toBe(true);
    expect(isChargedOn(txn({}), "ussd")).toBe(false);
  });

  it("matches withdrawals to payouts", () => {
    const payout = txn({ type: "payout", channel: "bank_transfer" });
    expect(isChargedOn(payout, "withdrawal")).toBe(true);
    expect(isChargedOn(payout, "bank_transfer")).toBe(false);
  });

  it("never counts failed payments", () => {
    expect(isChargedOn(txn({ status: "failed" }), "card")).toBe(false);
  });
});

describe("estimateFeeChange", () => {
  it("compares both rules on the transactions they'd apply to", () => {
    const base = {
      type: "collection",
      channel: "card",
      status: "successful",
      fee: kobo(1), // ignored: both sides come from the rule
    };
    const transactions = [
      { ...base, amount: kobo(100_000) },
      { ...base, amount: kobo(200_000) },
      { ...base, amount: kobo(100_000), status: "failed" },
      { ...base, amount: kobo(100_000), channel: "ussd" },
    ] as Transaction[];

    expect(
      estimateFeeChange(
        transactions,
        "card",
        { percentBps: 100, flat: kobo(0) },
        { percentBps: 200, flat: kobo(100) },
      ),
    ).toEqual({ count: 2, current: 3_000, proposed: 6_200 });
  });
});
