import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/utils/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg";
};

export function Modal({ open, onClose, title, description, footer, children, size = "lg" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-panel ring-1 ring-sand-200 sm:rounded-3xl",
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-sand-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-xl text-ink-900">{title}</h2>
            {description ? <p className="mt-1 text-xs leading-5 text-ink-700/75">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-ink-700/70 transition hover:bg-sand-100 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="border-t border-sand-200 bg-sand-50/60 px-6 py-4">{footer}</footer> : null}
      </div>
    </div>
  );
}
