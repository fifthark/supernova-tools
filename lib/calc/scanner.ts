import type { TournamentInput, ScannerSuggestion } from "./types";
import { computeTournament } from "./engine";

interface Perturbation {
  label: string;
  field: keyof TournamentInput;
  delta?: number;
  value?: number | boolean;
}

const PERTURBATIONS: Perturbation[] = [
  { label: "+$5 price", field: "pricePerPlayer", delta: +5 },
  { label: "-$5 price", field: "pricePerPlayer", delta: -5 },
  { label: "+$10 price", field: "pricePerPlayer", delta: +10 },
  { label: "+1 pool/category", field: "poolsPerCategory", delta: +1 },
  { label: "-1 pool/category", field: "poolsPerCategory", delta: -1 },
  { label: "+1 team/pool", field: "teamsPerPool", delta: +1 },
  { label: "-1 team/pool", field: "teamsPerPool", delta: -1 },
  { label: "+1 category", field: "numCategories", delta: +1 },
  { label: "-$100 ads", field: "adsBudget", delta: -100 },
  { label: "-$1 shuttle cost", field: "shuttleCostPerUnit", delta: -1 },
  { label: "No finals", field: "includeFinals", value: false },
  { label: "+2 courts", field: "courtsAvailable", delta: +2 },
  { label: "Fill rate 90%", field: "fillRatePct", value: 90 },
  { label: "Fill rate 80%", field: "fillRatePct", value: 80 },
];

export function runScanner(
  input: TournamentInput,
  topN: number = 5
): ScannerSuggestion[] {
  const baseline = computeTournament(input);
  const suggestions: ScannerSuggestion[] = [];

  for (const p of PERTURBATIONS) {
    const tweaked = { ...input };
    if (p.value !== undefined) {
      (tweaked as Record<string, unknown>)[p.field] = p.value;
    } else if (p.delta !== undefined) {
      const current = input[p.field] as number;
      (tweaked as Record<string, unknown>)[p.field] = current + p.delta;
    }

    const result = computeTournament(tweaked);
    const profitDelta = result.profit - baseline.profit;
    const marginDelta = result.marginPct - baseline.marginPct;
    const durationDelta =
      result.totalEventDuration - baseline.totalEventDuration;

    suggestions.push({
      label: p.label,
      profitDelta,
      marginDelta,
      durationDelta,
      newProfit: result.profit,
      newMargin: result.marginPct,
    });
  }

  // Sort by profit delta descending, return top N positive suggestions
  return suggestions
    .filter((s) => s.profitDelta > 0)
    .sort((a, b) => b.profitDelta - a.profitDelta)
    .slice(0, topN);
}
