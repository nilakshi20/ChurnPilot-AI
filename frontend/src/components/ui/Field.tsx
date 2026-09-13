import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

const CONTROL =
  "w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2 text-sm text-ink-900 transition placeholder:text-ink-700/40 focus:border-moss-500 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-moss-500/40";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: (props: { id: string; describedBy?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700/70">
        {label}
      </label>
      <div className="mt-1.5">{children({ id, describedBy: hintId })}</div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-[11px] leading-5 text-ink-700/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-[10rem] leading-6", className)} {...props} />;
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-sand-200 text-moss-600 focus:ring-moss-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-ink-700/70">{description}</span> : null}
      </span>
    </label>
  );
}
