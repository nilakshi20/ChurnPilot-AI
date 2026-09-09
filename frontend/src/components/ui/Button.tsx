import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "inverse";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-ink-900 text-sand-50 hover:bg-ink-800",
        variant === "secondary" && "bg-white text-ink-900 ring-1 ring-sand-200 hover:bg-sand-50",
        variant === "ghost" && "text-ink-800 hover:bg-white/60",
        variant === "inverse" && "bg-sand-50 text-ink-900 hover:bg-white",
        className,
      )}
      {...props}
    />
  );
}
