import { defaultFeeRules } from "@/lib/fees/fees";
import { calculateFee, kobo } from "@/lib/money";
import { createRandom } from "./random";
import type { Business, Transaction } from "./types";

/**
 * Generates PayDesk's demo data. Every name is fictional. A fixed seed and a
 * fixed end date keep the output identical everywhere.
 */

const SEED = 20_261_020;
/**
 * The data ends at the last second of 20 Oct 2026 in Lagos (22:59:59 UTC) and
 * covers the 180 days before it. Ending on a Lagos midnight means the last
 * day shown on the dashboard is a full day, not one stray hour.
 */
export const DATA_END = Date.UTC(2026, 9, 20, 22, 59, 59);
const DAYS = 180;
export const TRANSACTION_COUNT = 5_000;

/** Each business with a category and city that fit its name. All fictional. */
const businessProfiles: Record<string, { category: string; city: string }> = {
  "Kola Kitchen": { category: "Food & drink", city: "Lagos" },
  "Ayo Logistics": { category: "Logistics", city: "Lagos" },
  "Zuma Pharmacy": { category: "Health", city: "Abuja" },
  "Lekki Laundry Co.": { category: "Services", city: "Lagos" },
  "Naija Threads": { category: "Fashion", city: "Lagos" },
  "Oak & Iroko Furniture": { category: "Home", city: "Ibadan" },
  "Ikeja Gadgets Hub": { category: "Electronics", city: "Lagos" },
  "Chop Daily": { category: "Food & drink", city: "Port Harcourt" },
  "Bright Minds Tutors": { category: "Education", city: "Enugu" },
  "Sabo Auto Parts": { category: "Automotive", city: "Lagos" },
  "Mama Put Express": { category: "Food & drink", city: "Abuja" },
  "Jollof Junction": { category: "Food & drink", city: "Lagos" },
  "Aso Rock Travels": { category: "Travel", city: "Abuja" },
  "Delta Fresh Farms": { category: "Agriculture", city: "Asaba" },
  "Owambe Rentals": { category: "Events", city: "Lagos" },
  "Kano Leather Works": { category: "Fashion", city: "Kano" },
  "Yaba Print House": { category: "Services", city: "Lagos" },
  "Ember Bakery": { category: "Food & drink", city: "Abuja" },
  "Swift Courier NG": { category: "Logistics", city: "Port Harcourt" },
  "Palmwine Studios": { category: "Media", city: "Lagos" },
  "Enugu Coal Café": { category: "Food & drink", city: "Enugu" },
  "Harmattan Skincare": { category: "Beauty", city: "Kano" },
  "Ibadan Book Stop": { category: "Retail", city: "Ibadan" },
  "Gidi Fitness": { category: "Health", city: "Lagos" },
};

// Object keys keep insertion order, so ids stay stable (biz_001 = Kola Kitchen)
const businessNames = Object.keys(businessProfiles);

export const firstNames = [
  "Chinedu", "Aisha", "Tobi", "Ngozi", "Emeka", "Funke", "Ibrahim", "Kemi",
  "Uche", "Zainab", "Seun", "Amaka", "Yusuf", "Bisi", "Obinna", "Hauwa",
  "Tunde", "Ifeoma", "Musa", "Adaeze",
];

export const lastNames = [
  "Okonkwo", "Bello", "Adeyemi", "Eze", "Abubakar", "Ogunleye", "Nwosu",
  "Lawal", "Okafor", "Danjuma", "Afolabi", "Chukwu", "Ibekwe", "Suleiman",
];

const REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

export function generateBusinesses(): Business[] {
  // A separate stream from the transactions' one, so adding business details
  // never changes the generated transactions
  const random = createRandom(SEED + 1);
  return businessNames.map((name, i) => ({
    id: `biz_${String(i + 1).padStart(3, "0")}`,
    name,
    ...businessProfiles[name],
    verification: random.next() < 0.85 ? "verified" : "pending",
    // Every business joined before the data starts (180 days back), within 2 years
    joinedAt: new Date(
      DATA_END - (DAYS + random.int(10, 720)) * 86_400_000,
    ).toISOString(),
  }));
}

export function generateTransactions(
  businesses: readonly Business[],
  count = TRANSACTION_COUNT,
): Transaction[] {
  const random = createRandom(SEED);
  const reference = () =>
    "PDK-" +
    Array.from({ length: 8 }, () => random.pick([...REFERENCE_CHARS])).join("");

  const transactions = Array.from({ length: count }, (_, i): Transaction => {
    const business = random.pick(businesses);
    const type = random.weighted({ collection: 78, payout: 17, refund: 5 });
    const channel =
      type === "collection"
        ? random.weighted({ card: 50, bank_transfer: 38, ussd: 12 })
        : "bank_transfer";
    const status = random.weighted({
      successful: 84,
      pending: 6,
      failed: 8,
      reversed: 2,
    });

    // Most payments are small; a few are large. Amounts are whole naira.
    const naira =
      type === "payout"
        ? // Businesses withdraw what they collect, so payouts are fewer and
          // larger than collections but smaller in total
          random.int(20_000, 600_000)
        : random.next() < 0.85
          ? random.int(500, 75_000)
          : random.int(75_000, 1_500_000);
    const amount = kobo(naira * 100);

    const createdAt = new Date(
      DATA_END - random.int(0, DAYS * 24 * 60 * 60 - 1) * 1000,
    ).toISOString();

    return {
      id: `txn_${String(i + 1).padStart(5, "0")}`,
      reference: reference(),
      businessId: business.id,
      businessName: business.name,
      customerName: `${random.pick(firstNames)} ${random.pick(lastNames)}`,
      type,
      channel,
      status,
      amount,
      // Failed payments aren't charged a fee
      fee: status === "failed" ? kobo(0) : calculateFee(amount, defaultFeeRules[channel]),
      createdAt,
    };
  });

  // Newest first, the order an admin expects to see them
  return transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
