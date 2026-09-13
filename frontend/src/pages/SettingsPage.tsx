import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, KeyValue } from "@/components/ui/Card";
import { Field, Input, Select, Toggle } from "@/components/ui/Field";
import { RiskBadge } from "@/components/ui/RiskIndicator";
import { PageHeading } from "@/components/ui/SectionHeading";
import { ErrorState, SkeletonText } from "@/components/ui/States";
import { DEFAULT_PREFERENCES, useSettings, type WorkspacePreferences } from "@/contexts/SettingsContext";
import { useToast } from "@/contexts/ToastContext";
import { usePlatformSettings } from "@/hooks/useChurnpilot";
import type { MessageTone } from "@/types/api";
import { formatDate, formatNumber, titleCase } from "@/utils/format";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD"];
const TONES: MessageTone[] = ["professional", "friendly", "concise", "premium"];
const FOCUS_OPTIONS: Array<{ value: WorkspacePreferences["retentionFocus"]; label: string; hint: string }> = [
  { value: "balanced", label: "Balanced priority score", hint: "Use the backend priority score as-is." },
  { value: "revenue", label: "Revenue at risk first", hint: "Re-sort the retention queue by estimated revenue at risk." },
  { value: "probability", label: "Churn probability first", hint: "Re-sort the retention queue by churn probability." },
];

