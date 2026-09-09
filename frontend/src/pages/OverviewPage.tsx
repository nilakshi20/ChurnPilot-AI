import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";

export function OverviewPage() {
  return (
    <div>
      <TopBar
        title="Overview"
        subtitle="The analytics workspace will live here. No sample customer or prediction data is shown yet."
      />
      <div className="p-8">
        <Card className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.16em] text-moss-600">Coming next</p>
          <h2 className="mt-3 font-display text-3xl">Dashboard, scoring, and retention actions</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-700/80">
            This page is intentionally empty of metrics. Once customer records and the model
            pipeline are connected, risk, revenue, and recommended actions will render here.
          </p>
        </Card>
      </div>
    </div>
  );
}
