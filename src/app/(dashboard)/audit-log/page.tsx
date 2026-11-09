import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RequirePermission } from "@/components/require-permission";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AuditCategory,
  auditActions,
  auditActors,
  auditCategories,
  categoryOf,
  filterAudit,
} from "@/lib/audit/audit";
import { getAuditLog } from "@/lib/audit/service";
import { roleDetails } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

type SearchParams = PageProps<"/audit-log">["searchParams"];

export default function AuditLogPage({ searchParams }: PageProps<"/audit-log">) {
  return (
    <RequirePermission permission="audit:view">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Audit log</h2>
          <p className="text-sm text-muted-foreground">
            Every change made in PayDesk: who did it, when and what changed.
            Entries can&apos;t be edited or deleted, not even by super admins.
          </p>
        </div>
        {/* Filters come from the URL, so it renders at request time */}
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <AuditResults searchParams={searchParams} />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Demo note: your own actions are saved for your browser only, and the
          latest ones are kept.
        </p>
      </div>
    </RequirePermission>
  );
}

const categoryStyles: Record<AuditCategory, string> = {
  wallets: "border-sky-600/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  withdrawals:
    "border-violet-600/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  fees: "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  admins:
    "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  exports: "border-border bg-muted text-muted-foreground",
};

async function AuditResults({ searchParams }: { searchParams: SearchParams }) {
  const log = await getAuditLog();
  if (!log) return null;

  const params = await searchParams;
  const pick = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  // Anything unknown in the URL is ignored rather than trusted
  const categoryParam = pick(params.category);
  const category =
    categoryParam && categoryParam in auditCategories
      ? (categoryParam as AuditCategory)
      : undefined;
  const actors = auditActors(log);
  const actorParam = pick(params.actor);
  const actor = actorParam && actors.includes(actorParam) ? actorParam : undefined;
  const entries = filterAudit(log, { category, actor });

  const href = (change: { category?: string; actor?: string }) => {
    const next = new URLSearchParams();
    const merged = { category, actor, ...change };
    if (merged.category) next.set("category", merged.category);
    if (merged.actor) next.set("actor", merged.actor);
    const query = next.toString();
    return query ? `/audit-log?${query}` : "/audit-log";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FilterRow label="Area">
          <Chip href={href({ category: undefined })} active={!category}>
            All
          </Chip>
          {Object.entries(auditCategories).map(([key, label]) => (
            <Chip key={key} href={href({ category: key })} active={category === key}>
              {label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Who">
          <Chip href={href({ actor: undefined })} active={!actor}>
            Everyone
          </Chip>
          {actors.map((name) => (
            <Chip key={name} href={href({ actor: name })} active={actor === name}>
              {name}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing matches these filters.{" "}
          <Link href="/audit-log" className="underline underline-offset-4">
            Show everything
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[880px] table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[16%]">When</TableHead>
                <TableHead className="w-[17%]">Who</TableHead>
                <TableHead className="w-[21%]">Action</TableHead>
                <TableHead className="w-[18%]">On</TableHead>
                <TableHead className="w-[28%]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-normal tabular-nums">
                    {formatDateTime(entry.at)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{entry.actor}</span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.actorRole
                        ? roleDetails[entry.actorRole].label
                        : "Automated"}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Badge
                      variant="outline"
                      className={categoryStyles[categoryOf(entry.action)]}
                    >
                      {auditCategories[categoryOf(entry.action)]}
                    </Badge>
                    <span className="mt-1 block">
                      {auditActions[entry.action].label}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.target}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {entry.detail ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Showing {entries.length} of {log.length} entries
      </p>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-12 text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {children}
    </Link>
  );
}
