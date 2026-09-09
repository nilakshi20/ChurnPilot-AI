import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sand-50 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-moss-600">404</p>
      <h1 className="font-display text-4xl text-ink-900">This page is not on the map.</h1>
      <Link to="/">
        <Button>Back to ChurnPilot</Button>
      </Link>
    </div>
  );
}
