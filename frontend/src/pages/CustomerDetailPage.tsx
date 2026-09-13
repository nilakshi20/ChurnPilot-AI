import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, LifeBuoy, MousePointerClick, Wallet } from "lucide-react";

import { MessageComposer, type ComposerTarget } from "@/components/retention/MessageComposer";
import { RetentionPanel } from "@/components/retention/RetentionPanel";
import { RiskFactorList } from "@/components/RiskFactorList";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, KeyValue } from "@/components/ui/Card";
import { PriorityBadge, RiskBadge } from "@/components/ui/RiskIndicator";
import { PageHeading } from "@/components/ui/SectionHeading";
import { ProgressBar } from "@/components/ui/StatCard";
import { EmptyState, ErrorState, Skeleton, SkeletonText } from "@/components/ui/States";
import { Tooltip } from "@/components/ui/Tooltip";
import { useCurrency } from "@/contexts/SettingsContext";
import { useCustomer, usePrediction, useRetentionHistory, useRiskFactors } from "@/hooks/useChurnpilot";
import type { MessageChannel } from "@/types/api";
import {
  customerName,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeDays,
  titleCase,
} from "@/utils/format";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currency = useCurrency();
  const customer = useCustomer(id);
  const prediction = usePrediction(id);
  const riskFactors = useRiskFactors(id);
  const retention = useRetentionHistory(id);
  const [composer, setComposer] = useState<ComposerTarget | null>(null);

  if (customer.loading && !customer.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (customer.error || !customer.data) {
    const notFound = customer.error?.code === "CUSTOMER_NOT_FOUND";
    return (
      <div className="space-y-6">
        <BackLink />
        {notFound ? (
          <EmptyState
            title="Customer not found"
            message="This customer no longer exists in the workspace. Reloading demo data replaces every customer record, which invalidates old links."
            action={
              <Link to="/customers" className="text-sm font-medium text-moss-600 underline-offset-2 hover:underline">
                Back to customers
              </Link>
            }
          />
        ) : (
          <ErrorState
            message={customer.error?.message ?? "The customer could not be loaded."}
            code={customer.error?.code}
            onRetry={customer.reload}
          />
        )}
      </div>
    );
  }

  const data = customer.data;
  const name = customerName(data);
  const probability = prediction.data?.churn_probability ?? data.churn_probability;
  const riskLevel = prediction.data?.risk_level ?? data.risk_level;

  return (
    <div className="space-y-6">
      <BackLink />
      <PageHeading
        title={name}
        description={`${data.email}${data.company ? ` · ${data.company}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{data.segment_label}</Badge>
            {data.is_high_value ? <Badge tone="warning">High value</Badge> : null}
            <Badge tone={data.status === "churned" ? "danger" : data.status === "active" ? "success" : "neutral"}>
              {titleCase(data.status)}
            </Badge>
            <RiskBadge level={riskLevel} />
            {probability !== null && probability !== undefined ? (
              <Badge tone="neutral">{formatPercent(probability)} churn probability</Badge>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile" description="Stored customer record from PostgreSQL." />
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <KeyValue label="Name" value={name} />
            <KeyValue label="Company" value={data.company ?? "—"} />
            <KeyValue label="Email" value={data.email} />
            <KeyValue label="Segment" value={data.segment_label} />
            <KeyValue
              label="Tenure"
              value={`${formatNumber(data.tenure_months, 1)} months`}
              hint={data.signup_date ? `Signed up ${formatDate(data.signup_date)}` : undefined}
            />
            <KeyValue label="Plan" value={data.plan ? titleCase(data.plan) : "—"} hint={data.billing_interval ?? undefined} />
            <KeyValue label="Country" value={data.country ?? "—"} />
            <KeyValue label="Status" value={titleCase(data.status)} />
            <KeyValue label="Last seen" value={formatDate(data.last_seen_at)} />
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Prediction"
            description="Latest stored model output for this customer."
            actions={
              prediction.data?.model_version ? (
                <Badge tone="info">{prediction.data.model_version}</Badge>
              ) : null
            }
          />
          {prediction.error ? (
            <ErrorState
              className="mt-5"
              message={
                prediction.error.code === "PREDICTION_NOT_FOUND"
                  ? "This customer has not been scored yet. Run predictions from the dashboard to score the whole base."
                  : prediction.error.message
              }
              code={prediction.error.code}
              onRetry={prediction.reload}
            />
          ) : prediction.loading ? (
            <SkeletonText className="mt-5" lines={4} />
          ) : prediction.data ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">Churn probability</p>
                <p className="mt-1 font-display text-4xl text-ink-900">{formatPercent(prediction.data.churn_probability)}</p>
                <ProgressBar className="mt-3" value={prediction.data.churn_probability} label="Churn probability" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={prediction.data.risk_level} />
                <PriorityBadge level={prediction.data.priority_level} />
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <KeyValue label="Priority score" value={prediction.data.priority_score.toFixed(3)} />
                <KeyValue label="Model" value={`${prediction.data.model_name}`} hint={prediction.data.model_version} />
                <KeyValue label="Scored at" value={formatDate(prediction.data.predicted_at)} />
                <KeyValue
                  label="Revenue at risk (monthly est.)"
                  value={formatCurrency(prediction.data.revenue_at_risk, currency)}
                  hint="Monthly spend × churn probability"
                />
              </dl>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader title="Financial" />
          <dl className="mt-5 space-y-4">
            <KeyValue label="Monthly spend" value={formatCurrency(data.monthly_spend, currency)} />
            <KeyValue label="Total orders" value={formatNumber(data.total_orders)} />
            <KeyValue label="Average order value" value={formatCurrency(data.average_order_value, currency, 2)} />
            <KeyValue label="Purchase frequency" value={`${formatNumber(data.purchase_frequency, 2)} / month`} />
          </dl>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-ink-700/60">
            <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
            Derived from completed transactions
          </span>
        </Card>

        <Card>
          <CardHeader title="Engagement" />
          <dl className="mt-5 space-y-4">
            <KeyValue label="Last activity" value={formatRelativeDays(data.days_since_last_order)} hint={formatDate(data.last_seen_at)} />
            <KeyValue label="Login frequency" value={`${formatNumber(data.login_frequency, 2)} / month`} />
            <KeyValue label="Email engagement" value={`${formatNumber(data.email_engagement, 2)} / month`} />
            <KeyValue label="Discount usage" value={formatNumber(data.discount_usage)} />
          </dl>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-ink-700/60">
            <MousePointerClick aria-hidden="true" className="h-3.5 w-3.5" />
            Derived from customer activity events
          </span>
        </Card>

        <Card>
          <CardHeader title="Support" />
          <dl className="mt-5 space-y-4">
            <KeyValue label="Support tickets" value={formatNumber(data.support_tickets)} />
            <KeyValue label="Complaints" value={formatNumber(data.complaint_count)} />
            <KeyValue label="Payment failures" value={formatNumber(data.payment_failures)} />
          </dl>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-ink-700/60">
            <LifeBuoy aria-hidden="true" className="h-3.5 w-3.5" />
            Derived from support events
          </span>
        </Card>

        <Card>
          <CardHeader
            title="Revenue exposure"
            description="Estimate only. It is not a confirmed loss."
          />
          <dl className="mt-5 space-y-4">
            <KeyValue
              label="Monthly revenue at risk"
              value={
                data.revenue_at_risk === null ? "—" : formatCurrency(data.revenue_at_risk, currency)
              }
              hint="Monthly spend × churn probability"
            />
            <KeyValue
              label="Annualized estimate"
              value={data.revenue_at_risk === null ? "—" : formatCurrency(data.revenue_at_risk * 12, currency)}
            />
            <KeyValue
              label="Retention opportunity"
              value={data.retention_opportunity === null ? "—" : data.retention_opportunity.toFixed(3)}
              hint="Higher means more recoverable value"
            />
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={riskFactors.data?.headline ?? "Factors contributing to this model prediction"}
            description="Model contribution values from SHAP where available, otherwise the model's own feature contributions."
            actions={<Tooltip content="Contributions describe how each feature moved this prediction relative to the average customer. They are not proof of cause." />}
          />
          {riskFactors.error ? (
            <ErrorState
              className="mt-5"
              message={
                riskFactors.error.code === "PREDICTION_NOT_FOUND"
                  ? "Risk factors appear once this customer has a stored prediction."
                  : riskFactors.error.message
              }
              code={riskFactors.error.code}
              onRetry={riskFactors.reload}
            />
          ) : riskFactors.loading ? (
            <SkeletonText className="mt-5" lines={6} />
          ) : riskFactors.data ? (
            <div className="mt-5 space-y-4">
              <RiskFactorList factors={riskFactors.data.factors} />
              <p className="rounded-2xl bg-sand-50 px-4 py-3 text-[11px] leading-5 text-ink-700/75">
                {riskFactors.data.disclaimer}
              </p>
            </div>
          ) : null}
        </Card>

        <RetentionPanel
          customerId={data.id}
          customerName={name}
          records={retention.data?.items ?? []}
          loading={retention.loading}
          error={retention.error}
          onReload={retention.reload}
          onCompose={(channel: MessageChannel) =>
            setComposer({ customerId: data.id, customerName: name, channel })
          }
        />
      </div>

      <Card>
        <CardHeader
          title="Model feature inputs"
          description="The exact feature vector the model received for this customer."
        />
        <dl className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(data.features ?? {}).map(([feature, value]) => (
            <div key={feature} className="rounded-2xl bg-sand-50 p-4">
              <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-700/60">{titleCase(feature)}</dt>
              <dd className="mt-1 font-medium tabular-nums text-ink-900">{formatNumber(value, 2)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <MessageComposer target={composer} onClose={() => setComposer(null)} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/customers"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 transition hover:text-ink-900"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      All customers
    </Link>
  );
}
