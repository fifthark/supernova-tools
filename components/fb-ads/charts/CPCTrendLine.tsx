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

export default function CPCTrendLine({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date.slice(5),
        fullDate: d.date,
        cpc: d.cpc ?? 0,
      })),
    [data]
  );

  if (chartData.length < 2) return null;

  // Compute weighted average CPC
  const avgCpc = useMemo(() => {
    const totalSpend = data.reduce((s, d) => s + (d.spend || 0), 0);
    const totalClicks = data.reduce((s, d) => s + d.linkClicks, 0);
    return totalClicks > 0 ? totalSpend / totalClicks : 0;
  }, [data]);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Daily CPC</span>
        <span className="chart-card-total">
          {fmtAUD(avgCpc)} avg
        </span>
      </div>
      <div className="chart-card-body">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradCPC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.cpc} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.cpc} stopOpacity={0} />
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
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [fmtAUD(value), "CPC"]}
              labelFormatter={(label: string) => label}
            />
            <Area
              type="monotone"
              dataKey="cpc"
              stroke={CHART_COLORS.cpc}
              strokeWidth={2}
              fill="url(#gradCPC)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.cpc }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
