"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ChangedRule,
  type CustomFee,
  describeFeeRule,
  feeChannelDescriptions,
  feeChannelLabels,
  feeChannels,
  type FeeList,
  MAX_CUSTOM_FEES,
} from "@/lib/fees/fees";
import { formatDateTime } from "@/lib/format";
import { calculateFee, type FeeRule, formatNaira, kobo } from "@/lib/money";
import { FeeRuleDialog, type FeeTarget } from "./fee-rule-dialog";
import { useFees, useRemoveCustomFee } from "./use-fees";

/** The same payment for every rule, so they can be compared at a glance. */
const SAMPLE_AMOUNT = kobo(1_000_000);

function feeOnSample(rule: FeeRule) {
  return formatNaira(calculateFee(SAMPLE_AMOUNT, rule));
}

export function FeesView({
  initialFees,
  businesses,
  canManage,
}: {
  initialFees: FeeList;
  businesses: { id: string; name: string }[];
  canManage: boolean;
}) {
  const { data: fees } = useFees(initialFees);
  const remove = useRemoveCustomFee();
  const [target, setTarget] = useState<FeeTarget | null>(null);
  const [toRemove, setToRemove] = useState<FeeList["custom"][number] | null>(
    null,
  );
  const atLimit = fees.custom.length >= MAX_CUSTOM_FEES;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Default rules</h3>
          <p className="text-sm text-muted-foreground">
            What every business pays unless it has a custom rate.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[760px] table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[30%]">Channel</TableHead>
                <TableHead className="w-[23%] text-center">Rule</TableHead>
                <TableHead className="w-[15%] text-center">
                  Fee on ₦10,000
                </TableHead>
                <TableHead className="w-[20%]">Last changed</TableHead>
                {canManage && (
                  <TableHead className="w-[12%] text-right">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeChannels.map((channel) => {
                const fee = fees.defaults[channel];
                return (
                  <TableRow key={channel}>
                    <TableCell className="whitespace-normal">
                      <span className="font-medium">
                        {feeChannelLabels[channel]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {feeChannelDescriptions[channel]}
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-normal">
                      {describeFeeRule(fee.rule)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {feeOnSample(fee.rule)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <LastChanged fee={fee} />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${feeChannelLabels[channel]} fee`}
                          onClick={() =>
                            setTarget({ kind: "default", channel })
                          }
                        >
                          <Pencil />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-medium">Custom rates</h3>
            <p className="text-sm text-muted-foreground">
              Rates agreed with individual businesses, usually for high volume.
            </p>
          </div>
          {canManage && (
            <Button
              size="sm"
              disabled={atLimit}
              title={
                atLimit
                  ? `The demo keeps up to ${MAX_CUSTOM_FEES} custom rates. Remove one first.`
                  : undefined
              }
              onClick={() => setTarget({ kind: "custom" })}
            >
              <Plus />
              Add custom rate
            </Button>
          )}
        </div>

        {fees.custom.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No custom rates. Every business pays the default rules.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table className="min-w-[860px] table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[23%]">Business</TableHead>
                  <TableHead className="w-[13%]">Channel</TableHead>
                  <TableHead className="w-[19%] text-center">Rate</TableHead>
                  <TableHead className="w-[15%] text-center">
                    Fee on ₦10,000
                  </TableHead>
                  <TableHead className="w-[15%]">Last changed</TableHead>
                  {canManage && (
                    <TableHead className="w-[15%] text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.custom.map((fee) => (
                  <TableRow key={`${fee.businessId}:${fee.channel}`}>
                    <TableCell className="font-medium whitespace-normal">
                      {fee.businessName}
                    </TableCell>
                    <TableCell>{feeChannelLabels[fee.channel]}</TableCell>
                    <TableCell className="text-center whitespace-normal">
                      {describeFeeRule(fee.rule)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {feeOnSample(fee.rule)}
                      <span className="block text-xs text-muted-foreground">
                        default {feeOnSample(fees.defaults[fee.channel].rule)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <LastChanged fee={fee} />
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Edit ${fee.businessName}'s rate`}
                            title="Edit"
                            onClick={() => setTarget(toTarget(fee))}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Remove ${fee.businessName}'s rate`}
                            title="Remove"
                            onClick={() => setToRemove(fee)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {target && (
        <FeeRuleDialog
          target={target}
          fees={fees}
          businesses={businesses}
          onClose={() => setTarget(null)}
        />
      )}

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {toRemove?.businessName}&apos;s custom rate?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove &&
                `They'll go back to the default ${feeChannelLabels[toRemove.channel]} fee of ${describeFeeRule(fees.defaults[toRemove.channel].rule)} from their next transaction.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toRemove) {
                  const { businessId, channel, businessName } = toRemove;
                  remove.mutate(
                    { businessId, channel },
                    {
                      onSuccess: () =>
                        toast.success(`${businessName} is back on the default`),
                      onError: (error) => toast.error(error.message),
                    },
                  );
                }
                setToRemove(null);
              }}
            >
              Remove rate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function toTarget({ businessId, channel }: CustomFee): FeeTarget {
  return { kind: "custom", businessId, channel };
}

function LastChanged({ fee }: { fee: ChangedRule }) {
  if (!fee.by || !fee.at) {
    return <span className="text-muted-foreground">Original rule</span>;
  }
  return (
    <>
      {fee.by}
      <span className="block text-xs text-muted-foreground">
        {formatDateTime(fee.at)}
      </span>
    </>
  );
}
