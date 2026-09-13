import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, Search, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { DemoDataButton } from "@/components/DemoDataButton";
import { useSettings } from "@/contexts/SettingsContext";
import { useHealth, usePlatformSettings } from "@/hooks/useChurnpilot";
import { cn } from "@/utils/cn";
import { formatDate, formatNumber, initials } from "@/utils/format";

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const navigate = useNavigate();
  const { preferences } = useSettings();
  const health = useHealth();
  // Deliberately kept to cheap endpoints: the dashboard summary rescores the whole
  // customer base, so it must not run on every page just to fill this panel.
  const platform = usePlatformSettings();
  const [term, setTerm] = useState("");
  const [openPanel, setOpenPanel] = useState<"notifications" | "profile" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const apiOnline = !health.error && health.data?.status === "healthy";
  const notifications = [
    {
      id: "api",
      title: apiOnline ? "FastAPI backend is reachable" : "FastAPI backend is unreachable",
      detail: apiOnline
        ? `Database ${health.data?.database ?? "unknown"} · API v${health.data?.version ?? "?"}`
        : (health.error?.message ?? "Start the backend with uvicorn app.main:app --port 8000"),
    },
    {
      id: "model",
      title: platform.data?.model?.version ? `Model ${platform.data.model.version}` : "No trained model found",
      detail: platform.data?.model?.name
        ? `${platform.data.model.name} · trained ${formatDate(platform.data.model.trained_at)} on ${formatNumber(
            platform.data.model.metrics?.sample_count ?? 0,
          )} samples`
        : "Load demo data or run POST /api/predictions/run to train a model.",
    },
    {
      id: "demo",
      title: "Demo data is synthetic",
      detail: platform.data
        ? `Generated with seed ${platform.data.demo_seed} and ${formatNumber(
            platform.data.demo_customer_count,
          )} customers. It contains no real customer information.`
        : "The demo dataset is generated locally and contains no real customer information.",
    },
  ];

  return (
    <header
      ref={containerRef}
      className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-sand-200 bg-sand-50/95 px-4 py-3 backdrop-blur sm:px-6"
    >
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="rounded-2xl p-2 text-ink-800 transition hover:bg-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form
        role="search"
        className="order-last flex min-w-0 flex-1 basis-full items-center gap-2 rounded-full bg-white px-3.5 py-2 ring-1 ring-sand-200 focus-within:ring-moss-500 sm:order-none sm:basis-auto"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(term.trim() ? `/customers?search=${encodeURIComponent(term.trim())}` : "/customers");
        }}
      >
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-700/60" />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search customers by name, email or company"
          aria-label="Search customers"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-700/45"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:block">
          <Badge tone={apiOnline ? "success" : "danger"}>
            <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", apiOnline ? "bg-moss-600" : "bg-rose-600")} />
            {apiOnline ? "API connected" : "API offline"}
          </Badge>
        </span>

        <DemoDataButton size="sm" variant="secondary" label="Load Demo Data" className="hidden sm:inline-flex" />

        <div className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={openPanel === "notifications"}
            aria-label="Notifications"
            onClick={() => setOpenPanel((current) => (current === "notifications" ? null : "notifications"))}
            className="relative rounded-2xl bg-white p-2 text-ink-800 ring-1 ring-sand-200 transition hover:bg-sand-50"
          >
            <Bell className="h-4 w-4" />
            {!apiOnline ? (
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-600" />
            ) : null}
          </button>
          {openPanel === "notifications" ? (
            <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-white p-4 shadow-panel ring-1 ring-sand-200">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700/60">Workspace status</p>
              <ul className="mt-3 space-y-3">
                {notifications.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-sand-50 p-3">
                    <p className="text-sm font-medium text-ink-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-700/75">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={openPanel === "profile"}
            onClick={() => setOpenPanel((current) => (current === "profile" ? null : "profile"))}
            className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 ring-1 ring-sand-200 transition hover:bg-sand-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-sand-50">
              {initials(preferences.businessName)}
            </span>
            <span className="hidden max-w-[9rem] truncate text-sm text-ink-900 sm:block">{preferences.businessName}</span>
          </button>
          {openPanel === "profile" ? (
            <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white p-4 shadow-panel ring-1 ring-sand-200">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <UserRound aria-hidden="true" className="h-4 w-4" />
                {preferences.businessName}
              </p>
              <p className="mt-1 text-xs text-ink-700/75">
                Local workspace profile. Currency {preferences.currency} · default tone {preferences.defaultTone}.
              </p>
              <Link
                to="/settings"
                onClick={() => setOpenPanel(null)}
                className="mt-3 inline-flex text-sm font-medium text-moss-600 underline-offset-2 hover:underline"
              >
                Open settings
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
