"use client";

import { useState } from "react";
import type { TournamentInput, TournamentResult, ScannerSuggestion } from "@/lib/calc/types";

interface AIAnalysisProps {
  inputs: TournamentInput;
  result: TournamentResult;
  topSuggestions: ScannerSuggestion[];
}

function formatForAI(inputs: TournamentInput, result: TournamentResult, suggestions: ScannerSuggestion[]): string {
  const isSquad = inputs.playersPerTeam > 2;
  const format = isSquad ? "Squad Battle" : "Doubles";

  const lines = [
    `I'm planning a badminton tournament (${format} format) and need help optimising it. Here are my current settings and computed results from our tournament calculator:`,
    ``,
    `## TOURNAMENT STRUCTURE`,
    `- Format: ${format}`,
    `- Categories: ${inputs.numCategories}`,
    `- Total Pools: ${result.totalPools}`,
    `- Teams per Pool: ${inputs.teamsPerPool}`,
    `- Players per Team: ${inputs.playersPerTeam}`,
    `- Ties per Team: ${inputs.tiesPerTeam} (${inputs.tiesPerTeam === inputs.teamsPerPool - 1 ? "full round-robin" : "partial round-robin"})`,
    `- Matches per Tie: ${inputs.matchesPerTie}${isSquad ? " (1 MD + 1 WD + 2 XD)" : ""}`,
    `- Scoring: ${inputs.scoringFormat || "1x21"} (${inputs.minutesPerMatch} min/match)`,
    `- Include Finals: ${inputs.includeFinals ? "Yes" : "No"}`,
    ``,
    `## VENUE & COURTS`,
    `- Courts Available: ${inputs.courtsAvailable}`,
    `- Courts per Pool: ${inputs.courtsPerPool}`,
    `- Court Cost: $${inputs.courtCostPerHour}/hr`,
    `- Courts Used: ${result.courtsUsed} (${result.totalPools} pools x ${inputs.courtsPerPool} courts)`,
    `- Court Hours Billed: ${result.totalCourtHours}`,
    ``,
    `## SCALE`,
    `- Total Teams: ${result.effectiveTeams} (${result.totalTeams} capacity x ${inputs.fillRatePct}% fill)`,
    `- Total Players: ${result.totalPlayers}`,
    ``,
    `## PRICING`,
    `- Price per Player: $${inputs.pricePerPlayer}`,
    ...(inputs.earlyBirdEnabled ? [`- Early Bird: $${inputs.earlyBirdPrice} (${inputs.earlyBirdPct}% of players)`] : []),
    ...(inputs.latePricingEnabled ? [`- Late Price: $${inputs.latePrice} (${inputs.latePct}% of players)`] : []),
    `- Blended Price: $${result.blendedPricePerPlayer.toFixed(2)}`,
    `- Platform Fee: ${inputs.platformFeePct}%`,
    `- Refund Leakage: ${inputs.refundLeakagePct}%`,
    ...((inputs.sponsorshipRevenue ?? 0) > 0 ? [`- Sponsorship: $${inputs.sponsorshipRevenue}`] : []),
    ...((inputs.grantRevenue ?? 0) > 0 ? [`- Grants: $${inputs.grantRevenue}`] : []),
    ``,
    `## COSTS`,
    `- Courts: $${result.costs.courts.toLocaleString()}`,
    `- Shuttles: $${result.costs.shuttles.toLocaleString()} ($${inputs.shuttleCostPerUnit}/shuttle, ${inputs.shuttlesPerMatch}/match)`,
    `- Prizes: $${result.costs.prizes.toLocaleString()} ($${inputs.prizePerCategory}/category x ${inputs.numCategories})`,
    `- Volunteers: $${result.costs.volunteers.toLocaleString()} (${inputs.volunteerCount} x $${inputs.volunteerMealCost})`,
    `- Ads: $${inputs.adsBudget}`,
    `- Admin/Misc: $${inputs.adminMisc}`,
    `- TOTAL COSTS: $${result.costs.total.toLocaleString()}`,
    ``,
    `## REVENUE`,
    `- Gross Revenue: $${result.grossRevenue.toLocaleString()}`,
    `- Platform Fees: -$${result.platformFees.toFixed(0)}`,
    `- Refund Leakage: -$${result.refundLeakage.toFixed(0)}`,
    `- Net Revenue: $${result.netRevenue.toLocaleString()}`,
    ...(result.additionalRevenue > 0 ? [`- Additional (Sponsors+Grants): +$${result.additionalRevenue}`] : []),
    ``,
    `## PROFIT`,
    `- Profit: $${result.profit.toFixed(0)}`,
    `- Margin: ${result.marginPct.toFixed(1)}%`,
    `- Profit/Team: $${result.profitPerTeam.toFixed(2)}`,
    `- Profit/Player: $${result.profitPerPlayer.toFixed(2)}`,
    `- Break-Even: ${result.breakEvenPools !== null ? `${result.breakEvenPools} pools` : "Does not break even"}`,
    ``,
    `## PLAYER VALUE`,
    `- Games/Player (pool): ${result.gamesPerPlayerPool}${isSquad ? " (2 games per tie: 1 discipline + 1 XD)" : ""}`,
    `- Games/Player (incl. finals): ${result.gamesPerPlayerWithFinal}`,
    `- Cost per Game: $${result.costPerGame.toFixed(2)}`,
    ``,
    `## SCHEDULE`,
    `- Time per Tie: ${result.timePerTieMinutes} min`,
    `- Pool Duration: ${result.poolPlayingHours.toFixed(1)}h`,
    `- Booked Hours/Pool: ${result.bookHours}h`,
    `- Parallel Pools: ${result.poolsSimultaneous}`,
    `- Waves: ${result.waves}`,
    `- Pool Stage: ${result.estimatedPoolStageHours.toFixed(1)}h`,
    `- Total Event: ${result.totalEventDuration.toFixed(1)}h`,
    ...(result.scheduleWarning ? [`- WARNING: ${result.scheduleWarning}`] : []),
  ];

  if (suggestions.length > 0) {
    lines.push(``, `## QUICK WINS (sensitivity analysis)`);
    for (const s of suggestions) {
      lines.push(`- ${s.label}: +$${s.profitDelta.toFixed(0)} profit (+${s.marginDelta.toFixed(1)}% margin)`);
    }
  }

  lines.push(
    ``,
    `---`,
    `Based on these numbers, what would you change to improve profitability or player value? Are there any red flags or inefficiencies? What scenarios should I model?`
  );

  return lines.join("\n");
}

