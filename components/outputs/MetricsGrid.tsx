"use client";

import type { TournamentResult } from "@/lib/calc/types";
import type { TournamentInput } from "@/lib/calc/types";

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface MetricsGridProps {
  result: TournamentResult;
  input: TournamentInput;
}

export function MetricsGrid({ result, input }: MetricsGridProps) {
  const isSquad = input.playersPerTeam > 2;
  const gamesLabel = isSquad
    ? `${result.gamesPerPlayerPerTie} games/tie × ${input.tiesPerTeam} ties`
    : `${input.matchesPerTie} match × ${input.tiesPerTeam} ties`;
  const setsNote = input.scoringFormat === "2×21" ? " (×2 sets)" : "";

  const metrics = [
    { label: "Total Pools", value: result.totalPools.toString() },
    { label: "Total Teams", value: result.effectiveTeams.toString() },
    { label: "Total Players", value: result.totalPlayers.toString() },
    { label: "Gross Revenue", value: fmt$(result.grossRevenue) },
    { label: "Net Revenue", value: fmt$(result.netRevenue) },
    { label: "Total Costs", value: fmt$(result.costs.total) },
    { label: "Profit/Team", value: fmt$(result.profitPerTeam) },
    { label: "Profit/Player", value: fmt$(result.profitPerPlayer) },
    {
      label: "Games/Player",
      value: result.gamesPerPlayerPool.toString(),
      helper: gamesLabel + setsNote,
    },
    {
      label: "Games incl. Finals",
      value: result.gamesPerPlayerWithFinal.toString(),
      helper: result.gamesPerPlayerWithFinal > result.gamesPerPlayerPool ? "Pool + finals" : "No finals",
    },
    { label: "Cost/Game", value: "$" + result.costPerGame.toFixed(2), helper: "Player fee ÷ games played" },
    { label: "Break-Even", value: result.breakEvenPools !== null ? `${result.breakEvenPools} pools` : "N/A" },
    { label: "Blended Price", value: "$" + result.blendedPricePerPlayer.toFixed(2) },
  ];

  return (
    <div className="card">
      <div className="section-header">Key Metrics</div>
      <div className="metrics-grid">
        {metrics.map((m) => (
          <div key={m.label} className="metric-item">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            {"helper" in m && m.helper && (
              <div className="helper-text">{m.helper}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
