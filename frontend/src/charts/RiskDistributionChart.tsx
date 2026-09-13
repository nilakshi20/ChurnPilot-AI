import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AXIS_STYLE, ChartFrame, TOOLTIP_STYLE } from "@/charts/ChartFrame";
import { RISK_CHART_COLORS } from "@/components/ui/RiskIndicator";
import { formatNumber, formatPercent, titleCase } from "@/utils/format";
import type { CountMetric } from "@/types/api";

export function RiskDistributionChart({ distribution }: { distribution: CountMetric[] | undefined }) {
  const data = (distribution ?? []).map((item) => ({
    name: item.key === "unscored" ? "Not scored" : `${titleCase(item.key)} risk`,
    key: item.key,
    value: item.count,
    share: item.share,
  }));

  return (
    <ChartFrame
      title="Risk distribution"
      description="Customers grouped by the model risk level derived from their churn probability."
      info="Thresholds: Low below 0.25, Medium 0.25 to 0.49, High 0.50 to 0.74, Critical 0.75 and above."
      isEmpty={data.length === 0}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-56 w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
                style={AXIS_STYLE}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={RISK_CHART_COLORS[entry.key] ?? "#b8b0a0"} />
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
          {data.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: RISK_CHART_COLORS[entry.key] ?? "#b8b0a0" }}
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
