"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";

/**
 * Makes the whole row open the transaction's details. The reference cell
 * also contains a real link, so keyboard and screen-reader users get the
 * same thing; this just gives mouse users a bigger target.
 */
export function TransactionRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={(event) => {
        // Let real links, buttons and text selection behave normally
        if ((event.target as HTMLElement).closest("a, button")) return;
        if (window.getSelection()?.toString()) return;
        router.push(href, { scroll: false });
      }}
    >
      {children}
    </TableRow>
  );
}
