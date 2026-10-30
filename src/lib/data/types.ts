import type { FeeRule, Kobo } from "@/lib/money";

export const transactionStatuses = [
  "successful",
  "pending",
  "failed",
  "reversed",
] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const transactionTypes = ["collection", "payout", "refund"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const transactionChannels = ["card", "bank_transfer", "ussd"] as const;
export type TransactionChannel = (typeof transactionChannels)[number];

export interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  /** Whether the business has passed identity checks (KYC). */
  verification: "verified" | "pending";
  /** ISO 8601 date the business joined PayDesk. */
  joinedAt: string;
}

export type WalletStatus = "active" | "frozen";

export interface Wallet {
  id: string;
  businessId: string;
  businessName: string;
  balance: Kobo;
  status: WalletStatus;
  /** The fee rule this business pays to withdraw. Hidden from admins who can't. */
  withdrawalFee?: FeeRule;
  /** Set while frozen: why, when (ISO 8601) and by whom. */
  frozen?: { reason: string; at: string; by: string };
}

/** A wallet with its fee rule known, so a withdrawal can be priced. */
export type PayableWallet = Wallet & { withdrawalFee: FeeRule };

export interface Transaction {
  id: string;
  /** Human-friendly reference shown to customers and support, e.g. PDK-7G2K9Q4M. */
  reference: string;
  businessId: string;
  businessName: string;
  customerName: string;
  type: TransactionType;
  channel: TransactionChannel;
  status: TransactionStatus;
  amount: Kobo;
  fee: Kobo;
  /** ISO 8601 timestamp, UTC. */
  createdAt: string;
}

export const statusLabels: Record<TransactionStatus, string> = {
  successful: "Successful",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export const typeLabels: Record<TransactionType, string> = {
  collection: "Collection",
  payout: "Payout",
  refund: "Refund",
};

export const channelLabels: Record<TransactionChannel, string> = {
  card: "Card",
  bank_transfer: "Bank transfer",
  ussd: "USSD",
};
