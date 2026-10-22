import { describe, expect, it } from "vitest";
import {
  calculateFee,
  formatNaira,
  kobo,
  parseNaira,
  sumKobo,
  toNairaDecimal,
} from "./money";

describe("kobo", () => {
  it("accepts integers", () => {
    expect(kobo(150)).toBe(150);
  });

  it("rejects fractional amounts", () => {
    expect(() => kobo(10.5)).toThrow(RangeError);
  });
});

describe("parseNaira", () => {
  it.each([
    ["1250", 125_000],
    ["1,250.50", 125_050],
    ["1250.5", 125_050],
    ["₦ 300", 30_000],
    ["0.07", 7],
    ["-20", -2_000],
    ["-0", 0],
  ])("parses %s as %i kobo", (input, expected) => {
    expect(parseNaira(input)).toBe(expected);
  });

  it("avoids floating-point errors", () => {
    // 1.15 * 100 === 114.99999999999999 in floating point
    expect(parseNaira("1.15")).toBe(115);
  });

  it.each(["", "abc", "1.234", "1.2.3", "--5", "12a"])(
    "rejects %s",
    (input) => {
      expect(() => parseNaira(input)).toThrow(RangeError);
    },
  );
});

describe("formatNaira", () => {
  it("formats kobo as naira", () => {
    expect(formatNaira(kobo(123_456))).toBe("₦1,234.56");
  });

  it("treats the input as kobo, not naira (the 100x bug)", () => {
    expect(formatNaira(kobo(100))).toBe("₦1.00");
  });

  it("formats negatives", () => {
    expect(formatNaira(kobo(-5_000))).toBe("-₦50.00");
  });

  it("supports compact notation for dashboards", () => {
    expect(formatNaira(kobo(125_000_000), { compact: true })).toBe("₦1.3M");
  });
});

describe("toNairaDecimal", () => {
  it.each([
    [123_456, "1234.56"],
    [100, "1.00"],
    [7, "0.07"],
    [0, "0.00"],
    [-5_005, "-50.05"],
  ])("formats %i kobo as %s", (amount, expected) => {
    expect(toNairaDecimal(kobo(amount))).toBe(expected);
  });

  it("stays exact for amounts too large for float math to show cleanly", () => {
    expect(toNairaDecimal(kobo(900_719_925_474_099))).toBe("9007199254740.99");
  });
});

describe("sumKobo", () => {
  it("adds amounts exactly", () => {
    expect(sumKobo([kobo(10), kobo(20)])).toBe(30);
  });

  it("returns 0 for an empty list", () => {
    expect(sumKobo([])).toBe(0);
  });
});

describe("calculateFee", () => {
  const rule = { percentBps: 150, flat: kobo(10_000) }; // 1.5% + ₦100

  it("applies the percentage and flat fee", () => {
    // ₦10,000 → ₦150 + ₦100
    expect(calculateFee(kobo(1_000_000), rule)).toBe(25_000);
  });

  it("rounds the percentage part half-up to the nearest kobo", () => {
    // 1.5% of 33 kobo = 0.495 → 0; 1.5% of 100 kobo = 1.5 → 2
    expect(calculateFee(kobo(33), { percentBps: 150, flat: kobo(0) })).toBe(0);
    expect(calculateFee(kobo(100), { percentBps: 150, flat: kobo(0) })).toBe(2);
  });

  it("applies the cap", () => {
    const capped = { ...rule, cap: kobo(200_000) }; // max ₦2,000
    expect(calculateFee(kobo(100_000_000), capped)).toBe(200_000);
  });

  it("rejects negative amounts", () => {
    expect(() => calculateFee(kobo(-1), rule)).toThrow(RangeError);
  });
});
