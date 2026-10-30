"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { walletsKey } from "@/components/wallets/use-wallets";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { request } from "@/lib/api-client";
import type { FeeChannel, FeeEstimate, FeeList } from "@/lib/fees/fees";
import type { FeeRule } from "@/lib/money";

const feesKey = ["fees"] as const;
const estimateKey = ["fee-estimate"] as const;

export function useFees(initialData: FeeList) {
  return useQuery({
    queryKey: feesKey,
    queryFn: () => request<FeeList>("/api/fees"),
    initialData,
  });
}

/** Keeps the page, the estimates and the wallets' fees in step with a change. */
function useFeesChanged() {
  const queryClient = useQueryClient();
  return (fees: FeeList) => {
    queryClient.setQueryData(feesKey, fees);
    queryClient.invalidateQueries({ queryKey: estimateKey });
    queryClient.invalidateQueries({ queryKey: walletsKey });
  };
}

/**
 * Saves a default rule, or a custom rate when there's a businessId. Like
 * withdrawals this isn't optimistic: a rule shouldn't look live until the
 * server has accepted it, because it changes what businesses are charged.
 */
export function useSaveFee() {
  const onChanged = useFeesChanged();
  return useMutation({
    mutationFn: ({
      channel,
      businessId,
      rule,
    }: {
      channel: FeeChannel;
      businessId?: string;
      rule: FeeRule;
    }) =>
      request<FeeList>(
        businessId
          ? `/api/fees/custom/${businessId}/${channel}`
          : `/api/fees/defaults/${channel}`,
        { method: "PUT", body: JSON.stringify(rule) },
      ),
    onSuccess: onChanged,
  });
}

export function useRemoveCustomFee() {
  const onChanged = useFeesChanged();
  return useMutation({
    mutationFn: ({
      businessId,
      channel,
    }: {
      businessId: string;
      channel: FeeChannel;
    }) =>
      request<FeeList>(`/api/fees/custom/${businessId}/${channel}`, {
        method: "DELETE",
      }),
    onSuccess: onChanged,
  });
}

/**
 * What a rule would have earned recently, compared with today's. Waits for a
 * pause in typing and keeps the last answer on screen while the next one loads.
 */
export function useFeeEstimate(
  channel: FeeChannel | null,
  businessId: string | undefined,
  rule: FeeRule | null,
) {
  // A string, so an equal rule from a new render doesn't restart the wait
  const body = useDebouncedValue(
    channel && rule ? JSON.stringify({ channel, businessId, rule }) : null,
  );

  return useQuery({
    queryKey: [...estimateKey, body],
    queryFn: () =>
      request<FeeEstimate>("/api/fees/estimate", { method: "POST", body: body! }),
    enabled: body !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
