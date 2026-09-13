import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-3xl bg-white p-6 shadow-panel ring-1 ring-sand-200", className)}>{children}</section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-ink-700/75">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KeyValue({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-ink-900">{value}</dd>
      {hint ? <p className="mt-0.5 text-[11px] text-ink-700/60">{hint}</p> : null}
    </div>
  );
}
