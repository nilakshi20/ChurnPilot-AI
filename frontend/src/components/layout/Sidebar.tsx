import { Link, NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/utils/cn";

export const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/segments", label: "Segments", icon: Layers },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/retention", label: "Retention", icon: BarChart3 },
  { to: "/upload", label: "Upload Data", icon: Upload },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-6 py-7">
        <Link to="/" className="flex items-center gap-3" onClick={onNavigate}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moss-500/20 text-moss-400">
            <Activity aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide">ChurnPilot AI</span>
            <span className="block text-xs text-sand-200/70">Retention control plane</span>
          </span>
        </Link>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="rounded-full p-2 text-sand-200/80 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 px-3">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-400",
                isActive ? "bg-white/10 text-white" : "text-sand-200/80 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="m-4 rounded-2xl bg-ink-800 p-4 text-xs leading-5 text-sand-200/80">
        Predict risk. Explain why it is happening. Act before the customer leaves.
      </p>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-ink-950 text-sand-50 lg:flex">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-72 flex-col bg-ink-950 text-sand-50 shadow-panel">
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
