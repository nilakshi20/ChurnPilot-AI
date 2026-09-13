import { AlertOctagon, AlertTriangle, CircleDot, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";
import type { PriorityLevel, RiskLevel } from "@/types/api";

type RiskConfig = {
  label: string;
  icon: LucideIcon;
  filled: number;
  classes: string;
};

/**
 * Risk is communicated three ways at once (icon shape, filled step count, text label)
 * so the meaning survives colour-blindness and greyscale printing.
 */
const RISK: Record<RiskLevel, RiskConfig> = {
  low: { label: "Low", icon: ShieldCheck, filled: 1, classes: "bg-moss-500/10 text-moss-600 ring-moss-500/30" },
  medium: { label: "Medium", icon: CircleDot, filled: 2, classes: "bg-amber-100 text-amber-800 ring-amber-300" },
  high: { label: "High", icon: AlertTriangle, filled: 3, classes: "bg-orange-100 text-orange-800 ring-orange-300" },
  critical: { label: "Critical", icon: AlertOctagon, filled: 4, classes: "bg-rose-100 text-rose-700 ring-rose-300" },
};

const PRIORITY: Record<PriorityLevel, { label: string; filled: number; classes: string }> = {
  low: { label: "Low", filled: 1, classes: "bg-sand-100 text-ink-800 ring-sand-200" },
  medium: { label: "Medium", filled: 2, classes: "bg-sky-100 text-sky-800 ring-sky-300" },
  high: { label: "High", filled: 3, classes: "bg-amber-100 text-amber-800 ring-amber-300" },
  urgent: { label: "Urgent", filled: 4, classes: "bg-rose-100 text-rose-700 ring-rose-300" },
};

function Steps({ filled, className }: { filled: number; className?: string }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            "h-3 w-1 rounded-full",
            step <= filled ? cn("bg-current", className) : "bg-current opacity-20",
          )}
        />
      ))}
    </span>
  );
}

export function RiskBadge({ level, showSteps = true }: { level: RiskLevel | null | undefined; showSteps?: boolean }) {
  if (!level || !RISK[level]) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-sand-200">
        Not scored
      </span>
    );
  }
  const config = RISK[level];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        config.classes,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {config.label} risk
      {showSteps ? <Steps filled={config.filled} /> : null}
    </span>
  );
}

export function PriorityBadge({ level }: { level: PriorityLevel | null | undefined }) {
  if (!level || !PRIORITY[level]) {
    return <span className="text-xs text-ink-700/70">—</span>;
  }
  const config = PRIORITY[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        config.classes,
      )}
    >
      {config.label} priority
      <Steps filled={config.filled} />
    </span>
  );
}

export function riskLabel(level: string | null | undefined): string {
  if (!level) return "Not scored";
  return RISK[level as RiskLevel]?.label ?? level;
}

export const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

export const RISK_CHART_COLORS: Record<string, string> = {
  low: "#3f7d5e",
  medium: "#d9a13b",
  high: "#dd7a3c",
  critical: "#b5443a",
  unscored: "#b8b0a0",
};
