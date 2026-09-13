import { useId, useState } from "react";
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "@/utils/cn";

/**
 * Hover + focus + click driven tooltip so keyboard and touch users get the same hint.
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label={typeof content === "string" ? content : "More information"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 rounded-full text-ink-700/60 transition hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
      >
        {children ?? <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />}
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-2xl bg-ink-950 px-3 py-2 text-[11px] leading-5 text-sand-50 shadow-panel"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
