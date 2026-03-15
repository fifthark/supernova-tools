"use client";

import type { TournamentResult } from "@/lib/calc/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface ProfitHeroProps {
  result: TournamentResult;
  variancePct: number;
}

export function ProfitHero({ result, variancePct }: ProfitHeroProps) {
  const isPositive = result.profit >= 0;
  const cls = isPositive ? "positive" : "negative";

  return (
    <div className="card card-elevated profit-hero">
      <div className="section-header" style={{ textAlign: "center" }}>
        Net Profit
      </div>
      <div className={`amount ${cls}`}>{fmt(result.profit)}</div>
      <div className={`margin ${cls}`}>
        {result.marginPct.toFixed(1)}% margin
      </div>
      {variancePct > 0 && (
        <div className="range">
          Range: {fmt(result.profitRange.low)} – {fmt(result.profitRange.high)}
        </div>
      )}
    </div>
  );
}
