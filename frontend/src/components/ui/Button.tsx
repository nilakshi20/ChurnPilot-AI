import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/utils/cn";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500 disabled:cursor-not-allowed disabled:opacity-60";

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
} as const;

const VARIANTS = {
  primary: "bg-ink-900 text-sand-50 hover:bg-ink-800",
  secondary: "bg-white text-ink-900 ring-1 ring-sand-200 hover:bg-sand-50",
  ghost: "text-ink-800 hover:bg-white/70",
  inverse: "bg-sand-50 text-ink-900 hover:bg-white",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn(BASE, SIZES[size], VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}
