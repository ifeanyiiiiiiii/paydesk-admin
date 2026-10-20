import { Badge } from "@/components/ui/badge";
import { statusLabels, type TransactionStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const styles: Record<TransactionStatus, string> = {
  successful:
    "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  pending:
    "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "border-red-600/20 bg-red-500/10 text-red-700 dark:text-red-400",
  reversed:
    "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
