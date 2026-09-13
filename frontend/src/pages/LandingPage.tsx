import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Database,
  LineChart,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskIndicator";
import { Skeleton } from "@/components/ui/States";
import { useCurrency } from "@/contexts/SettingsContext";
import { useDashboardSummary, useDemoLoader } from "@/hooks/useChurnpilot";
import { formatCompactCurrency, formatNumber, formatPercent } from "@/utils/format";

const PILLARS = [
  {
    id: "predict",
    title: "Predict",
    icon: BrainCircuit,
    body: "A gradient-boosted model scores every customer from tenure, spend, order cadence, inactivity, engagement, support pressure and payment failures.",
  },
  {
    id: "explain",
    title: "Explain",
    icon: LineChart,
    body: "SHAP contributions show the factors behind each prediction, so your team can read the reasoning instead of trusting a black box.",
  },
  {
    id: "retain",
    title: "Retain",
    icon: MessageSquareHeart,
    body: "Gemini drafts a retention strategy and a channel-specific message. Every draft is reviewed and edited by a human before it leaves the building.",
  },
  {
    id: "revenue",
    title: "Protect Revenue",
    icon: Wallet,
    body: "Revenue at risk combines monthly spend with churn probability, aggregated by segment and risk band so you can defend the largest exposure first.",
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { loadDemo, loading } = useDemoLoader();
  const summary = useDashboardSummary();
  const currency = useCurrency();
  const hasData = (summary.data?.total_customers ?? 0) > 0;

  const exploreDemo = async () => {
    try {
      await loadDemo();
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-950 text-moss-400">
            <Activity aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">ChurnPilot AI</span>
            <span className="block text-xs text-ink-700/70">Predict. Explain. Retain.</span>
          </span>
        </span>
        <nav className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-800 transition hover:bg-white sm:inline-flex"
          >
            Dashboard
          </Link>
          <Link
            to="/customers"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-800 transition hover:bg-white sm:inline-flex"
          >
            Customers
          </Link>
          <Button size="sm" onClick={() => navigate("/dashboard")}>
            Open app
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8 sm:pt-14">
        <Badge tone="success">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          Churn prediction, explainability and retention in one workspace
        </Badge>
        <h1 className="mt-6 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
          Know Who Might Leave Before They Do.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink-700">
          ChurnPilot AI helps businesses predict customer churn, understand revenue risk, and take personalized retention
          actions.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" loading={loading} onClick={() => void exploreDemo()}>
            {!loading ? <Database aria-hidden="true" className="h-4 w-4" /> : null}
            {loading ? "Preparing demo workspace…" : "Explore Demo"}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate("/dashboard")}>
            View Dashboard
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-4 max-w-xl text-xs leading-5 text-ink-700/70">
          Explore Demo generates a synthetic dataset in PostgreSQL, retrains the model and scores every customer. No real
          customer data is used anywhere in the demo.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <DashboardPreview
          loading={summary.loading}
          hasData={hasData}
          currency={currency}
          summary={summary.data}
          onLoadDemo={() => void loadDemo().catch(() => undefined)}
          demoLoading={loading}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="font-display text-2xl sm:text-3xl">How ChurnPilot works</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700/80">
          Four stages, each backed by real calculations in the FastAPI service rather than dashboard decoration.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ id, title, icon: Icon, body }) => (
            <article key={id} className="rounded-3xl bg-white p-6 shadow-panel ring-1 ring-sand-200">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sand-100 text-ink-900">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-700/80">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-ink-950 p-8 text-sand-50 shadow-panel sm:p-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl">Retention decisions your team can defend</h2>
              <p className="mt-3 text-sm leading-6 text-sand-200/85">
                Every score comes with its contributing factors, every revenue figure is labelled as an estimate, and every
                generated message stays a draft until a human approves it.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="inverse" onClick={() => navigate("/retention")}>
                  See the retention queue
                </Button>
                <Button variant="ghost" className="text-sand-50 hover:bg-white/10" onClick={() => navigate("/insights")}>
                  Review insights
                </Button>
              </div>
            </div>
            <ul className="grid gap-3 text-sm text-sand-200/85">
              <li className="flex items-start gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 text-moss-400" />
                Gemini is called only from the backend; no keys reach the browser.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 text-moss-400" />
                React talks to FastAPI only, never straight to PostgreSQL.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 text-moss-400" />
                Model metrics come from a real train/test evaluation, not hardcoded numbers.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand-200 px-6 py-8">
        <p className="mx-auto max-w-6xl text-xs leading-5 text-ink-700/65">
          ChurnPilot AI · Predict customer churn. Understand why. Take the right retention action. Predictions and revenue
          estimates support human judgement and never replace it.
        </p>
      </footer>
    </div>
  );
}

