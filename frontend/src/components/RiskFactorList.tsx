import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/utils/cn";
import type { RiskFactor } from "@/types/api";

/**
 * SHAP-style contributions. Bars are scaled against the largest absolute contribution
 * in the set, and each row states the direction in words as well as with an icon.
 */
export function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  if (factors.length === 0) {
    return (
      <p className="rounded-2xl bg-sand-50 p-4 text-sm text-ink-700/80">
        No contributing factors were returned for this prediction.
      </p>
    );
  }

  const max = Math.max(...factors.map((factor) => Math.abs(factor.contribution)), 0.0001);

  return (
    <ul className="space-y-3">
      {factors.map((factor) => {
        const increases = factor.effect === "increases_predicted_risk";
        const width = (Math.abs(factor.contribution) / max) * 100;
        return (
          <li key={factor.feature}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-ink-900">
                {increases ? (
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-rose-600" />
                ) : (
                  <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5 text-moss-600" />
                )}
                <span className="truncate">{factor.label}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-700">
                {factor.contribution > 0 ? "+" : ""}
                {factor.contribution.toFixed(4)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
              <div
                className={cn("h-full rounded-full", increases ? "bg-rose-500" : "bg-moss-500")}
                style={{ width: `${Math.max(4, width)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-700/65">
              {increases ? "Pushes the predicted risk up" : "Pushes the predicted risk down"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
