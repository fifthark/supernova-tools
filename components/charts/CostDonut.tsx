"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TournamentResult } from "@/lib/calc/types";

const COLORS = [
  "#6B7280", // Courts - blue-gray
  "#06B6D4", // Shuttles - cyan
  "#7C3AED", // Prizes - purple
  "#9CA3AF", // Volunteers - gray
  "#FF5F1F", // Ads - orange
  "#D1D5DB", // Admin - light gray
];

interface CostDonutProps {
  result: TournamentResult;
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export function CostDonut({ result }: CostDonutProps) {
  const data = [
    { name: "Courts", value: result.costs.courts },
    { name: "Shuttles", value: result.costs.shuttles },
    { name: "Prizes", value: result.costs.prizes },
    { name: "Volunteers", value: result.costs.volunteers },
    { name: "Ads", value: result.costs.ads },
    { name: "Admin", value: result.costs.admin },
  ].filter((d) => d.value > 0);

  return (
    <div className="card">
      <div className="section-header">Cost Distribution</div>
      <div className="chart-container" style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => fmt$(value)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(result.costs.total)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i] }} />
            <span style={{ color: "var(--text-secondary)" }}>{d.name}</span>
            <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt$(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
