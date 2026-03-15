"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SavedScenario, TournamentResult } from "@/lib/calc/types";

interface CostStackedBarProps {
  current: { label: string; result: TournamentResult };
  saved: SavedScenario[];
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

const COST_KEYS = [
  { key: "courts", label: "Courts", color: "#6B7280" },
  { key: "shuttles", label: "Shuttles", color: "#06B6D4" },
  { key: "prizes", label: "Prizes", color: "#7C3AED" },
  { key: "volunteers", label: "Volunteers", color: "#9CA3AF" },
  { key: "ads", label: "Ads", color: "#FF5F1F" },
  { key: "admin", label: "Admin", color: "#D1D5DB" },
];

export function CostStackedBar({ current, saved }: CostStackedBarProps) {
  const data = [
    {
      name: current.label,
      courts: current.result.costs.courts,
      shuttles: current.result.costs.shuttles,
      prizes: current.result.costs.prizes,
      volunteers: current.result.costs.volunteers,
      ads: current.result.costs.ads,
      admin: current.result.costs.admin,
    },
    ...saved.map((s) => ({
      name: s.label,
      courts: s.result.costs.courts,
      shuttles: s.result.costs.shuttles,
      prizes: s.result.costs.prizes,
      volunteers: s.result.costs.volunteers,
      ads: s.result.costs.ads,
      admin: s.result.costs.admin,
    })),
  ];

  return (
    <div className="card">
      <div className="section-header">Cost Breakdown Comparison</div>
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
              tick={{ fontSize: 11, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [fmt$(value), name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E5EA", fontSize: 13 }}
            />
            <Legend />
            {COST_KEYS.map((ck) => (
              <Bar
                key={ck.key}
                dataKey={ck.key}
                stackId="costs"
                fill={ck.color}
                name={ck.label}
                radius={ck.key === "admin" ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
