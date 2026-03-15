"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SavedScenario, TournamentResult } from "@/lib/calc/types";

interface ProfitMarginBarProps {
  current: { label: string; result: TournamentResult };
  saved: SavedScenario[];
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export function ProfitMarginBar({ current, saved }: ProfitMarginBarProps) {
  const data = [
    { name: current.label, profit: current.result.profit, margin: current.result.marginPct },
    ...saved.map((s) => ({
      name: s.label,
      profit: s.result.profit,
      margin: s.result.marginPct,
    })),
  ];

  return (
    <div className="card">
      <div className="section-header">Profit & Margin Comparison</div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap="30%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="profit"
              tick={{ fontSize: 11, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="margin"
              orientation="right"
              tick={{ fontSize: 11, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "profit") return [fmt$(value), "Profit"];
                return [`${value.toFixed(1)}%`, "Margin"];
              }}
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E5EA", fontSize: 13 }}
            />
            <Legend />
            <Bar yAxisId="profit" dataKey="profit" fill="#FF5F1F" radius={[4, 4, 0, 0]} name="Profit" />
            <Bar yAxisId="margin" dataKey="margin" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Margin %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
