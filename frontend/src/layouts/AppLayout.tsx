import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileSidebar, Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-sand-50">
      <Sidebar />
      <MobileSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="border-t border-sand-200 px-4 py-4 text-[11px] leading-5 text-ink-700/60 sm:px-6 lg:px-8">
          ChurnPilot AI reads every number from the FastAPI backend. Churn probabilities, revenue-at-risk figures and AI
          recommendations are estimates that support human decisions; they are not guarantees, and no message is ever sent
          automatically.
        </footer>
      </div>
    </div>
  );
}
