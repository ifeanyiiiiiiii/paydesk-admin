"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Wallet } from "@/lib/data/types";
import { formatNaira, kobo } from "@/lib/money";
import {
  bankName,
  banks,
  checkWithdrawal,
  quoteWithdrawal,
  tryParseNaira,
  type WithdrawalForm,
  type WithdrawalQuote,
  withdrawalFormSchema,
} from "@/lib/wallets/withdrawals";
import { useAccountLookup, useWithdraw } from "./use-wallets";

const bankItems = banks.map((bank) => ({
  value: bank.code,
  label: bank.name,
}));

/**
 * Two steps: enter the details with a live fee quote, then review and confirm.
 * Mount with a new `key` per wallet so each attempt starts clean.
 */
export function WithdrawDialog({
  wallet,
  onClose,
}: {
  wallet: Wallet;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"details" | "review">("details");
  // One key per attempt: resending after a failure reuses it, so the server
  // can recognise a retry instead of paying a second time
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const withdraw = useWithdraw(wallet.id);

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalFormSchema(wallet)),
    defaultValues: { amount: "", bankCode: "", accountNumber: "" },
  });
  const { errors } = form.formState;
  const [amountText, bankCode, accountNumber] = useWatch({
    control: form.control,
    name: ["amount", "bankCode", "accountNumber"],
  });

  const lookup = useAccountLookup(bankCode, accountNumber);
  const amount = tryParseNaira(amountText);
  const quote =
    amount !== null && checkWithdrawal(wallet, amount) === null
      ? quoteWithdrawal(amount)
      : null;
  const accountName = lookup.data?.accountName;

  function confirm() {
    if (!quote) return;
    withdraw.mutate(
      {
        amount: quote.amount,
        bankCode,
        accountNumber,
        idempotencyKey,
      },
      {
        onSuccess: () => {
          toast.success(
            `${formatNaira(quote.amount)} sent to ${accountName} from ${wallet.businessName}'s wallet`,
          );
          onClose();
        },
        // The dialog stays open on the review step so they can safely retry
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Don't let a click outside hide a withdrawal that's still sending
        if (!open && !withdraw.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === "details"
              ? `Withdraw from ${wallet.businessName}`
              : "Review this withdrawal"}
          </DialogTitle>
          <DialogDescription>
            {step === "details"
              ? `Available balance: ${formatNaira(wallet.balance)}`
              : "Check the details. Withdrawals can't be undone."}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <form
            onSubmit={form.handleSubmit(() => {
              if (accountName) setStep("review");
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (₦)</Label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="25,000"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={
                  errors.amount ? "withdraw-amount-error" : undefined
                }
                {...form.register("amount")}
              />
              {errors.amount && (
                <p
                  id="withdraw-amount-error"
                  className="text-sm text-destructive"
                >
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-bank">Bank</Label>
              <Controller
                control={form.control}
                name="bankCode"
                render={({ field }) => (
                  <Select
                    items={bankItems}
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger
                      id="withdraw-bank"
                      className="w-full"
                      aria-invalid={Boolean(errors.bankCode)}
                    >
                      <SelectValue placeholder="Choose a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.bankCode && (
                <p className="text-sm text-destructive">
                  {errors.bankCode.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-account">Account number</Label>
              <Input
                id="withdraw-account"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                placeholder="10 digits"
                aria-invalid={Boolean(errors.accountNumber)}
                {...form.register("accountNumber")}
              />
              {errors.accountNumber ? (
                <p className="text-sm text-destructive">
                  {errors.accountNumber.message}
                </p>
              ) : (
                <AccountStatus
                  isFetching={lookup.isFetching}
                  name={accountName}
                  error={lookup.error?.message}
                />
              )}
            </div>

            {quote && <QuoteSummary quote={quote} balance={wallet.balance} />}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Review</Button>
            </DialogFooter>
          </form>
        ) : (
          quote && (
            <div className="space-y-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">To</dt>
                <dd className="text-right font-medium">{accountName}</dd>
                <dt className="text-muted-foreground">Bank</dt>
                <dd className="text-right">{bankName(bankCode)}</dd>
                <dt className="text-muted-foreground">Account</dt>
                <dd className="text-right tabular-nums">{accountNumber}</dd>
              </dl>
              <QuoteSummary quote={quote} balance={wallet.balance} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={withdraw.isPending}
                  onClick={() => setStep("details")}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={withdraw.isPending}
                  onClick={confirm}
                >
                  {withdraw.isPending && <Loader2 className="animate-spin" />}
                  {withdraw.isPending
                    ? "Sending…"
                    : `Send ${formatNaira(quote.amount)}`}
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountStatus({
  isFetching,
  name,
  error,
}: {
  isFetching: boolean;
  name?: string;
  error?: string;
}) {
  if (isFetching) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Checking account…
      </p>
    );
  }
  if (name) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" aria-hidden />
        {name}
      </p>
    );
  }
  if (error) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <XCircle className="size-3.5" aria-hidden />
        {error}
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      Demo: any 10 digits work; numbers starting 000 aren&apos;t found.
    </p>
  );
}

function QuoteSummary({
  quote,
  balance,
}: {
  quote: WithdrawalQuote;
  balance: Wallet["balance"];
}) {
  return (
    <dl className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="tabular-nums">{formatNaira(quote.amount)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Fee</dt>
        <dd className="tabular-nums">+{formatNaira(quote.fee)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t pt-1.5 font-medium">
        <dt>Total debited</dt>
        <dd className="tabular-nums">{formatNaira(quote.total)}</dd>
      </div>
      <div className="flex justify-between gap-4 text-xs text-muted-foreground">
        <dt>Balance after</dt>
        <dd className="tabular-nums">
          {formatNaira(kobo(balance - quote.total))}
        </dd>
      </div>
    </dl>
  );
}
