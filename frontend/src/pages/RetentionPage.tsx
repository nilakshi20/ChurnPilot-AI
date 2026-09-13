import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ListChecks, Sparkles } from "lucide-react";

import { MessageComposer, type ComposerTarget } from "@/components/retention/MessageComposer";
import { RetentionPanel } from "@/components/retention/RetentionPanel";
import { DemoDataButton } from "@/components/DemoDataButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PriorityBadge, RiskBadge } from "@/components/ui/RiskIndicator";
import { PageHeading } from "@/components/ui/SectionHeading";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableShell, Td, Th, Tr } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadingTable } from "@/components/ui/States";
import { useCurrency, useSettings } from "@/contexts/SettingsContext";
import { useRetentionHistory, useRevenueRisk } from "@/hooks/useChurnpilot";
import type { MessageChannel, RetentionOpportunityRow } from "@/types/api";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

const WORKFLOW_STEPS = [
  "Select a customer from the queue",
  "Generate the retention recommendation",
  "Generate a channel draft",
  "Review and edit the wording",
  "Approve the draft",
  "Copy or export it into your own tooling",
];

export function RetentionPage() {
  const currency = useCurrency();
  const { preferences } = useSettings();
  const { data, loading, error, reload } = useRevenueRisk();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerTarget | null>(null);

  const queue = useMemo(() => {
    const rows = data?.retention_opportunities ?? [];
    const filtered = rows.filter((row) => row.monthly_spend >= preferences.minimumMonthlySpend);
    if (preferences.retentionFocus === "revenue") {
      return [...filtered].sort((a, b) => b.revenue_at_risk - a.revenue_at_risk);
    }
    if (preferences.retentionFocus === "probability") {
      return [...filtered].sort((a, b) => b.churn_probability - a.churn_probability);
    }
    return filtered;
  }, [data, preferences.minimumMonthlySpend, preferences.retentionFocus]);

  const selected = queue.find((row) => row.customer_id === selectedId) ?? null;
  const retention = useRetentionHistory(selected?.customer_id);

  const totals = useMemo(
    () => ({
      customers: queue.length,
      revenue: queue.reduce((sum, row) => sum + row.revenue_at_risk, 0),
      monthly: queue.reduce((sum, row) => sum + row.monthly_spend, 0),
    }),
    [queue],
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Retention"
        description="A ranked queue of customers to save first, ordered by the backend priority score. Nothing here contacts a customer; every output is a reviewable draft."
        actions={<DemoDataButton variant="secondary" />}
      />

      {error ? (
        <ErrorState message={error.message} code={error.code} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingTable rows={8} columns={6} />
      ) : queue.length === 0 ? (
        <EmptyState
          title="No customers in the retention queue"
          message="The queue lists scored, non-churned customers ranked by priority. Load demo data or run predictions to populate it."
          action={<DemoDataButton />}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Customers in queue" value={formatNumber(totals.customers)} icon={ListChecks} />
            <StatCard
              label="Monthly revenue at risk (est.)"
              value={formatCurrency(totals.revenue, currency)}
              hint="Sum across the queue"
              emphasis
            />
            <StatCard
              label="Monthly revenue represented"
              value={formatCurrency(totals.monthly, currency)}
              hint="Combined monthly spend of queued customers"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              <Card className="p-5">
                <CardHeader
                  title="Customers to Save First"
                  description={`Ranked by ${
                    preferences.retentionFocus === "revenue"
                      ? "estimated revenue at risk"
                      : preferences.retentionFocus === "probability"
                        ? "churn probability"
                        : "the combined retention priority score"
                  }. Adjust the ranking preference in Settings.`}
                />
              </Card>
              <TableShell>
                <Table caption="Retention queue ranked by priority">
                  <thead>
                    <tr>
                      <Th>Customer</Th>
                      <Th className="text-right">Churn probability</Th>
                      <Th>Risk</Th>
                      <Th className="text-right">Monthly value</Th>
                      <Th className="text-right">Revenue at risk (est.)</Th>
                      <Th className="text-right">Priority</Th>
                      <Th>Recommended strategy</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((row) => (
                      <Tr
                        key={row.customer_id}
                        ariaLabel={`Select ${row.name ?? "customer"}`}
                        onClick={() => setSelectedId(row.customer_id)}
                        className={row.customer_id === selectedId ? "bg-sand-50" : undefined}
                      >
                        <Td>
                          <span className="block truncate font-medium text-ink-900">{row.name ?? "Unnamed customer"}</span>
                          <span className="block truncate text-xs text-ink-700/70">
                            {row.company ?? row.segment_label}
                          </span>
                        </Td>
                        <Td className="text-right tabular-nums">{formatPercent(row.churn_probability)}</Td>
                        <Td>
                          <RiskBadge level={row.risk_level} showSteps={false} />
                        </Td>
                        <Td className="text-right tabular-nums">{formatCurrency(row.monthly_spend, currency)}</Td>
                        <Td className="text-right tabular-nums">{formatCurrency(row.revenue_at_risk, currency)}</Td>
                        <Td className="text-right">
                          <span className="flex flex-col items-end gap-1">
                            <span className="tabular-nums font-medium">{row.priority_score.toFixed(3)}</span>
                            <PriorityBadge level={row.priority_level} />
                          </span>
                        </Td>
                        <Td>
                          <RecommendedStrategy row={row} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableShell>
              <p className="text-[11px] leading-5 text-ink-700/65">{data?.estimates_label}</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader title="Workflow" description="Each step is explicit, and the last step stays with a human." />
                <ol className="mt-4 space-y-2">
                  {WORKFLOW_STEPS.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-ink-800">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand-100 text-[11px] font-semibold text-ink-900">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-900">
                  This MVP never sends email, WhatsApp or SMS. Approved drafts are copied or exported for your own sending
                  tools.
                </p>
              </Card>

              {selected ? (
                <>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.14em] text-ink-700/60">Selected customer</p>
                        <p className="mt-1 truncate font-display text-xl text-ink-900">
                          {selected.name ?? "Unnamed customer"}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-700/75">
                          <Badge tone="neutral">{selected.segment_label}</Badge>
                          {formatPercent(selected.churn_probability)} churn probability
                        </p>
                      </div>
                      <Link
                        to={`/customers/${selected.customer_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-moss-600 underline-offset-2 hover:underline"
                      >
                        Full profile
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Card>
                  <RetentionPanel
                    customerId={selected.customer_id}
                    customerName={selected.name ?? "this customer"}
                    records={retention.data?.items ?? []}
                    loading={retention.loading}
                    error={retention.error}
                    onReload={retention.reload}
                    onCompose={(channel: MessageChannel) =>
                      setComposer({
                        customerId: selected.customer_id,
                        customerName: selected.name ?? "this customer",
                        channel,
                      })
                    }
                  />
                </>
              ) : (
                <Card>
                  <CardHeader title="No customer selected" />
                  <p className="mt-3 text-sm leading-6 text-ink-700/80">
                    Choose a customer from the queue to generate a retention recommendation and outreach drafts.
                  </p>
                  <Button className="mt-4" variant="secondary" onClick={() => setSelectedId(queue[0]?.customer_id ?? null)}>
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                    Start with the top-priority customer
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      <MessageComposer target={composer} onClose={() => setComposer(null)} />
    </div>
  );
}

/**
 * The queue is priority-ranked before any Gemini call is made, so the strategy hint is
 * derived from the same signals the backend uses. Generating a recommendation replaces it
 * with the real backend output.
 */
function RecommendedStrategy({ row }: { row: RetentionOpportunityRow }) {
  const label =
    row.risk_level === "critical" && row.priority_level === "urgent"
      ? "Executive save play"
      : row.segment === "support_frustrated"
        ? "Resolve support friction"
        : row.segment === "inactive_customers"
          ? "Win-back outreach"
          : row.segment === "high_value_high_risk"
            ? "High-touch account review"
            : row.segment === "new_customers"
              ? "Onboarding and education"
              : "Value reinforcement";
  return (
    <span className="flex flex-col gap-1">
      <span className="text-sm text-ink-900">{label}</span>
      <span className="text-[11px] text-ink-700/65">Generate to get the backend recommendation</span>
    </span>
  );
}
