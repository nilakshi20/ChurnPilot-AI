import type { ReactNode } from "react";

import { Tooltip as InfoTooltip } from "@/components/ui/Tooltip";
import { cn } from "@/utils/cn";

export function ChartFrame({
  title,
  description,
  info,
  footnote,
  isEmpty,
  emptyMessage = "No data yet. Load demo data or upload customers to populate this chart.",
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  info?: string;
  footnote?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl bg-white p-6 shadow-panel ring-1 ring-sand-200", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink-900">
            {title}
            {info ? <InfoTooltip content={info} /> : null}
          </h2>
          {description ? <p className="mt-1 text-xs leading-5 text-ink-700/75">{description}</p> : null}
        </div>
        {actions}
      </div>
      {/* Recharts positions its tooltip wrapper absolutely and lets it extend past the
          chart, which widens the page on narrow viewports unless it is clipped here. */}
      <div className="mt-5 overflow-hidden">
        {isEmpty ? (
          <p className="flex h-64 items-center justify-center rounded-2xl bg-sand-50 px-6 text-center text-sm text-ink-700/70">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
      {footnote ? <p className="mt-4 text-[11px] leading-5 text-ink-700/60">{footnote}</p> : null}
    </section>
  );
}

export const AXIS_STYLE = {
  fontSize: 11,
  fill: "#2a3c35",
} as const;

export const GRID_COLOR = "#ece6d8";

export const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: "1px solid #d8cfbb",
  fontSize: 12,
  boxShadow: "0 18px 50px -28px rgba(16, 22, 20, 0.45)",
} as const;