export function SettingsPage() {
  const { notify } = useToast();
  const { preferences, update, reset } = useSettings();
  const platform = usePlatformSettings();
  const [draft, setDraft] = useState<WorkspacePreferences>(preferences);

  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);
  const thresholds = platform.data?.risk_thresholds;

  const save = () => {
    update(draft);
    notify({ tone: "success", title: "Workspace preferences saved", description: "Stored locally in this browser." });
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description="Workspace preferences are stored in your browser and shape how ChurnPilot presents backend data. Model behaviour and risk thresholds are owned by the backend."
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                setDraft(DEFAULT_PREFERENCES);
                notify({ tone: "info", title: "Preferences reset to defaults" });
              }}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </Button>
            <Button disabled={!dirty} onClick={save}>
              <Save aria-hidden="true" className="h-4 w-4" />
              Save changes
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Business profile" description="Used for the workspace label and currency formatting." />
          <div className="mt-5 grid gap-4">
            <Field label="Business name">
              {({ id }) => (
                <Input
                  id={id}
                  value={draft.businessName}
                  onChange={(event) => setDraft({ ...draft, businessName: event.target.value })}
                />
              )}
            </Field>
            <Field label="Currency" hint="Applied to every monetary figure in the interface.">
              {({ id }) => (
                <Select
                  id={id}
                  value={draft.currency}
                  onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Communication defaults"
            description="Applied when a new draft is generated. You can still change the tone per draft."
          />
          <div className="mt-5 grid gap-4">
            <Field label="Default tone">
              {({ id }) => (
                <Select
                  id={id}
                  value={draft.defaultTone}
                  onChange={(event) => setDraft({ ...draft, defaultTone: event.target.value as MessageTone })}
                >
                  {(platform.data?.message_tones ?? TONES).map((tone) => (
                    <option key={tone} value={tone}>
                      {titleCase(tone)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Toggle
              label="Require approval before copying or exporting a draft"
              description="Keeps a deliberate human checkpoint between generation and use."
              checked={draft.requireApprovalBeforeExport}
              onChange={(value) => setDraft({ ...draft, requireApprovalBeforeExport: value })}
            />
            <p className="rounded-2xl bg-sand-50 px-4 py-3 text-xs leading-5 text-ink-700/80">
              Available channels: {(platform.data?.message_channels ?? ["email", "whatsapp", "sms", "sales_call"]).map(titleCase).join(", ")}.
              ChurnPilot never sends a message; it only produces drafts.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Retention preferences" description="Controls how the retention queue is ordered and filtered." />
          <div className="mt-5 grid gap-4">
            <Field label="Ranking preference" hint={FOCUS_OPTIONS.find((option) => option.value === draft.retentionFocus)?.hint}>
              {({ id }) => (
                <Select
                  id={id}
                  value={draft.retentionFocus}
                  onChange={(event) =>
                    setDraft({ ...draft, retentionFocus: event.target.value as WorkspacePreferences["retentionFocus"] })
                  }
                >
                  {FOCUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Minimum monthly spend for the queue" hint="Customers below this monthly spend are hidden from the retention queue.">
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step={10}
                  value={draft.minimumMonthlySpend}
                  onChange={(event) => setDraft({ ...draft, minimumMonthlySpend: Number(event.target.value) || 0 })}
                />
              )}
            </Field>
            <Toggle
              label="Exclude churned customers from the queue"
              description="The backend already omits churned customers from retention opportunities."
              checked={draft.excludeChurnedFromQueue}
              onChange={(value) => setDraft({ ...draft, excludeChurnedFromQueue: value })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Risk thresholds"
            description="Defined centrally in the backend so the API, the model and the interface always agree."
          />
          {platform.error ? (
            <ErrorState className="mt-5" message={platform.error.message} code={platform.error.code} onRetry={platform.reload} />
          ) : platform.loading ? (
            <SkeletonText className="mt-5" lines={4} />
          ) : (
            <ul className="mt-5 space-y-2">
              <ThresholdRow level="low" text={`Below ${thresholds?.low_max ?? 0.25}`} />
              <ThresholdRow level="medium" text={`${thresholds?.low_max ?? 0.25} to ${(thresholds?.medium_max ?? 0.5) - 0.01}`} />
              <ThresholdRow level="high" text={`${thresholds?.medium_max ?? 0.5} to ${(thresholds?.high_max ?? 0.75) - 0.01}`} />
              <ThresholdRow level="critical" text={`${thresholds?.high_max ?? 0.75} and above`} />
              <li className="rounded-2xl bg-sand-50 px-4 py-3 text-xs leading-5 text-ink-700/80">
                These bands are read-only in the MVP. Changing them means editing{" "}
                <code>backend/app/core/risk.py</code> and re-running predictions so stored risk levels stay consistent.
              </li>
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Model and platform"
          description="Read from the saved model bundle on the backend. Metrics come from a real train/test evaluation."
        />
        {platform.loading ? (
          <SkeletonText className="mt-5" lines={4} />
        ) : platform.data?.model ? (
          <>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KeyValue label="Model name" value={platform.data.model.name ?? "—"} />
              <KeyValue label="Model version" value={platform.data.model.version ?? "—"} />
              <KeyValue label="Trained at" value={formatDate(platform.data.model.trained_at)} />
              <KeyValue
                label="Training samples"
                value={
                  platform.data.model.metrics?.sample_count
                    ? formatNumber(platform.data.model.metrics.sample_count)
                    : "—"
                }
              />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {(["accuracy", "precision", "recall", "f1", "roc_auc"] as const).map((metric) => {
                const value = platform.data?.model?.metrics?.[metric];
                return (
                  <Badge key={metric} tone="neutral">
                    {titleCase(metric)}: {value === null || value === undefined ? "—" : value.toFixed(3)}
                  </Badge>
                );
              })}
            </div>
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">Priority score weights</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {Object.entries(platform.data.priority_weights).map(([key, weight]) => (
                  <li key={key}>
                    <Badge tone="neutral">
                      {titleCase(key)}: {weight}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">Model features</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {(platform.data.model.feature_names ?? []).map((feature) => (
                  <li key={feature}>
                    <Badge tone="neutral">{titleCase(feature)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-5 text-xs leading-5 text-ink-700/70">
              Demo datasets are generated with seed {platform.data.demo_seed} and{" "}
              {formatNumber(platform.data.demo_customer_count)} customers, so results are reproducible.
            </p>
          </>
        ) : (
          <p className="mt-5 text-sm leading-6 text-ink-700/80">
            No trained model bundle was found on the backend. Load demo data or run a prediction job to train one.
          </p>
        )}
      </Card>
    </div>
  );
}

function ThresholdRow({ level, text }: { level: "low" | "medium" | "high" | "critical"; text: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand-50 px-4 py-3">
      <RiskBadge level={level} />
      <span className="text-sm tabular-nums text-ink-800">Churn probability {text}</span>
    </li>
  );
}
