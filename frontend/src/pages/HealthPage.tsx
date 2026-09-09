import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useHealth } from "@/hooks/useHealth";

export function HealthPage() {
  const { loading, error, payload } = useHealth();
  const data = payload?.data;

  return (
    <div>
      <TopBar
        title="System health"
        subtitle="Live check against GET /api/health. Backend secrets stay on the server."
      />
      <div className="p-8">
        <Card className="max-w-2xl">
          {loading ? <p className="text-sm text-ink-700/70">Checking API status…</p> : null}

          {error ? (
            <div>
              <Badge tone="warning">Unreachable</Badge>
              <p className="mt-4 text-sm leading-6 text-ink-700/80">{error}</p>
            </div>
          ) : null}

          {data ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge tone={data.database === "connected" ? "success" : "warning"}>
                  {data.status}
                </Badge>
                <span className="text-sm text-ink-700/70">API response received</span>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-ink-700/60">Status</dt>
                  <dd className="mt-1 text-lg font-medium">{data.status}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-ink-700/60">Database</dt>
                  <dd className="mt-1 text-lg font-medium">{data.database}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-ink-700/60">Version</dt>
                  <dd className="mt-1 text-lg font-medium">{data.version}</dd>
                </div>
              </dl>
              <pre className="overflow-x-auto rounded-2xl bg-sand-50 p-4 text-xs text-ink-800">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
