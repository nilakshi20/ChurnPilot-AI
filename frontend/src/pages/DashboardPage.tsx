import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  HeartHandshake,
  Percent,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";

import { BandChart } from "@/charts/BandChart";
import { ChurnBySegmentChart } from "@/charts/ChurnBySegmentChart";
import { ChurnTrendChart } from "@/charts/ChurnTrendChart";
import { RevenueAtRiskChart } from "@/charts/RevenueAtRiskChart";
import { RiskDistributionChart } from "@/charts/RiskDistributionChart";
import { SegmentDistributionChart } from "@/charts/SegmentDistributionChart";
import { DemoDataButton } from "@/components/DemoDataButton";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeading } from "@/components/ui/SectionHeading";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState, ErrorState, LoadingCards, Skeleton } from "@/components/ui/States";
import { useCurrency } from "@/contexts/SettingsContext";
import { useChurnAnalytics, useDashboardSummary, usePredictionRunner } from "@/hooks/useChurnpilot";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

export function DashboardPage() {
  const currency = useCurrency();
  const summary = useDashboardSummary();
  const analytics = useChurnAnalytics();
  const { runPredictions, loading: scoring } = usePredictionRunner();

  if (summary.loading && !summary.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <LoadingCards count={6} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (summary.error || !summary.data) {
    return (
      <div className="space-y-6">
        <PageHeading title="Dashboard" description="Portfolio-level churn risk and revenue exposure." />
        <ErrorState
          title="Dashboard data unavailable"
          message={summary.error?.message ?? "The dashboard summary could not be loaded."}
          code={summary.error?.code}
          onRetry={summary.reload}
        />
      </div>
    );
  }

  const data = summary.data;

  if (data.total_customers === 0) {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Dashboard"
          description="Portfolio-level churn risk and revenue exposure, calculated by the FastAPI backend."
        />
        <EmptyState
          title="No customers in this workspace yet"
          message="Load the synthetic demo dataset to explore the full product, or upload your own customer CSV from the Upload Data page."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <DemoDataButton />
              <LinkButton to="/upload" variant="secondary">
                Upload a CSV
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  const unscored = data.total_customers - data.scored_customers;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        description="Every figure below is calculated by the FastAPI backend from the customers, transactions, activity and support records in PostgreSQL."
        actions={
          <>
            <Button variant="secondary" loading={scoring} onClick={() => void runPredictions().catch(() => undefined)}>
              Re-run predictions
            </Button>
            <DemoDataButton />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {data.model?.version ? (
          <Badge tone="info">
            Model {data.model.name} · {data.model.version}
          </Badge>
        ) : (
          <Badge tone="warning">No trained model found</Badge>
        )}
        <Badge tone="neutral">{formatNumber(data.scored_customers)} customers scored</Badge>
        {unscored > 0 ? <Badge tone="warning">{formatNumber(unscored)} without a stored prediction</Badge> : null}
        {data.model?.metrics?.roc_auc ? (
          <Badge tone="neutral">Test ROC-AUC {data.model.metrics.roc_auc.toFixed(3)}</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total customers"
          value={formatNumber(data.total_customers)}
          hint={`${formatNumber(data.active_customers)} active · ${formatNumber(data.churned_customers)} churned`}
          icon={Users}
        />
        <StatCard
          label="At-risk customers"
          value={formatNumber(data.at_risk_customers)}
          hint="Medium, high or critical model risk"
          icon={AlertTriangle}
          tooltip="Customers whose churn probability is 0.25 or above."
        />
        <StatCard
          label="High-risk customers"
          value={formatNumber(data.predicted_high_risk_customers)}
          hint="High or critical model risk"
          icon={ShieldAlert}
          tooltip="Customers whose churn probability is 0.50 or above."
        />
        <StatCard
          label="Observed churn rate"
          value={formatPercent(data.observed_churn_rate)}
          hint={`${formatNumber(data.churned_customers)} of ${formatNumber(data.total_customers)} customers are marked churned`}
          icon={Percent}
        />
        <StatCard
          label="Revenue at risk (monthly est.)"
          value={formatCurrency(data.total_revenue_at_risk, currency)}
          hint={`Annualized estimate ${formatCurrency(data.annualized_revenue_at_risk, currency)}`}
          icon={Wallet}
          emphasis
          tooltip="Sum of monthly spend × churn probability across all customers. An estimate, not a confirmed loss."
        />
        <StatCard
          label="Retention opportunity"
          value={formatCurrency(data.retention_opportunity_value, currency)}
          hint={`${formatNumber(data.retention_opportunity_customers)} customers ranked high or urgent priority`}
          icon={HeartHandshake}
          tooltip="Estimated monthly revenue at risk concentrated in the customers with the highest retention priority scores."
          footer={
            <Link
              to="/retention"
              className="inline-flex items-center gap-1 text-xs font-medium text-moss-600 underline-offset-2 hover:underline"
            >
              Open retention queue
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        />
      </div>

      <p className="rounded-2xl bg-sand-100/70 px-4 py-3 text-xs leading-5 text-ink-700/80">{data.estimates_label}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChurnTrendChart points={data.churn_trend} />
        <RiskDistributionChart distribution={data.risk_distribution} />
        <RevenueAtRiskChart segments={data.revenue_at_risk_by_segment} currency={currency} />
        <SegmentDistributionChart
          distribution={data.segment_distribution}
          segments={data.revenue_at_risk_by_segment}
        />
        <div className="lg:col-span-2">
          <ChurnBySegmentChart segments={data.revenue_at_risk_by_segment} />
        </div>
      </div>

      {analytics.error ? (
        <ErrorState
          title="Tenure breakdown unavailable"
          message={analytics.error.message}
          code={analytics.error.code}
          onRetry={analytics.reload}
        />
      ) : analytics.data ? (
        <BandChart
          title="Churn by tenure"
          description="Observed churn and average model probability across tenure bands."
          info="Tenure is measured in months between the signup date and today."
          rows={analytics.data.churn_by_tenure}
        />
      ) : null}

      <Card>
        <CardHeader
          title="Model evaluation"
          description="Metrics are produced by a real train/test evaluation during training and read back from the saved model bundle."
          actions={
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 text-xs font-medium text-moss-600 underline-offset-2 hover:underline"
            >
              Model details
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {data.model?.metrics ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["accuracy", "Accuracy"],
                ["precision", "Precision"],
                ["recall", "Recall"],
                ["f1", "F1"],
                ["roc_auc", "ROC-AUC"],
                ["sample_count", "Samples"],
              ] as const
            ).map(([key, label]) => {
              const value = data.model?.metrics?.[key];
              return (
                <div key={key} className="rounded-2xl bg-sand-50 p-4">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">{label}</dt>
                  <dd className="mt-1 font-display text-xl text-ink-900">
                    {value === null || value === undefined
                      ? "—"
                      : key === "sample_count"
                        ? formatNumber(value)
                        : value.toFixed(3)}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-ink-700/80">
            No model bundle is present yet. Load demo data or run a prediction job to train and evaluate a model.
          </p>
        )}
      </Card>
    </div>
  );
}
