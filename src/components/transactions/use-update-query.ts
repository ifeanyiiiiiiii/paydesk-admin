"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Updates the URL's search params, which re-renders the server-side results.
 * Keeping filters in the URL means a filtered view can be bookmarked, shared
 * or reloaded, and Back/Forward work as expected.
 */
export function useUpdateQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Changing a filter makes the current page number meaningless
    if (resetPage) params.delete("page");
    // and closes any open transaction drawer
    params.delete("txn");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return { searchParams, update, isPending };
}
