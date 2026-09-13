import { cn } from "@/utils/cn";

export type TabItem = {
  id: string;
  label: string;
  badge?: string | number;
};

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Sections" className={cn("flex flex-wrap gap-1 rounded-full bg-sand-100 p-1", className)}>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500",
              isActive ? "bg-white text-ink-900 shadow-sm" : "text-ink-700/80 hover:text-ink-900",
            )}
          >
            {item.label}
            {item.badge !== undefined ? (
              <span className="rounded-full bg-sand-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink-800">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, active, children }: { id: string; active: string; children: React.ReactNode }) {
  if (id !== active) {
    return null;
  }
  return (
    <div role="tabpanel" aria-label={id}>
      {children}
    </div>
  );
}
