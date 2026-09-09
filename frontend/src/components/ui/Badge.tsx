import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type BadgeProps = {
  tone?: "neutral" | "success" | "warning";
  children: ReactNode;
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-sand-100 text-ink-800",
        tone === "success" && "bg-moss-500/10 text-moss-600",
        tone === "warning" && "bg-amber-100 text-amber-800",
      )}
    >
      {children}
    </span>
  );
}
