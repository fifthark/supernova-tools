"use client";

import type { TournamentResult } from "@/lib/calc/types";

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface CostBreakdownProps {
  result: TournamentResult;
}

export function CostBreakdown({ result }: CostBreakdownProps) {
  const rows = [
    { label: "Courts", value: result.costs.courts },
    { label: "Shuttles", value: result.costs.shuttles },
    { label: "Prizes", value: result.costs.prizes },
    { label: "Volunteers", value: result.costs.volunteers },
    { label: "Advertising", value: result.costs.ads },
    { label: "Admin/Misc", value: result.costs.admin },
  ];

  return (
    <div className="card">
      <div className="section-header">Cost Breakdown</div>
      {rows.map((r) => (
        <div key={r.label} className="cost-row">
          <span className="cost-label">{r.label}</span>
          <span className="cost-value">{fmt$(r.value)}</span>
        </div>
      ))}
      <div className="cost-row total">
        <span className="cost-label">Total</span>
        <span className="cost-value">{fmt$(result.costs.total)}</span>
      </div>
    </div>
  );
}
