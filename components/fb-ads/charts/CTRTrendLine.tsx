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
import { fmtPct } from "@/lib/fb-ads/engine";
import { CHART_COLORS } from "@/lib/fb-ads/constants";

interface Props {
  data: DailyMetrics[];
}

export default function CTRTrendLine({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date.slice(5),
        fullDate: d.date,
        ctr: d.ctr ?? 0,
      })),
    [data]
  );

  if (chartData.length < 2) return null;

  // Compute average CTR for reference line
  const avgCtr = useMemo(() => {
    const totalClicks = data.reduce((s, d) => s + d.linkClicks, 0);
    const totalImpr = data.reduce((s, d) => s + d.impressions, 0);
    return totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
  }, [data]);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Daily CTR</span>
        <span className="chart-card-total">
          {fmtPct(avgCtr)} avg
        </span>
      </div>
      <div className="chart-card-body">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradCTR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.ctr} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.ctr} stopOpacity={0} />
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
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [fmtPct(value), "CTR"]}
              labelFormatter={(label: string) => label}
            />
            <Area
              type="monotone"
              dataKey="ctr"
              stroke={CHART_COLORS.ctr}
              strokeWidth={2}
              fill="url(#gradCTR)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.ctr }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
