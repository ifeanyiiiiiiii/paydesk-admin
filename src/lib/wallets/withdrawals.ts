import { z } from "zod";
import type { Transaction, Wallet } from "@/lib/data/types";
import {
  calculateFee,
  type FeeRule,
  type Kobo,
  formatNaira,
  kobo,
  parseNaira,
} from "@/lib/money";

/** Fictional banks. PayDesk's demo never talks to a real bank. */
export const banks = [
  { code: "101", name: "Harmony Trust Bank" },
  { code: "102", name: "Niger Delta Bank" },
  { code: "103", name: "Sahel Commercial Bank" },
  { code: "104", name: "Lagoon Microfinance Bank" },
  { code: "105", name: "Plateau Savings Bank" },
] as const;

export const bankCodes = banks.map((bank) => bank.code) as [
  string,
  ...string[],
];

export function bankName(code: string): string {
  return banks.find((bank) => bank.code === code)?.name ?? "Unknown bank";
}

/** 0.5% + ₦25, at most ₦1,000. */
export const WITHDRAWAL_FEE: FeeRule = {
  percentBps: 50,
  flat: kobo(2_500),
  cap: kobo(100_000),
};
export const MIN_WITHDRAWAL = kobo(10_000); // ₦100
export const MAX_WITHDRAWAL = kobo(500_000_000); // ₦5,000,000

export interface WithdrawalQuote {
  amount: Kobo;
  fee: Kobo;
  /** What leaves the wallet: the amount plus the fee. */
  total: Kobo;
}

export function quoteWithdrawal(amount: Kobo): WithdrawalQuote {
  const fee = calculateFee(amount, WITHDRAWAL_FEE);
  return { amount, fee, total: kobo(amount + fee) };
}

/** parseNaira for form input: null instead of an exception on bad text. */
export function tryParseNaira(input: string): Kobo | null {
  try {
    return parseNaira(input);
  } catch {
    return null;
  }
}

export type WithdrawalError =
  "wallet_frozen" | "below_minimum" | "above_maximum" | "insufficient_funds";

/** The rules for a withdrawal. The form and the server both run this. */
export function checkWithdrawal(
  wallet: Pick<Wallet, "balance" | "status">,
  amount: Kobo,
): WithdrawalError | null {
  if (wallet.status === "frozen") return "wallet_frozen";
  if (amount < MIN_WITHDRAWAL) return "below_minimum";
  if (amount > MAX_WITHDRAWAL) return "above_maximum";
  if (quoteWithdrawal(amount).total > wallet.balance)
    return "insufficient_funds";
  return null;
}

export const withdrawalMessages: Record<WithdrawalError, string> = {
  wallet_frozen: "This wallet is frozen, so no money can leave it",
  below_minimum: `The minimum withdrawal is ${formatNaira(MIN_WITHDRAWAL)}`,
  above_maximum: `The maximum withdrawal is ${formatNaira(MAX_WITHDRAWAL)}`,
  insufficient_funds: "The balance can't cover this amount plus the fee",
};

/** Nigerian bank account numbers (NUBAN) have exactly 10 digits. */
const ACCOUNT_NUMBER = /^\d{10}$/;

export function isAccountNumber(value: string): boolean {
  return ACCOUNT_NUMBER.test(value);
}

export const accountNumberSchema = z
  .string()
  .regex(ACCOUNT_NUMBER, "Account numbers have exactly 10 digits");

/** The form's fields, with the amount checked against this wallet. */
export function withdrawalFormSchema(
  wallet: Pick<Wallet, "balance" | "status">,
) {
  return z.object({
    amount: z.string().superRefine((value, ctx) => {
      const amount = tryParseNaira(value);
      if (amount === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter an amount, like 25,000",
        });
        return;
      }
      const error = checkWithdrawal(wallet, amount);
      if (error)
        ctx.addIssue({ code: "custom", message: withdrawalMessages[error] });
    }),
    bankCode: z.string({ error: "Choose a bank" }).min(1, "Choose a bank"),
    accountNumber: accountNumberSchema,
  });
}
export type WithdrawalForm = z.infer<ReturnType<typeof withdrawalFormSchema>>;

/** What the client sends. The fee and account name are worked out on the server. */
export const withdrawalRequestSchema = z.object({
  amount: z.int().positive(),
  bankCode: z.enum(bankCodes),
  accountNumber: accountNumberSchema,
  /** Generated once per attempt, so retrying can never pay twice. */
  idempotencyKey: z.uuid(),
});
export type WithdrawalRequest = z.infer<typeof withdrawalRequestSchema>;

/** A completed withdrawal, kept compact because it's stored in a cookie. */
export interface Withdrawal {
  id: string;
  walletId: string;
  amount: Kobo;
  fee: Kobo;
  bankCode: string;
  accountName: string;
  accountLast4: string;
  by: string;
  at: string;
}

/** Shows a withdrawal in the transactions list as a payout. */
export function withdrawalToTransaction(
  withdrawal: Withdrawal,
  wallet: Pick<Wallet, "businessId" | "businessName">,
): Transaction {
  const short = withdrawal.id.replaceAll("-", "").slice(0, 8);
  return {
    id: `txn_w${short}`,
    reference: `PDK-W${short.slice(0, 7).toUpperCase()}`,
    businessId: wallet.businessId,
    businessName: wallet.businessName,
    customerName: `${withdrawal.accountName} (${bankName(withdrawal.bankCode)} ••${withdrawal.accountLast4})`,
    type: "payout",
    channel: "bank_transfer",
    status: "successful",
    amount: withdrawal.amount,
    fee: withdrawal.fee,
    createdAt: withdrawal.at,
  };
}

/** Takes each wallet's withdrawn total off its balance. */
export function applyWalletDebits<T extends Pick<Wallet, "id" | "balance">>(
  wallets: readonly T[],
  debits: Record<string, number>,
): T[] {
  return wallets.map((wallet) =>
    debits[wallet.id]
      ? { ...wallet, balance: kobo(wallet.balance - debits[wallet.id]) }
      : wallet,
  );
}
