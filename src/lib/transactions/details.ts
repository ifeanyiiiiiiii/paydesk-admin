import type { Transaction } from "@/lib/data/types";
import { type Kobo, kobo } from "@/lib/money";

export interface BreakdownLine {
  label: string;
  amount: Kobo;
  /** How the line combines with the amount: "-" deducted, "+" added on top. */
  sign?: "+" | "-";
}

export interface FeeBreakdown {
  lines: BreakdownLine[];
  total: BreakdownLine;
}

/**
 * How money moved for a transaction. Collections pay the business the amount
 * minus PayDesk's fee; payouts and refunds debit the amount plus the fee.
 * Failed transactions move no money.
 */
export function feeBreakdown(txn: Transaction): FeeBreakdown {
  if (txn.status === "failed") {
    return {
      lines: [{ label: "Amount", amount: txn.amount }],
      total: { label: "Settled", amount: kobo(0) },
    };
  }

  if (txn.type === "collection") {
    return {
      lines: [
        { label: "Amount paid by customer", amount: txn.amount },
        { label: "PayDesk fee", amount: txn.fee, sign: "-" },
      ],
      total: {
        label: "Business receives",
        amount: kobo(txn.amount - txn.fee),
      },
    };
  }

  return {
    lines: [
      {
        label: txn.type === "payout" ? "Payout amount" : "Refund amount",
        amount: txn.amount,
      },
      { label: "PayDesk fee", amount: txn.fee, sign: "+" },
    ],
    total: {
      label: "Debited from wallet",
      amount: kobo(txn.amount + txn.fee),
    },
  };
}

export type TimelineTone = "neutral" | "success" | "warning" | "danger";

export interface TimelineEvent {
  label: string;
  description?: string;
  /** ISO 8601 timestamp. */
  at: string;
  tone: TimelineTone;
}

const failureReasons: Record<Transaction["channel"], string[]> = {
  card: [
    "Card declined by the issuing bank",
    "Insufficient funds",
    "Incorrect card details",
  ],
  bank_transfer: ["Destination bank timed out", "Invalid account number"],
  ussd: ["USSD session expired", "Customer cancelled on their phone"],
};

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

/**
 * The lifecycle of a transaction, oldest first. Derived from the transaction
 * itself (its id number picks the timings and failure reason), so it's the
 * same on every render and needs no extra data.
 */
export function transactionTimeline(txn: Transaction): TimelineEvent[] {
  const n = Number(txn.id.replace(/\D/g, "")) || 0;
  const created = Date.parse(txn.createdAt);
  const after = (ms: number) => new Date(created + ms).toISOString();
  const confirmDelay = (2 + (n % 40)) * SECOND;

  const events: TimelineEvent[] = [
    { label: "Initiated", at: txn.createdAt, tone: "neutral" },
  ];

  switch (txn.status) {
    case "successful":
      events.push({
        label: "Confirmed",
        description: "The bank confirmed the payment.",
        at: after(confirmDelay),
        tone: "success",
      });
      if (txn.type === "collection") {
        events.push({
          label: "Settled",
          description: "Paid into the business's wallet.",
          at: after(24 * HOUR),
          tone: "success",
        });
      }
      break;
    case "pending":
      events.push({
        label: "Awaiting confirmation",
        description: "Waiting for the bank to confirm.",
        at: after(confirmDelay),
        tone: "warning",
      });
      break;
    case "failed": {
      const reasons = failureReasons[txn.channel];
      events.push({
        label: "Failed",
        description: reasons[n % reasons.length],
        at: after(confirmDelay),
        tone: "danger",
      });
      break;
    }
    case "reversed":
      events.push(
        {
          label: "Confirmed",
          description: "The bank confirmed the payment.",
          at: after(confirmDelay),
          tone: "success",
        },
        {
          label: "Reversed",
          description: "Returned to the customer after a dispute.",
          at: after(2 * HOUR + confirmDelay),
          tone: "danger",
        },
      );
      break;
  }

  return events;
}
