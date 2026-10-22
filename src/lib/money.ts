/**
 * Money helpers.
 *
 * Every amount in PayDesk is stored and passed around as an integer number of
 * kobo (₦1 = 100 kobo). Floats are never used for money: 0.1 + 0.2 !== 0.3,
 * and mixing naira and kobo values is how dashboards end up showing figures
 * 100× too large. Convert to naira only at the edge, when displaying.
 */

declare const koboBrand: unique symbol;

/** An integer amount in kobo. Branded so a plain number can't be passed by mistake. */
export type Kobo = number & { readonly [koboBrand]: true };

export const KOBO_PER_NAIRA = 100;

/** Marks an integer as a kobo amount. Throws on non-integers. */
export function kobo(value: number): Kobo {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Kobo amounts must be safe integers, got ${value}`);
  }
  return value as Kobo;
}

/**
 * Parses a naira amount typed by a person ("1,250.5", "₦ 300", "-20") into kobo.
 * Works on the string's digits, so no floating-point rounding is involved.
 * Throws on anything that isn't a valid amount with at most 2 decimal places.
 */
export function parseNaira(input: string): Kobo {
  const cleaned = input.replace(/[₦,\s]/g, "");
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new RangeError(`Invalid naira amount: "${input}"`);
  }
  const [, sign, whole, fraction = ""] = match;
  const value = Number(whole) * KOBO_PER_NAIRA + Number(fraction.padEnd(2, "0"));
  return kobo(sign && value !== 0 ? -value : value);
}

const standardFormat = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

const compactFormat = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats kobo for display: 123456 → "₦1,234.56"; compact: 125000000 → "₦1.3M". */
export function formatNaira(
  amount: Kobo,
  { compact = false }: { compact?: boolean } = {},
): string {
  const naira = amount / KOBO_PER_NAIRA;
  return (compact ? compactFormat : standardFormat).format(naira);
}

/**
 * Plain decimal naira for machine-readable output like CSV: 123456 → "1234.56".
 * Built from the integer parts, so there's no floating-point rounding.
 */
export function toNairaDecimal(amount: Kobo): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const naira = Math.trunc(abs / KOBO_PER_NAIRA);
  const rest = String(abs % KOBO_PER_NAIRA).padStart(2, "0");
  return `${sign}${naira}.${rest}`;
}

/** Sums kobo amounts. Integer addition, so the result is exact. */
export function sumKobo(amounts: readonly Kobo[]): Kobo {
  return kobo(amounts.reduce<number>((total, amount) => total + amount, 0));
}

export interface FeeRule {
  /** Percentage fee in basis points: 150 = 1.5%. */
  percentBps: number;
  /** Fixed fee added on top, in kobo. */
  flat: Kobo;
  /** Optional maximum total fee, in kobo. */
  cap?: Kobo;
}

/**
 * Calculates the fee for a transaction amount. The percentage part is rounded
 * half-up to the nearest kobo, then the flat fee is added and the cap applied.
 */
export function calculateFee(amount: Kobo, rule: FeeRule): Kobo {
  if (amount < 0) {
    throw new RangeError("Fees can't be calculated on negative amounts");
  }
  const percentPart = Math.round((amount * rule.percentBps) / 10_000);
  const fee = percentPart + rule.flat;
  return kobo(rule.cap === undefined ? fee : Math.min(fee, rule.cap));
}
