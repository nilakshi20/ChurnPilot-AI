import { NavLink } from "react-router-dom";
import { Activity, Compass, HeartPulse, LayoutDashboard } from "lucide-react";

import { cn } from "@/utils/cn";

const links = [
  { to: "/", label: "Home", icon: Compass },
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/health", label: "System health", icon: HeartPulse },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-white/10 bg-ink-950 text-sand-50">
      <div className="flex items-center gap-3 px-6 py-7">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moss-500/20 text-moss-400">
          <Activity className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-wide">ChurnPilot AI</p>
          <p className="text-xs text-sand-200/70">Retention control plane</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                isActive ? "bg-white/10 text-white" : "text-sand-200/80 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-4 rounded-2xl bg-ink-800 p-4 text-xs leading-5 text-sand-200/80">
        Predict risk. Explain why it is happening. Act before the customer leaves.
      </div>
    </aside>
  );
}