function DashboardPreview({
  loading,
  hasData,
  currency,
  summary,
  onLoadDemo,
  demoLoading,
}: {
  loading: boolean;
  hasData: boolean;
  currency: string;
  summary: ReturnType<typeof useDashboardSummary>["data"];
  onLoadDemo: () => void;
  demoLoading: boolean;
}) {
  const topSegments = (summary?.revenue_at_risk_by_segment ?? []).slice(0, 4);
  const maxRisk = Math.max(1, ...topSegments.map((segment) => segment.revenue_at_risk));

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-panel ring-1 ring-sand-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 bg-sand-50/70 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700/60">Live dashboard preview</p>
          <p className="mt-1 text-sm text-ink-700/80">
            {hasData
              ? "Read directly from GET /api/dashboard/summary in your running backend."
              : "Your workspace has no customers yet, so the preview shows the layout without invented numbers."}
          </p>
        </div>
        {!hasData && !loading ? (
          <Button size="sm" variant="secondary" loading={demoLoading} onClick={onLoadDemo}>
            Load synthetic demo data
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total customers", value: summary ? formatNumber(summary.total_customers) : "—" },
          { label: "At-risk customers", value: summary ? formatNumber(summary.at_risk_customers) : "—" },
          { label: "Observed churn rate", value: summary ? formatPercent(summary.observed_churn_rate) : "—" },
          {
            label: "Revenue at risk (monthly est.)",
            value: summary ? formatCompactCurrency(summary.total_revenue_at_risk, currency) : "—",
          },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl bg-sand-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700/60">{metric.label}</p>
            {loading ? <Skeleton className="mt-3 h-7 w-24" /> : <p className="mt-2 font-display text-2xl">{metric.value}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 border-t border-sand-200 p-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-ink-900">Estimated revenue at risk by segment</p>
          <ul className="mt-4 space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </>
            ) : topSegments.length > 0 ? (
              topSegments.map((segment) => (
                <li key={segment.segment}>
                  <div className="flex items-center justify-between text-xs text-ink-700">
                    <span className="truncate">{segment.label}</span>
                    <span className="tabular-nums">{formatCompactCurrency(segment.revenue_at_risk, currency)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                    <div
                      className="h-full rounded-full bg-ink-900"
                      style={{ width: `${(segment.revenue_at_risk / maxRisk) * 100}%` }}
                    />
                  </div>
                </li>
              ))
            ) : (
              <li className="rounded-2xl bg-sand-50 p-4 text-xs leading-5 text-ink-700/75">
                Segment exposure appears here once customers are scored.
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">Risk distribution</p>
          <ul className="mt-4 space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </>
            ) : (summary?.risk_distribution.length ?? 0) > 0 ? (
              summary?.risk_distribution.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-3 rounded-2xl bg-sand-50 px-3 py-2">
                  <RiskBadge level={item.key === "unscored" ? null : (item.key as "low")} showSteps={false} />
                  <span className="text-xs tabular-nums text-ink-700">
                    {formatNumber(item.count)} · {formatPercent(item.share)}
                  </span>
                </li>
              ))
            ) : (
              <li className="rounded-2xl bg-sand-50 p-4 text-xs leading-5 text-ink-700/75">
                Risk bands appear here after the first prediction run.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
