import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type BadgeProps = {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "ai";
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-sand-100 text-ink-800",
        tone === "success" && "bg-moss-500/10 text-moss-600",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-rose-100 text-rose-700",
        tone === "info" && "bg-sky-100 text-sky-800",
        tone === "ai" && "bg-violet-100 text-violet-800",
        className,
      )}
    >
      {children}
    </span>
  );
}
