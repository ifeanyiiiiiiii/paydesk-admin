"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { request } from "@/lib/api-client";
import type { Wallet } from "@/lib/data/types";
import {
  type WalletStatusChange,
  withWalletStatus,
} from "@/lib/wallets/wallets";
import {
  isAccountNumber,
  type Withdrawal,
  type WithdrawalRequest,
} from "@/lib/wallets/withdrawals";

export const walletsKey = ["wallets"] as const;

/**
 * The wallets list. Starts from the server-rendered data, so there's no
 * loading spinner on first paint, then stays fresh in the background.
 */
export function useWallets(initialData: Wallet[]) {
  return useQuery({
    queryKey: walletsKey,
    queryFn: () => request<Wallet[]>("/api/wallets"),
    initialData,
  });
}

/**
 * Freeze or unfreeze with an optimistic update: the list changes the moment
 * you confirm, and rolls back with an error message if the server refuses.
 */
export function useWalletStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: WalletStatusChange }) =>
      request<Wallet>(`/api/wallets/${id}/status`, {
        method: "POST",
        body: JSON.stringify(change),
      }),

    onMutate: async ({ id, change }) => {
      // Stop any in-flight refetch from overwriting the optimistic state
      await queryClient.cancelQueries({ queryKey: walletsKey });
      const previous = queryClient.getQueryData<Wallet[]>(walletsKey);
      queryClient.setQueryData<Wallet[]>(walletsKey, (wallets = []) =>
        withWalletStatus(
          wallets,
          id,
          change.action === "freeze" ? "frozen" : "active",
        ),
      );
      return { previous };
    },

    onError: (error, _variables, context) => {
      // Roll back to exactly what was there before
      if (context?.previous) {
        queryClient.setQueryData(walletsKey, context.previous);
      }
      toast.error(error.message);
    },

    onSuccess: (wallet, { change }) => {
      // Replace the placeholder with the server's version (real time, actor, reason)
      queryClient.setQueryData<Wallet[]>(walletsKey, (wallets = []) =>
        wallets.map((w) => (w.id === wallet.id ? wallet : w)),
      );
      toast.success(
        change.action === "freeze"
          ? `${wallet.businessName}'s wallet is frozen`
          : `${wallet.businessName}'s wallet is active again`,
      );
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: walletsKey }),
  });
}

/**
 * Looks up the account holder once the bank and all 10 digits are in. Results
 * are cached by bank and account, so going back and forth doesn't re-fetch.
 */
export function useAccountLookup(bankCode: string, accountNumber: string) {
  return useQuery({
    queryKey: ["account-lookup", bankCode, accountNumber],
    queryFn: () =>
      request<{ accountName: string }>(
        `/api/banks/lookup?bank=${bankCode}&account=${accountNumber}`,
      ),
    enabled: Boolean(bankCode) && isAccountNumber(accountNumber),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/**
 * Sends a withdrawal. Unlike freezing this is deliberately not optimistic:
 * a balance shouldn't look lower, or the money look sent, until the server
 * has confirmed it. The same idempotency key is reused on a retry, so a
 * lost response can't lead to paying twice.
 */
export function useWithdraw(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: WithdrawalRequest) =>
      request<{ wallet: Wallet; withdrawal: Withdrawal }>(
        `/api/wallets/${walletId}/withdrawals`,
        { method: "POST", body: JSON.stringify(body) },
      ),

    onSuccess: ({ wallet }) => {
      queryClient.setQueryData<Wallet[]>(walletsKey, (wallets = []) =>
        wallets.map((w) => (w.id === wallet.id ? wallet : w)),
      );
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: walletsKey }),
  });
}
