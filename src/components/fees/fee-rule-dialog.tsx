"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  describeFeeRule,
  type FeeChannel,
  feeChannelLabels,
  feeChannels,
  type FeeList,
  type FeeRuleForm,
  feeRuleFormSchema,
  feeRuleToForm,
  formToFeeRule,
  resolveFeeRule,
  sameFeeRule,
} from "@/lib/fees/fees";
import {
  calculateFee,
  type FeeRule,
  formatNaira,
  kobo,
} from "@/lib/money";
import { useFeeEstimate, useSaveFee } from "./use-fees";

/** What's being edited. Leave out businessId and channel to add a custom rate. */
export type FeeTarget =
  | { kind: "default"; channel: FeeChannel }
  | { kind: "custom"; businessId?: string; channel?: FeeChannel };

const channelItems = feeChannels.map((channel) => ({
  value: channel,
  label: feeChannelLabels[channel],
}));

const exampleAmounts = [100_000, 1_000_000, 10_000_000, 100_000_000].map(kobo);

/** Sets or changes a fee rule, showing what it would do before it's saved. */
export function FeeRuleDialog({
  target,
  fees,
  businesses,
  onClose,
}: {
  target: FeeTarget;
  fees: FeeList;
  businesses: { id: string; name: string }[];
  onClose: () => void;
}) {
  const isAdding = target.kind === "custom" && !target.businessId;
  const [businessId, setBusinessId] = useState(
    target.kind === "custom" ? target.businessId : undefined,
  );
  const [channel, setChannel] = useState(target.channel);

  const form = useForm<FeeRuleForm>({
    resolver: zodResolver(feeRuleFormSchema),
    // Explains straight away why the preview below has gone
    mode: "onChange",
    defaultValues: isAdding
      ? { percent: "", flat: "", cap: "" }
      : feeRuleToForm(ruleInPlace(fees, target, businessId, channel)!),
  });
  const { errors } = form.formState;
  const [percent, flat, cap] = useWatch({
    control: form.control,
    name: ["percent", "flat", "cap"],
  });

  const rule = formToFeeRule({ percent, flat, cap });
  const current = ruleInPlace(fees, target, businessId, channel);
  const unchanged = rule && current && !isAdding && sameFeeRule(rule, current);
  const replacesRate =
    isAdding &&
    fees.custom.some(
      (fee) => fee.businessId === businessId && fee.channel === channel,
    );

  const save = useSaveFee();
  const estimate = useFeeEstimate(channel ?? null, businessId, rule);
  const businessName = businesses.find((b) => b.id === businessId)?.name;

  function submit() {
    if (!rule || !channel || (target.kind === "custom" && !businessId)) return;
    save.mutate(
      { channel, businessId, rule },
      {
        onSuccess: () => {
          const prefix = businessName ? `${businessName}: ` : "";
          toast.success(
            `${prefix}${feeChannelLabels[channel]} fee is now ${describeFeeRule(rule).toLowerCase()}`,
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          onSubmit={form.handleSubmit(submit)}
          className="space-y-4"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>
              {isAdding
                ? "Add a custom rate"
                : `${feeChannelLabels[channel!]} fee${businessName ? ` for ${businessName}` : ""}`}
            </DialogTitle>
            <DialogDescription>
              {target.kind === "default"
                ? "Applies to every business without a custom rate."
                : "A rate agreed with one business. It replaces the default for them."}
            </DialogDescription>
          </DialogHeader>

          {isAdding && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="fee-business">Business</Label>
                <Select
                  items={businesses.map((b) => ({ value: b.id, label: b.name }))}
                  value={businessId ?? null}
                  onValueChange={(value) => setBusinessId(value ?? undefined)}
                >
                  <SelectTrigger id="fee-business" className="w-full">
                    <SelectValue placeholder="Choose a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="fee-channel">Channel</Label>
                <Select
                  items={channelItems}
                  value={channel ?? null}
                  onValueChange={(value) =>
                    setChannel((value as FeeChannel | null) ?? undefined)
                  }
                >
                  <SelectTrigger id="fee-channel" className="w-full">
                    <SelectValue placeholder="Choose a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <RuleField
              id="fee-percent"
              label="Percent (%)"
              placeholder="1.5"
              error={errors.percent?.message}
              {...form.register("percent")}
            />
            <RuleField
              id="fee-flat"
              label="Flat fee (₦)"
              placeholder="0"
              error={errors.flat?.message}
              // The cap is checked against the flat fee, so re-check it too
              {...form.register("flat", { deps: ["cap"] })}
            />
            <RuleField
              id="fee-cap"
              label="Cap (₦)"
              placeholder="No cap"
              error={errors.cap?.message}
              {...form.register("cap")}
            />
          </div>

          {replacesRate && (
            <p className="text-sm text-muted-foreground">
              {businessName} already has a custom rate here (
              {current && describeFeeRule(current)}). Saving replaces it.
            </p>
          )}

          {rule && current && (
            <>
              {rule.percentBps === 0 && rule.flat === 0 && (
                <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="size-3.5" aria-hidden />
                  This rule charges nothing.
                </p>
              )}
              <Preview current={current} proposed={rule} />
              <EstimateLine
                isLoading={estimate.isFetching}
                data={estimate.data}
                isDefault={target.kind === "default"}
              />
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                save.isPending ||
                Boolean(unchanged) ||
                !channel ||
                (target.kind === "custom" && !businessId)
              }
              title={unchanged ? "Nothing has changed yet" : undefined}
            >
              {save.isPending && <Loader2 className="animate-spin" />}
              {save.isPending ? "Saving…" : "Save rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ruleInPlace(
  fees: FeeList,
  target: FeeTarget,
  businessId: string | undefined,
  channel: FeeChannel | undefined,
): FeeRule | null {
  if (!channel) return null;
  if (target.kind === "default") return fees.defaults[channel].rule;
  return businessId ? resolveFeeRule(fees, businessId, channel) : null;
}

function RuleField({
  id,
  label,
  error,
  ...input
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Worked out in the browser with the same calculateFee the server uses. */
function Preview({
  current,
  proposed,
}: {
  current: FeeRule;
  proposed: FeeRule;
}) {
  return (
    <table className="w-full rounded-lg bg-muted/60 text-sm tabular-nums">
      <caption className="sr-only">Fees now and with this rule</caption>
      <thead>
        <tr className="text-left text-muted-foreground">
          <th scope="col" className="p-2 pl-3 font-normal">
            On a payment of
          </th>
          <th scope="col" className="p-2 text-right font-normal">
            Now
          </th>
          <th scope="col" className="p-2 pr-3 text-right font-normal">
            New
          </th>
        </tr>
      </thead>
      <tbody>
        {exampleAmounts.map((amount) => (
          <tr key={amount}>
            <td className="px-2 py-1 pl-3">
              {formatNaira(amount, { compact: true })}
            </td>
            <td className="px-2 py-1 text-right text-muted-foreground">
              {formatNaira(calculateFee(amount, current))}
            </td>
            <td className="px-2 py-1 pr-3 text-right font-medium">
              {formatNaira(calculateFee(amount, proposed))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EstimateLine({
  isLoading,
  data,
  isDefault,
}: {
  isLoading: boolean;
  data?: { count: number; current: number; proposed: number };
  isDefault: boolean;
}) {
  if (!data) {
    return isLoading ? (
      <p className="text-sm text-muted-foreground">Estimating…</p>
    ) : null;
  }
  if (data.count === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No matching transactions in the last 30 days to compare against.
      </p>
    );
  }

  const difference = data.proposed - data.current;
  return (
    <p
      className="text-sm text-muted-foreground aria-busy:opacity-60"
      aria-busy={isLoading}
      aria-live="polite"
    >
      On the last 30 days&apos; {data.count.toLocaleString("en-NG")}{" "}
      transactions, this would earn{" "}
      <span className="font-medium text-foreground tabular-nums">
        {formatNaira(kobo(data.proposed))}
      </span>{" "}
      instead of{" "}
      <span className="tabular-nums">{formatNaira(kobo(data.current))}</span>
      {difference !== 0 && (
        <span className="tabular-nums">
          {" "}
          ({difference > 0 ? "+" : "-"}
          {formatNaira(kobo(Math.abs(difference)))})
        </span>
      )}
      .{isDefault && " Businesses on a custom rate aren't affected."}
    </p>
  );
}
