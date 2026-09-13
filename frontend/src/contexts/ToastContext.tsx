import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/utils/cn";

export type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  notify: (toast: { tone?: ToastTone; title: string; description?: string }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ tone = "info", title, description }: { tone?: ToastTone; title: string; description?: string }) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 9000 : 6000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl bg-white p-4 shadow-panel ring-1",
                toast.tone === "success" && "ring-moss-500/40",
                toast.tone === "error" && "ring-rose-300",
                toast.tone === "info" && "ring-sand-200",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  toast.tone === "success" && "text-moss-600",
                  toast.tone === "error" && "text-rose-600",
                  toast.tone === "info" && "text-ink-700",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-xs leading-5 text-ink-700/80">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-full p-1 text-ink-700/60 transition hover:bg-sand-100 hover:text-ink-900"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
