import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_STYLE, ChartFrame, GRID_COLOR, TOOLTIP_STYLE } from "@/charts/ChartFrame";
import { formatCompactCurrency, formatCurrency } from "@/utils/format";
import type { SegmentRow } from "@/types/api";

const BAR_COLORS = ["#2f6148", "#3f7d5e", "#5d9b7c", "#d9a13b", "#dd7a3c", "#b5443a", "#7a6f5c", "#a89a83"];

export function RevenueAtRiskChart({ segments, currency }: { segments: SegmentRow[] | undefined; currency: string }) {
  const data = [...(segments ?? [])]
    .sort((a, b) => b.revenue_at_risk - a.revenue_at_risk)
    .map((segment) => ({
      label: segment.label,
      revenueAtRisk: Number(segment.revenue_at_risk.toFixed(2)),
      monthlyRevenue: segment.monthly_revenue,
      customers: segment.customer_count,
    }));

  return (
    <ChartFrame
      title="Revenue at risk by segment"
      description="Estimated monthly revenue at risk, summed per segment."
      info="Revenue at risk = monthly spend × churn probability, summed across the customers in each segment."
      footnote="These are model estimates, not confirmed losses."
      isEmpty={data.length === 0}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
            />
            <YAxis type="category" dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={150} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number) => [formatCurrency(value, currency), "Estimated revenue at risk"]}
            />
            <Bar dataKey="revenueAtRisk" radius={[0, 8, 8, 0]} maxBarSize={26}>
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
