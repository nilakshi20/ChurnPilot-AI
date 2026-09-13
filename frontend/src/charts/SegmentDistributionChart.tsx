import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartFrame, TOOLTIP_STYLE } from "@/charts/ChartFrame";
import { formatNumber, formatPercent } from "@/utils/format";
import type { CountMetric, SegmentRow } from "@/types/api";

const COLORS = ["#2f6148", "#3f7d5e", "#5d9b7c", "#d9a13b", "#dd7a3c", "#b5443a", "#7a6f5c", "#a89a83"];

export function SegmentDistributionChart({
  distribution,
  segments,
}: {
  distribution: CountMetric[] | undefined;
  segments: SegmentRow[] | undefined;
}) {
  const labels = new Map((segments ?? []).map((segment) => [segment.segment, segment.label]));
  const data = (distribution ?? []).map((item) => ({
    key: item.key,
    name: labels.get(item.key) ?? item.key,
    value: item.count,
    share: item.share,
  }));

  return (
    <ChartFrame
      title="Customer segment distribution"
      description="Share of customers in each behavioural segment."
      info="Segments are assigned by the backend from tenure, spend percentile, inactivity, support history and model risk level."
      isEmpty={data.length === 0}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-56 w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={84} stroke="#ffffff" strokeWidth={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.key} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name) => [`${formatNumber(value)} customers`, name as string]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-2 sm:w-1/2">
          {data.map((entry, index) => (
            <li key={entry.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate text-ink-900">{entry.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-ink-700">
                {formatNumber(entry.value)} · {formatPercent(entry.share)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
