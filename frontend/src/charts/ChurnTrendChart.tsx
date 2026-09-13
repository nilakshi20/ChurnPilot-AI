import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_STYLE, ChartFrame, GRID_COLOR, TOOLTIP_STYLE } from "@/charts/ChartFrame";
import { formatMonth, formatNumber, formatPercent } from "@/utils/format";
import type { TrendPoint } from "@/types/api";

export function ChurnTrendChart({ points }: { points: TrendPoint[] | undefined }) {
  const data = (points ?? []).map((point) => ({
    period: formatMonth(point.period),
    churnRate: Number((point.churn_rate * 100).toFixed(2)),
    churned: point.churned_customers,
    base: point.base_customers,
  }));

  return (
    <ChartFrame
      title="Churn trend"
      description="Observed monthly churn rate, derived from customer status and last activity dates."
      info="For each month we count customers who had signed up before that month and whose last recorded activity falls inside it while their status is churned."
      footnote="Observed history only. This chart does not forecast future churn."
      isEmpty={data.length === 0}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="period" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
            <YAxis
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}%`}
              width={48}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name) =>
                name === "churnRate" ? [`${value}%`, "Churn rate"] : [formatNumber(value), name as string]
              }
              labelFormatter={(label: string) => `Month: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="churnRate"
              stroke="#2f6148"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2f6148" }}
              activeDot={{ r: 5 }}
              name="churnRate"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-700/70">
        {data.slice(-1).map((point) => (
          <li key={point.period}>
            Latest month {point.period}: {formatPercent(point.churnRate / 100)} of {formatNumber(point.base)} customers
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
