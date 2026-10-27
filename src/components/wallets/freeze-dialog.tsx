"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Wallet } from "@/lib/data/types";
import { formatNaira } from "@/lib/money";
import {
  type FreezeForm,
  freezeFormSchema,
  freezeReasons,
} from "@/lib/wallets/wallets";

const reasonItems = freezeReasons.map((reason) => ({
  value: reason,
  label: reason,
}));

/**
 * Asks why before freezing. Validated with the same Zod schema the API uses,
 * so mistakes show instantly and the server can't be sent anything invalid.
 */
export function FreezeDialog({
  wallet,
  onClose,
  onConfirm,
}: {
  wallet: Wallet | null;
  onClose: () => void;
  onConfirm: (wallet: Wallet, values: FreezeForm) => void;
}) {
  const form = useForm<FreezeForm>({
    resolver: zodResolver(freezeFormSchema),
    defaultValues: { note: "" },
  });
  const { errors } = form.formState;
  const note = useWatch({ control: form.control, name: "note" }) ?? "";

  function close() {
    form.reset({ note: "" });
    onClose();
  }

  return (
    <Dialog open={wallet !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        {wallet && (
          <form
            onSubmit={form.handleSubmit((values) => {
              onConfirm(wallet, values);
              close();
            })}
            className="space-y-4"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>
                Freeze {wallet.businessName}&apos;s wallet?
              </DialogTitle>
              <DialogDescription>
                No money can leave a frozen wallet until it&apos;s unfrozen. Its
                balance of {formatNaira(wallet.balance)} stays where it is.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="freeze-reason">Reason</Label>
              <Controller
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <Select
                    items={reasonItems}
                    value={field.value ?? null}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger
                      id="freeze-reason"
                      className="w-full"
                      aria-invalid={Boolean(errors.reason)}
                      aria-describedby={
                        errors.reason ? "freeze-reason-error" : undefined
                      }
                    >
                      <SelectValue placeholder="Choose a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reason && (
                <p
                  id="freeze-reason-error"
                  className="text-sm text-destructive"
                >
                  {errors.reason.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeze-note">
                Note{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="freeze-note"
                placeholder="e.g. Ticket number or what you've checked"
                aria-invalid={Boolean(errors.note)}
                aria-describedby="freeze-note-help"
                {...form.register("note")}
              />
              <p
                id="freeze-note-help"
                className={
                  errors.note
                    ? "text-sm text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {errors.note?.message ?? `${note.length}/200`}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Freeze wallet
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
