"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { DailyMetrics } from "@/lib/fb-ads/types";
import { fmtAUD } from "@/lib/fb-ads/engine";
import { CHART_COLORS } from "@/lib/fb-ads/constants";

interface Props {
  data: DailyMetrics[];
}

export default function SpendTrendLine({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date.slice(5), // MM-DD
        fullDate: d.date,
        spend: d.spend,
      })),
    [data]
  );

  if (chartData.length < 2) return null;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Daily Spend</span>
        <span className="chart-card-total">
          {fmtAUD(data.reduce((s, d) => s + d.spend, 0))} total
        </span>
      </div>
      <div className="chart-card-body">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.spend} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.spend} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v}`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [fmtAUD(value), "Spend"]}
              labelFormatter={(label: string) => label}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke={CHART_COLORS.spend}
              strokeWidth={2}
              fill="url(#gradSpend)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.spend }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
