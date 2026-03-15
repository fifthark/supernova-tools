"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { TournamentResult } from "@/lib/calc/types";

interface RevenueWaterfallProps {
  result: TournamentResult;
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export function RevenueWaterfall({ result }: RevenueWaterfallProps) {
  const steps = [
    { name: "Gross Revenue", value: result.grossRevenue, isTotal: true },
    { name: "Platform Fees", value: -result.platformFees, isTotal: false },
    { name: "Refund Leakage", value: -result.refundLeakage, isTotal: false },
    { name: "Courts", value: -result.costs.courts, isTotal: false },
    { name: "Shuttles", value: -result.costs.shuttles, isTotal: false },
    { name: "Prizes", value: -result.costs.prizes, isTotal: false },
    { name: "Volunteers", value: -result.costs.volunteers, isTotal: false },
    { name: "Ads", value: -result.costs.ads, isTotal: false },
    { name: "Admin", value: -result.costs.admin, isTotal: false },
    { name: "Profit", value: result.profit, isTotal: true },
  ];

  // Build waterfall data: each bar starts where the previous ended
  let running = 0;
  const data = steps.map((s) => {
    if (s.isTotal && s.name === "Gross Revenue") {
      const entry = { name: s.name, base: 0, value: s.value, total: s.value, isPositive: true, isTotal: true };
      running = s.value;
      return entry;
    }
    if (s.isTotal && s.name === "Profit") {
      return { name: s.name, base: 0, value: result.profit, total: result.profit, isPositive: result.profit >= 0, isTotal: true };
    }
    const base = running + s.value;
    const entry = { name: s.name, base: Math.min(running, base), value: Math.abs(s.value), total: running + s.value, isPositive: false, isTotal: false };
    running += s.value;
    return entry;
  });

  return (
    <div className="card">
      <div className="section-header">Revenue Waterfall</div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "base") return [null, null];
                return [fmt$(value), "Amount"];
              }}
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E5EA", fontSize: 13 }}
            />
            <ReferenceLine y={0} stroke="#E5E5EA" />
            <Bar dataKey="base" stackId="waterfall" fill="transparent" />
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.isTotal
                      ? entry.isPositive
                        ? "#FF5F1F"
                        : "#FF3B30"
                      : "#D1D5DB"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
