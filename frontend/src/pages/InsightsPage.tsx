import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Calculator, Sparkles } from "lucide-react";

import { BandChart } from "@/charts/BandChart";
import { ChurnBySegmentChart } from "@/charts/ChurnBySegmentChart";
import { RevenueAtRiskChart } from "@/charts/RevenueAtRiskChart";
import { DemoDataButton } from "@/components/DemoDataButton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PriorityBadge, RiskBadge } from "@/components/ui/RiskIndicator";
import { PageHeading } from "@/components/ui/SectionHeading";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableShell, Td, Th, Tr } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadingCards, SkeletonText } from "@/components/ui/States";
import { useCurrency } from "@/contexts/SettingsContext";
import { useChurnAnalytics, useInsights, useRevenueRisk } from "@/hooks/useChurnpilot";
import type { InsightItem } from "@/types/api";
import { formatCurrency, formatNumber, formatPercent, titleCase } from "@/utils/format";

export function InsightsPage() {
  const currency = useCurrency();
  const analytics = useChurnAnalytics();
  const revenue = useRevenueRisk();
  const insights = useInsights();

  const calculated = (insights.data?.items ?? []).filter((item) => item.source === "calculated");
  const aiGenerated = (insights.data?.items ?? []).filter((item) => item.source === "gemini");

  if (analytics.error && revenue.error) {
    return (
      <div className="space-y-6">
        <PageHeading title="Insights" description="Calculated analytics and AI commentary." />
        <ErrorState message={analytics.error.message} code={analytics.error.code} onRetry={analytics.reload} />
      </div>
    );
  }

  const hasData = (analytics.data?.churn_by_segment.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Insights"
        description="Calculated analytics come straight from the database and the model. AI commentary is generated separately and clearly marked."
        actions={<DemoDataButton variant="secondary" />}
      />

      {analytics.loading && !analytics.data ? (
        <LoadingCards count={3} />
      ) : !hasData ? (
        <EmptyState
          title="No analytics available yet"
          message="Insights are derived from scored customers. Load demo data or upload a CSV and run predictions."
          action={<DemoDataButton />}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Observed churn rate"
              value={formatPercent(analytics.data?.observed_churn_rate)}
              hint="Share of customers currently marked churned"
              icon={Calculator}
            />
            <StatCard
              label="Average model probability"
              value={formatPercent(analytics.data?.predicted_average_probability)}
              hint="Mean churn probability across scored customers"
              icon={Calculator}
            />
            <StatCard
              label="Revenue at risk (monthly est.)"
              value={formatCurrency(revenue.data?.total_revenue_at_risk ?? null, currency)}
              hint={
                revenue.data
                  ? `Annualized ${formatCurrency(revenue.data.annualized_revenue_at_risk, currency)}`
                  : undefined
              }
              icon={Calculator}
              emphasis
            />
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl text-ink-900">Calculated analytics</h2>
              <Badge tone="success">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Computed by the backend
              </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChurnBySegmentChart segments={analytics.data?.churn_by_segment ?? []} />
              <BandChart
                title="Churn by tenure"
                description="Observed churn and average model probability by tenure band."
                info="Tenure bands are fixed windows measured in months since signup."
                rows={analytics.data?.churn_by_tenure ?? []}
              />
              <BandChart
                title="Churn by spending"
                description="Observed churn and average model probability by monthly spend quartile."
                info="Quartile boundaries are recomputed from the current customer base on every request."
                rows={analytics.data?.churn_by_spend ?? []}
              />
              <BandChart
                title="Engagement vs churn"
                description="Churn against monthly login frequency."
                info="Login frequency is the number of login events per month of tenure."
                rows={analytics.data?.engagement_vs_churn ?? []}
              />
              <BandChart
                title="Support issues vs churn"
                description="Churn against the number of support tickets raised."
                info="Support ticket volume counts all support events recorded for the customer."
                rows={analytics.data?.support_vs_churn ?? []}
              />
              <RevenueAtRiskChart segments={revenue.data?.by_segment ?? []} currency={currency} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Revenue at risk by risk band"
                  description="Estimated monthly exposure grouped by model risk level."
                />
                <ul className="mt-5 space-y-2">
                  {(revenue.data?.by_risk_category ?? []).map((row) => (
                    <li
                      key={row.risk_level}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand-50 px-4 py-3"
                    >
                      <RiskBadge level={row.risk_level === "unscored" ? null : (row.risk_level as "low")} />
                      <span className="text-sm tabular-nums text-ink-800">
                        {formatNumber(row.customer_count)} customers ·{" "}
                        {formatCurrency(row.revenue_at_risk, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] leading-5 text-ink-700/65">{revenue.data?.estimates_label}</p>
              </Card>

              <Card className="p-0">
                <div className="p-6">
                  <CardHeader
                    title="Retention opportunities"
                    description="Highest-priority customers where retention effort protects the most estimated revenue."
                    actions={
                      <Link
                        to="/retention"
                        className="inline-flex items-center gap-1 text-xs font-medium text-moss-600 underline-offset-2 hover:underline"
                      >
                        Full queue
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    }
                  />
                </div>
                <TableShell className="rounded-t-none shadow-none ring-0">
                  <Table caption="Top retention opportunities">
                    <thead>
                      <tr>
                        <Th>Customer</Th>
                        <Th className="text-right">Revenue at risk (est.)</Th>
                        <Th className="text-right">Priority</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {(revenue.data?.retention_opportunities ?? []).slice(0, 8).map((row) => (
                        <Tr key={row.customer_id}>
                          <Td>
                            <Link
                              to={`/customers/${row.customer_id}`}
                              className="font-medium text-ink-900 underline-offset-2 hover:underline"
                            >
                              {row.name ?? "Unnamed customer"}
                            </Link>
                            <span className="block text-xs text-ink-700/70">{row.segment_label}</span>
                          </Td>
                          <Td className="text-right tabular-nums">{formatCurrency(row.revenue_at_risk, currency)}</Td>
                          <Td className="text-right">
                            <PriorityBadge level={row.priority_level} />
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableShell>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {calculated.map((item) => (
                <InsightCard key={item.title} item={item} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl text-ink-900">AI-generated recommendations</h2>
              <Badge tone="ai">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Generated by Gemini
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-ink-700/80">
              Gemini receives only the calculated metrics shown above — never raw customer records — and returns commentary.
              Treat these as suggestions to validate, not as measured facts.
            </p>

            {insights.error ? (
              <ErrorState message={insights.error.message} code={insights.error.code} onRetry={insights.reload} />
            ) : insights.loading && !insights.data ? (
              <Card>
                <SkeletonText lines={5} />
              </Card>
            ) : aiGenerated.length === 0 ? (
              <Card>
                <p className="text-sm leading-6 text-ink-700/80">
                  No AI commentary is available. This happens when <code className="text-xs">GEMINI_API_KEY</code> is not
                  configured or the model response failed validation — the calculated analytics above are unaffected.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {aiGenerated.map((item) => (
                  <InsightCard key={item.title} item={item} />
                ))}
              </div>
            )}
          </section>

          {insights.data ? (
            <Card>
              <CardHeader
                title="Metrics sent to the AI model"
                description="The exact validated payload the backend passed to Gemini for the commentary above."
              />
              <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-ink-950 p-4 text-[11px] leading-5 text-sand-100">
                {JSON.stringify(insights.data.metrics_used, null, 2)}
              </pre>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  const isAi = item.source === "gemini";
  return (
    <article
      className={`rounded-3xl bg-white p-5 shadow-panel ring-1 ${isAi ? "ring-violet-200" : "ring-sand-200"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-ink-900">{item.title}</h3>
        <Badge tone={isAi ? "ai" : "success"}>
          {isAi ? (
            <>
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              AI suggestion
            </>
          ) : (
            <>
              <BadgeCheck aria-hidden="true" className="h-3 w-3" />
              Calculated
            </>
          )}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-700">{item.body}</p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-700/65">
        <Badge tone={item.severity === "high" ? "danger" : item.severity === "medium" ? "warning" : "neutral"}>
          {titleCase(item.severity)} severity
        </Badge>
        <span>Metric: {titleCase(item.metric_name)}</span>
        {item.metric_value !== null ? <span className="tabular-nums">Value: {item.metric_value}</span> : null}
      </p>
    </article>
  );
}
