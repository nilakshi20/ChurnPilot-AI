import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-2xl bg-sand-100", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function LoadingCards({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-3xl bg-white p-6 shadow-panel ring-1 ring-sand-200">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function LoadingTable({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-panel ring-1 ring-sand-200" role="status" aria-label="Loading table">
      <div className="border-b border-sand-200 bg-sand-50/70 px-4 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-sand-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className={cn("h-3", columnIndex === 0 ? "w-48" : "w-20")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  code,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  code?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-3xl bg-white p-6 shadow-panel ring-1 ring-rose-200",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        {title}
      </span>
      <p className="text-sm leading-6 text-ink-700">{message}</p>
      {code ? <p className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">Error code: {code}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: typeof Inbox;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl bg-white px-6 py-14 text-center shadow-panel ring-1 ring-sand-200",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-100 text-ink-700">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-ink-700/80">{message}</p>
      {action}
    </div>
  );
}
