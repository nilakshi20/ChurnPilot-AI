import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_STYLE, ChartFrame, GRID_COLOR, TOOLTIP_STYLE } from "@/charts/ChartFrame";
import type { SegmentRow } from "@/types/api";

export function ChurnBySegmentChart({ segments }: { segments: SegmentRow[] | undefined }) {
  const data = (segments ?? []).map((segment) => ({
    label: segment.label.replace(" / ", " /\n"),
    observed: Number((segment.observed_churn_rate * 100).toFixed(2)),
    predicted: Number(((segment.average_churn_probability ?? 0) * 100).toFixed(2)),
  }));

  return (
    <ChartFrame
      title="Churn by segment"
      description="Observed churn rate compared with the average model probability in each segment."
      info="Observed churn comes from customer status in the database. Predicted probability is the mean model output for the segment."
      isEmpty={data.length === 0}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: -12 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ ...AXIS_STYLE, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={62}
            />
            <YAxis
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name) => [
                `${value}%`,
                name === "observed" ? "Observed churn rate" : "Average model probability",
              ]}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={(value) => (value === "observed" ? "Observed churn" : "Model probability")}
            />
            <Bar dataKey="observed" fill="#2f6148" radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Bar dataKey="predicted" fill="#d9a13b" radius={[6, 6, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
