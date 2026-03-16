"use client";

import { FBAdsMetrics } from "@/lib/fb-ads/types";
import { fmtAUD, fmtPct, fmtNumber, fmtRoas } from "@/lib/fb-ads/engine";
import { OBJECTIVE_METRICS, UNIVERSAL_METRICS, METRIC_DIRECTIONS } from "@/lib/fb-ads/constants";

interface Props {
  metrics: FBAdsMetrics;
  objective: string | null;  // null = mixed/all campaigns view
  previousMetrics?: FBAdsMetrics | null;  // For delta chips
}

interface CardDef {
  key: string;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;  // % change from previous period
  deltaInverted?: boolean; // true = lower is better (CPC, CPM)
}

function computeDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildCards(
  metrics: FBAdsMetrics,
  objective: string | null,
  previousMetrics?: FBAdsMetrics | null
): CardDef[] {
  // Determine which metrics to prioritize based on objective
  const priorityKeys = objective && OBJECTIVE_METRICS[objective]
    ? OBJECTIVE_METRICS[objective]
    : UNIVERSAL_METRICS;

  // Helper to add delta if previous metrics available
  const withDelta = (key: string, card: CardDef): CardDef => {
    if (!previousMetrics) return card;
    const curr = metrics[key as keyof FBAdsMetrics] as number | null;
    const prev = previousMetrics[key as keyof FBAdsMetrics] as number | null;
    const direction = METRIC_DIRECTIONS[key];
    return {
      ...card,
      delta: computeDelta(curr, prev),
      deltaInverted: direction === "lower-is-better",
    };
  };

  // Full metric map
  const allCards: Record<string, CardDef> = {
    spend: withDelta("spend", { key: "spend", label: "Total Spend", value: fmtAUD(metrics.spend) }),
    impressions: withDelta("impressions", { key: "impressions", label: "Impressions", value: fmtNumber(metrics.impressions) }),
    reach: withDelta("reach", { key: "reach", label: "Reach", value: fmtNumber(metrics.reach) }),
    linkClicks: withDelta("linkClicks", { key: "linkClicks", label: "Link Clicks", value: fmtNumber(metrics.linkClicks) }),
    landingPageViews: withDelta("landingPageViews", {
      key: "landingPageViews",
      label: "Landing Page Views",
      value: fmtNumber(metrics.landingPageViews),
      sub: metrics.landingPageViewRate != null ? `${metrics.landingPageViewRate.toFixed(1)}% of clicks` : undefined,
    }),
    ctr: withDelta("ctr", { key: "ctr", label: "CTR", value: fmtPct(metrics.ctr) }),
    cpc: withDelta("cpc", { key: "cpc", label: "Avg CPC", value: metrics.cpc != null ? fmtAUD(metrics.cpc) : "—" }),
    cpm: withDelta("cpm", { key: "cpm", label: "CPM", value: metrics.cpm != null ? fmtAUD(metrics.cpm) : "—" }),
    conversions: withDelta("conversions", { key: "conversions", label: "Conversions", value: fmtNumber(metrics.conversions) }),
    costPerConversion: withDelta("costPerConversion", {
      key: "costPerConversion",
      label: "Cost / Conv",
      value: metrics.costPerConversion != null ? fmtAUD(metrics.costPerConversion) : "—",
    }),
    conversionRate: withDelta("conversionRate", {
      key: "conversionRate",
      label: "Conv Rate",
      value: fmtPct(metrics.conversionRate),
    }),
    roas: withDelta("roas", {
      key: "roas",
      label: "ROAS",
      value: fmtRoas(metrics.roas),
    }),
    frequency: withDelta("frequency", {
      key: "frequency",
      label: "Frequency",
      value: metrics.frequency != null ? metrics.frequency.toFixed(2) : "—",
      sub: metrics.frequency != null && metrics.frequency >= 3
        ? "High — ad fatigue likely"
        : metrics.frequency != null && metrics.frequency >= 2.5
        ? "Watch — approaching saturation"
        : undefined,
    }),
    landingPageViewRate: withDelta("landingPageViewRate", {
      key: "landingPageViewRate",
      label: "LP View Rate",
      value: fmtPct(metrics.landingPageViewRate),
      sub: metrics.landingPageViewRate != null && metrics.landingPageViewRate < 50
        ? "Below 50% — check page speed"
        : undefined,
    }),
    conversionValue: withDelta("conversionValue", {
      key: "conversionValue",
      label: "Revenue",
      value: metrics.conversionValue != null ? fmtAUD(metrics.conversionValue) : "—",
    }),
  };

  // Build ordered card list: priority keys first, then fill with others
  const cards: CardDef[] = [];
  const added = new Set<string>();

  // Always show spend first
  if (!priorityKeys.includes("spend")) {
    cards.push(allCards.spend);
    added.add("spend");
  }

  for (const key of priorityKeys) {
    if (allCards[key] && !added.has(key)) {
      cards.push(allCards[key]);
      added.add(key);
    }
  }

  // Add ROAS, conversions, frequency, and LP view rate if not already shown
  for (const key of ["conversions", "roas", "frequency", "landingPageViewRate"]) {
    if (allCards[key] && !added.has(key) && metrics[key as keyof FBAdsMetrics] != null) {
      cards.push(allCards[key]);
      added.add(key);
    }
  }

  // Cap at 8 cards
  return cards.slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════════
// DELTA CHIP COMPONENT
// ═══════════════════════════════════════════════════════════════════

function DeltaChip({ delta, inverted }: { delta: number; inverted?: boolean }) {
  const isPositive = delta > 0;
  // For inverted metrics (CPC, CPM), positive change is bad
  const isGood = inverted ? !isPositive : isPositive;
  const arrow = isPositive ? "↑" : "↓";
  const className = `delta-chip ${isGood ? "delta-good" : "delta-bad"}`;

  return (
    <span className={className}>
      {arrow} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function SummaryCards({ metrics, objective, previousMetrics }: Props) {
  const cards = buildCards(metrics, objective, previousMetrics);

  return (
    <div className="summary-cards">
      {cards.map(card => {
        const isFreqWarning = card.key === "frequency" && metrics.frequency != null && metrics.frequency >= 2.5;
        const freqClass = isFreqWarning
          ? metrics.frequency! >= 3 ? "summary-card-warn-red" : "summary-card-warn-amber"
          : "";
        return (
          <div className={`summary-card ${freqClass}`} key={card.key}>
            <div className="summary-card-label">{card.label}</div>
            <div className="summary-card-value">
              {card.value}
              {card.delta != null && Math.abs(card.delta) >= 0.1 && (
                <DeltaChip delta={card.delta} inverted={card.deltaInverted} />
              )}
            </div>
            {card.sub && <div className="summary-card-sub">{card.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}
