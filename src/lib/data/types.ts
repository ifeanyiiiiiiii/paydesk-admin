import type { Kobo } from "@/lib/money";

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
}

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
