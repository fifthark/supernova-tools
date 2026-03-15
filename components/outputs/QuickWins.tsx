"use client";

import type { ScannerSuggestion } from "@/lib/calc/types";

interface QuickWinsProps {
  suggestions: ScannerSuggestion[];
}

function fmt$(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return sign + "$" + Math.round(n).toLocaleString("en-AU");
}

export function QuickWins({ suggestions }: QuickWinsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="card">
      <div className="section-header">Quick Wins</div>
      <div className="quick-wins">
        {suggestions.map((s) => (
          <div key={s.label} className="quick-win-chip">
            <span>{s.label}</span>
            <span className="delta">{fmt$(s.profitDelta)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
