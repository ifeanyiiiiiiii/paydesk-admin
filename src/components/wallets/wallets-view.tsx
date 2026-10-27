"use client";

import {
  Lock,
  LockOpen,
  ShieldAlert,
  Wallet as WalletIcon,
} from "lucide-react";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Wallet } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format";
import { formatNaira, sumKobo } from "@/lib/money";
import { FreezeDialog } from "./freeze-dialog";
import { useWallets, useWalletStatus } from "./use-wallets";

export function WalletsView({
  initialWallets,
  canFreeze,
}: {
  initialWallets: Wallet[];
  canFreeze: boolean;
}) {
  const { data: wallets } = useWallets(initialWallets);
  const statusChange = useWalletStatus();
  const [toFreeze, setToFreeze] = useState<Wallet | null>(null);
  const [toUnfreeze, setToUnfreeze] = useState<Wallet | null>(null);

  // Worked out from the query data, so they update with optimistic changes too
  const frozen = wallets.filter((w) => w.status === "frozen");
  const total = sumKobo(wallets.map((w) => w.balance));
  const held = sumKobo(frozen.map((w) => w.balance));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Summary
          icon={WalletIcon}
          label="Total held in wallets"
          value={formatNaira(total, { compact: true })}
        />
        <Summary
          icon={ShieldAlert}
          label="Frozen wallets"
          value={`${frozen.length} of ${wallets.length}`}
        />
        <Summary
          icon={Lock}
          label="Balance in frozen wallets"
          value={formatNaira(held, { compact: true })}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Business</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              {canFreeze && (
                <TableHead className="text-right">Action</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallets.map((wallet) => (
              <TableRow key={wallet.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="font-medium">{wallet.businessName}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {wallet.id}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                  {formatNaira(wallet.balance)}
                </TableCell>
                <TableCell className="min-w-56">
                  <WalletStatusCell wallet={wallet} />
                </TableCell>
                {canFreeze && (
                  <TableCell className="text-right">
                    {wallet.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToFreeze(wallet)}
                      >
                        <Lock />
                        Freeze
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToUnfreeze(wallet)}
                      >
                        <LockOpen />
                        Unfreeze
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FreezeDialog
        wallet={toFreeze}
        onClose={() => setToFreeze(null)}
        onConfirm={(wallet, values) =>
          statusChange.mutate({
            id: wallet.id,
            change: { action: "freeze", ...values },
          })
        }
      />

      <AlertDialog
        open={toUnfreeze !== null}
        onOpenChange={(open) => !open && setToUnfreeze(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unfreeze {toUnfreeze?.businessName}&apos;s wallet?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It was frozen for: {toUnfreeze?.frozen?.reason}. Once unfrozen,
              the business can withdraw again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toUnfreeze) {
                  statusChange.mutate({
                    id: toUnfreeze.id,
                    change: { action: "unfreeze" },
                  });
                }
                setToUnfreeze(null);
              }}
            >
              Unfreeze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WalletStatusCell({ wallet }: { wallet: Wallet }) {
  if (wallet.status === "active") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      >
        Active
      </Badge>
    );
  }
  return (
    <div className="space-y-1">
      <Badge
        variant="outline"
        className="border-red-600/20 bg-red-500/10 text-red-700 dark:text-red-400"
      >
        <Lock aria-hidden />
        Frozen
      </Badge>
      {wallet.frozen && (
        <p className="text-xs text-muted-foreground">
          {wallet.frozen.reason}
          {wallet.frozen.at && (
            <>
              <br />
              {wallet.frozen.by} · {formatDateTime(wallet.frozen.at)}
            </>
          )}
        </p>
      )}
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
