import type { ReactNode, ThHTMLAttributes } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/utils/cn";

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-3xl bg-white shadow-panel ring-1 ring-sand-200", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <table className="min-w-full border-collapse text-left text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  );
}

export function Th({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children: ReactNode }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-sand-200 bg-sand-50/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-700/70",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function SortableTh({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  columnKey: string;
  activeKey: string;
  direction: "asc" | "desc";
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  const isActive = activeKey === columnKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <Th
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={align === "right" ? "text-right" : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded uppercase tracking-[0.12em] transition hover:text-ink-900",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500",
          isActive && "text-ink-900",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </Th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-sand-100 px-4 py-3 align-middle text-ink-900", className)}>{children}</td>;
}

export function Tr({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  if (!onClick) {
    return <tr className={className}>{children}</tr>;
  }
  return (
    <tr
      tabIndex={0}
      role="link"
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer transition hover:bg-sand-50 focus:bg-sand-50 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-moss-500",
        className,
      )}
    >
      {children}
    </tr>
  );
}
