"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Wallet } from "@/lib/data/types";
import {
  type WalletStatusChange,
  withWalletStatus,
} from "@/lib/wallets/wallets";

const walletsKey = ["wallets"] as const;

/** An error with the server's message, so the UI can show it as-is. */
class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.error ?? "Something went wrong. Please try again.",
    );
  }
  return body as T;
}

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
