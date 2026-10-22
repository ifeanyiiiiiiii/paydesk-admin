"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { channelLabels, type Transaction, typeLabels } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import {
  feeBreakdown,
  type TimelineTone,
  transactionTimeline,
} from "@/lib/transactions/details";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const dotColours: Record<TimelineTone, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

/**
 * Details for one transaction. It's open whenever ?txn= is in the URL, so a
 * link to a specific transaction can be shared, and closing it goes back to
 * the same filtered list.
 */
export function TransactionSheet({
  transaction: txn,
  closeHref,
}: {
  transaction: Transaction;
  closeHref: string;
}) {
  const router = useRouter();
  const breakdown = feeBreakdown(txn);
  const timeline = transactionTimeline(txn);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <StatusBadge status={txn.status} />
            <span className="text-xs text-muted-foreground">
              {typeLabels[txn.type]} · {channelLabels[txn.channel]}
            </span>
          </div>
          <SheetTitle className="text-2xl tabular-nums">
            {formatNaira(txn.amount)}
          </SheetTitle>
          <SheetDescription>
            {txn.customerName} → {txn.businessName}
          </SheetDescription>
        </SheetHeader>

        <section className="space-y-3 p-4">
          <h3 className="text-sm font-medium">Details</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="flex items-center gap-1 font-mono text-xs">
              {txn.reference}
              <CopyButton value={txn.reference} />
            </dd>
            <dt className="text-muted-foreground">Transaction ID</dt>
            <dd className="font-mono text-xs">{txn.id}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{formatDateTime(txn.createdAt)} (Lagos)</dd>
            <dt className="text-muted-foreground">Business</dt>
            <dd>{txn.businessName}</dd>
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{txn.customerName}</dd>
          </dl>
        </section>

        <Separator />

        <section className="space-y-3 p-4">
          <h3 className="text-sm font-medium">Money movement</h3>
          <dl className="space-y-2 text-sm">
            {breakdown.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="tabular-nums">
                  {line.sign === "-" ? "−" : line.sign === "+" ? "+" : ""}
                  {formatNaira(line.amount)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t pt-2 font-medium">
              <dt>{breakdown.total.label}</dt>
              <dd className="tabular-nums">
                {formatNaira(breakdown.total.amount)}
              </dd>
            </div>
          </dl>
          {txn.status === "failed" && (
            <p className="text-xs text-muted-foreground">
              Failed payments move no money and aren&apos;t charged a fee.
            </p>
          )}
        </section>

        <Separator />

        <section className="space-y-3 p-4">
          <h3 className="text-sm font-medium">Timeline</h3>
          <ol className="relative space-y-4 border-l pl-5">
            {timeline.map((event) => (
              <li key={event.label} className="relative">
                <span
                  className={cn(
                    "absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-background",
                    dotColours[event.tone],
                  )}
                />
                <p className="text-sm font-medium">{event.label}</p>
                {event.description && (
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                )}
                <time
                  dateTime={event.at}
                  className="text-xs text-muted-foreground"
                >
                  {formatDateTime(event.at)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      </SheetContent>
    </Sheet>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the text is still selectable
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-6"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy reference"}
    >
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
    </Button>
  );
}
