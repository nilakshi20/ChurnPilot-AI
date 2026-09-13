import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/utils/cn";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tooltip,
  emphasis = false,
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tooltip?: string;
  emphasis?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-3xl p-5 shadow-panel ring-1",
        emphasis ? "bg-ink-950 text-sand-50 ring-ink-800" : "bg-white text-ink-900 ring-sand-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
            emphasis ? "text-sand-200/80" : "text-ink-700/65",
          )}
        >
          {label}
          {tooltip ? <Tooltip content={tooltip} /> : null}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-2xl",
              emphasis ? "bg-white/10 text-sand-50" : "bg-sand-100 text-ink-800",
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-display text-3xl leading-none">{value}</p>
      {hint ? (
        <p className={cn("mt-2 text-xs leading-5", emphasis ? "text-sand-200/75" : "text-ink-700/70")}>{hint}</p>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100"
      >
        <div className="h-full rounded-full bg-ink-900" style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}
