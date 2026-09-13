import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sand-50 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink-800 ring-1 ring-sand-200">
        <Compass aria-hidden="true" className="h-5 w-5" />
      </span>
      <h1 className="font-display text-3xl text-ink-900">This page does not exist</h1>
      <p className="max-w-md text-sm leading-6 text-ink-700/80">
        The route you followed is not part of ChurnPilot AI. Head back to the dashboard to continue.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-sand-50 transition hover:bg-ink-800"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
