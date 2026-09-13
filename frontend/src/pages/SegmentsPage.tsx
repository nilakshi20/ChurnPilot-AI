import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";

import { RevenueAtRiskChart } from "@/charts/RevenueAtRiskChart";
import { DemoDataButton } from "@/components/DemoDataButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskIndicator";
import { PageHeading } from "@/components/ui/SectionHeading";
import { Table, TableShell, Td, Th, Tr } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadingCards } from "@/components/ui/States";
import { useCurrency } from "@/contexts/SettingsContext";
import { useCustomers, useSegments } from "@/hooks/useChurnpilot";
import { customerName, formatCurrency, formatNumber, formatPercent } from "@/utils/format";

const SEGMENT_NOTES: Record<string, string> = {
  high_value_high_risk: "Top-quintile spenders whose churn probability is 0.50 or above. Defend these first.",
  high_value_low_risk: "Top-quintile spenders with contained risk. Protect and expand.",
  low_value_high_risk: "Smaller accounts with high predicted risk. Best served with scalable outreach.",
  new_customers: "Less than three months of tenure. Onboarding quality decides retention here.",
  loyal_customers: "A year or more of tenure with contained risk and steady activity.",
  inactive_customers: "Churned, paused, or 60+ days without an order. Win-back territory.",
  support_frustrated: "Two or more complaints or four or more support tickets. Fix the experience before selling.",
  steady_customers: "Everyone else: mid-tenure customers with moderate spend and contained risk.",
};

export function SegmentsPage() {
  const navigate = useNavigate();
  const currency = useCurrency();
  const { data, loading, error, reload } = useSegments();
  const [active, setActive] = useState<string | null>(null);

  const activeSegment = data?.items.find((segment) => segment.segment === active) ?? null;
  const members = useCustomers(
    active ? { segment: active, page: 1, page_size: 10, sort_by: "priority_score", sort_dir: "desc" } : { page_size: 1 },
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Segments"
        description="Behavioural segments assigned by the backend from tenure, spend percentile, inactivity, support pressure and model risk. Each customer belongs to exactly one segment."
        actions={<DemoDataButton variant="secondary" />}
      />

      {error ? (
        <ErrorState message={error.message} code={error.code} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingCards count={6} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No segments to show"
          message="Segments are computed from the customers in your workspace. Load demo data or upload a CSV first."
          action={<DemoDataButton />}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.items.map((segment) => {
              const isActive = segment.segment === active;
              return (
                <button
                  key={segment.segment}
                  type="button"
                  onClick={() => setActive(isActive ? null : segment.segment)}
                  aria-pressed={isActive}
                  className={`flex flex-col items-start rounded-3xl bg-white p-5 text-left shadow-panel ring-1 transition hover:bg-sand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500 ${
                    isActive ? "ring-2 ring-ink-900" : "ring-sand-200"
                  }`}
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-ink-900">{segment.label}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-700/70">
                        <Users aria-hidden="true" className="h-3.5 w-3.5" />
                        {formatNumber(segment.customer_count)} customers
                      </span>
                    </span>
                    <RiskBadge
                      level={
                        (segment.average_churn_probability ?? 0) >= 0.75
                          ? "critical"
                          : (segment.average_churn_probability ?? 0) >= 0.5
                            ? "high"
                            : (segment.average_churn_probability ?? 0) >= 0.25
                              ? "medium"
                              : "low"
                      }
                      showSteps={false}
                    />
                  </span>
                  <dl className="mt-4 grid w-full gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-700/60">Avg churn probability</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                        {formatPercent(segment.average_churn_probability)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-700/60">Observed churn</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                        {formatPercent(segment.observed_churn_rate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-700/60">Monthly revenue</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                        {formatCurrency(segment.monthly_revenue, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-700/60">Revenue at risk (est.)</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                        {formatCurrency(segment.revenue_at_risk, currency)}
                      </dd>
                    </div>
                  </dl>
                  <span className="mt-4 text-xs leading-5 text-ink-700/75">{SEGMENT_NOTES[segment.segment] ?? ""}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-moss-600">
                    {isActive ? "Hide customers" : "View customers"}
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>

          <p className="rounded-2xl bg-sand-100/70 px-4 py-3 text-xs leading-5 text-ink-700/80">{data?.estimates_label}</p>

          {activeSegment ? (
            <Card className="p-0">
              <div className="p-6">
                <CardHeader
                  title={`${activeSegment.label} · top customers by priority`}
                  description={`${formatNumber(activeSegment.customer_count)} customers in this segment. Showing the ten highest retention priority scores.`}
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/customers?segment=${activeSegment.segment}`)}
                    >
                      Open in Customers
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
              {members.error ? (
                <div className="px-6 pb-6">
                  <ErrorState message={members.error.message} code={members.error.code} onRetry={members.reload} />
                </div>
              ) : (
                <TableShell className="rounded-t-none shadow-none ring-0">
                  <Table caption={`Customers in ${activeSegment.label}`}>
                    <thead>
                      <tr>
                        <Th>Customer</Th>
                        <Th className="text-right">Monthly spend</Th>
                        <Th className="text-right">Churn probability</Th>
                        <Th>Risk</Th>
                        <Th className="text-right">Revenue at risk (est.)</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.data?.items.map((customer) => (
                        <Tr
                          key={customer.id}
                          ariaLabel={`Open ${customerName(customer)}`}
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          <Td>
                            <span className="block truncate font-medium text-ink-900">{customerName(customer)}</span>
                            <span className="block truncate text-xs text-ink-700/70">
                              {customer.company ?? customer.email}
                            </span>
                          </Td>
                          <Td className="text-right tabular-nums">{formatCurrency(customer.monthly_spend, currency)}</Td>
                          <Td className="text-right tabular-nums">{formatPercent(customer.churn_probability)}</Td>
                          <Td>
                            <RiskBadge level={customer.risk_level} showSteps={false} />
                          </Td>
                          <Td className="text-right tabular-nums">
                            {formatCurrency(customer.revenue_at_risk ?? 0, currency)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableShell>
              )}
            </Card>
          ) : null}

          <RevenueAtRiskChart segments={data?.items ?? []} currency={currency} />

          <Card>
            <CardHeader title="How segments are assigned" description="Rules are evaluated in order; the first match wins." />
            <ol className="mt-4 space-y-2 text-sm text-ink-800">
              <li>1. Two or more complaints or four or more support tickets → Support-Frustrated</li>
              <li>2. Churned, paused, or 60+ days since the last order → Inactive</li>
              <li>3. Tenure under three months → New</li>
              <li>4. Top-quintile monthly spend → High Value, split by whether risk is high/critical or not</li>
              <li>5. High or critical risk on a smaller account → Low Value / High Risk</li>
              <li>6. Twelve or more months of tenure → Loyal</li>
              <li>7. Everything else → Steady</li>
            </ol>
            <p className="mt-4 flex flex-wrap gap-2">
              <Badge tone="neutral">Single-membership segments</Badge>
              <Badge tone="neutral">Recomputed on every request</Badge>
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
