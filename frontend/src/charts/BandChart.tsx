import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_STYLE, ChartFrame, GRID_COLOR, TOOLTIP_STYLE } from "@/charts/ChartFrame";
import { formatNumber } from "@/utils/format";
import type { BandRow } from "@/types/api";

export function BandChart({
  title,
  description,
  info,
  rows,
}: {
  title: string;
  description: string;
  info?: string;
  rows: BandRow[] | undefined;
}) {
  const data = (rows ?? []).map((row) => ({
    band: row.band,
    observed: Number((row.observed_churn_rate * 100).toFixed(2)),
    predicted: Number(((row.average_churn_probability ?? 0) * 100).toFixed(2)),
    customers: row.customer_count,
  }));

  return (
    <ChartFrame title={title} description={description} info={info} isEmpty={data.length === 0}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="band" tick={{ ...AXIS_STYLE, fontSize: 10 }} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval={0} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => `${value}%`} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name) => [
                `${value}%`,
                name === "observed" ? "Observed churn rate" : "Average model probability",
              ]}
              labelFormatter={(label: string) => {
                const match = data.find((row) => row.band === label);
                return match ? `${label} · ${formatNumber(match.customers)} customers` : label;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={(value) => (value === "observed" ? "Observed churn" : "Model probability")}
            />
            <Bar dataKey="observed" fill="#2f6148" radius={[6, 6, 0, 0]} maxBarSize={30} />
            <Bar dataKey="predicted" fill="#d9a13b" radius={[6, 6, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