export function AIAnalysis({ inputs, result, topSuggestions }: AIAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, result, topSuggestions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setInsights(data.insights);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const copyForAI = async () => {
    const text = formatForAI(inputs, result, topSuggestions);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="card">
      <div className="section-header">AI Analysis</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: insights ? 16 : 0 }}>
        <button
          className="btn-primary"
          onClick={copyForAI}
          style={{
            background: copied ? "#22c55e" : "var(--accent-info)",
            transition: "background 200ms ease",
          }}
        >
          {copied ? "Copied!" : "Copy for Claude / ChatGPT"}
        </button>

        {!insights && !loading && (
          <button className="btn-secondary" onClick={analyze} disabled={loading}>
            Quick Analysis (built-in)
          </button>
        )}
      </div>

      <div className="annotation" style={{ marginTop: 8, marginBottom: insights ? 12 : 0 }}>
        {copied
          ? "Paste into Claude, ChatGPT, or any AI chat for a detailed conversation about your tournament."
          : "Copies all settings + results as a formatted prompt. Paste into any AI for a two-way conversation."}
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="spinner" />
          <span className="annotation">Analyzing...</span>
        </div>
      )}
      {error && (
        <div style={{ color: "var(--accent-loss)", fontSize: 13 }}>
          {error}
        </div>
      )}
      {insights && (
        <div className="ai-card">
          {insights.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} className="ai-insight">{line}</div>
          ))}
          <button
            className="btn-secondary btn-small"
            style={{ marginTop: 12 }}
            onClick={analyze}
          >
            Re-analyze
          </button>
        </div>
      )}
    </div>
  );
}
