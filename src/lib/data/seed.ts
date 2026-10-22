import { calculateFee, type FeeRule, kobo } from "@/lib/money";
import { createRandom } from "./random";
import type { Business, Transaction, TransactionChannel } from "./types";

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

const businessNames = [
  "Kola Kitchen", "Ayo Logistics", "Zuma Pharmacy", "Lekki Laundry Co.",
  "Naija Threads", "Oak & Iroko Furniture", "Ikeja Gadgets Hub", "Chop Daily",
  "Bright Minds Tutors", "Sabo Auto Parts", "Mama Put Express", "Jollof Junction",
  "Aso Rock Travels", "Delta Fresh Farms", "Owambe Rentals", "Kano Leather Works",
  "Yaba Print House", "Ember Bakery", "Swift Courier NG", "Palmwine Studios",
  "Enugu Coal Café", "Harmattan Skincare", "Ibadan Book Stop", "Gidi Fitness",
];

const firstNames = [
  "Chinedu", "Aisha", "Tobi", "Ngozi", "Emeka", "Funke", "Ibrahim", "Kemi",
  "Uche", "Zainab", "Seun", "Amaka", "Yusuf", "Bisi", "Obinna", "Hauwa",
  "Tunde", "Ifeoma", "Musa", "Adaeze",
];

const lastNames = [
  "Okonkwo", "Bello", "Adeyemi", "Eze", "Abubakar", "Ogunleye", "Nwosu",
  "Lawal", "Okafor", "Danjuma", "Afolabi", "Chukwu", "Ibekwe", "Suleiman",
];

/** Platform fees by channel, in the shape calculateFee expects. */
const feeRules: Record<TransactionChannel, FeeRule> = {
  card: { percentBps: 150, flat: kobo(10_000), cap: kobo(200_000) }, // 1.5% + ₦100, max ₦2,000
  bank_transfer: { percentBps: 100, flat: kobo(0), cap: kobo(150_000) }, // 1%, max ₦1,500
  ussd: { percentBps: 200, flat: kobo(0), cap: kobo(100_000) }, // 2%, max ₦1,000
};

const REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

export function generateBusinesses(): Business[] {
  return businessNames.map((name, i) => ({
    id: `biz_${String(i + 1).padStart(3, "0")}`,
    name,
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
      fee: status === "failed" ? kobo(0) : calculateFee(amount, feeRules[channel]),
      createdAt,
    };
  });

  // Newest first, the order an admin expects to see them
  return transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
