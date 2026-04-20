// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — RECOMMENDATIONS ENGINE
// ═══════════════════════════════════════════════════════════════════
//
// Pure functions. No React, no side effects.
// Every insight is gated by metric availability + sample-size thresholds.
// Confidence = f(sample size, metric availability).
//
// ═══════════════════════════════════════════════════════════════════

import {
  FBAdRecord,
  FBAdsMetrics,
  Insight,
  InsightSeverity,
  MetricAvailability,
  DateRange,
} from "./types";
import {
  computeOverallMetrics,
  aggregateCampaigns,
  aggregateByCreative,
  filterByDateRange,
  computeDeltaPercent,
} from "./engine";
import {
  FATIGUE_FREQUENCY_ACTION,
  FATIGUE_FREQUENCY_WATCH,
  BUDGET_WASTE_CPC_THRESHOLD,
  BUDGET_WASTE_SPEND_MIN,
  TREND_CTR_DROP_THRESHOLD,
  TREND_CPC_RISE_THRESHOLD,
  MIN_IMPRESSIONS_FOR_INSIGHT,
  MIN_CLICKS_FOR_RATE_INSIGHT,
  MIN_SPEND_SHARE_FOR_FATIGUE,
  LP_VIEW_RATE_THRESHOLD,
  TREND_MIN_DAYS,
  TREND_MIN_IMPRESSIONS_PER_HALF,
  MAX_INSIGHTS_TOP,
  MAX_INSIGHTS_DRILL,
  OBJECTIVE_METRICS,
} from "./constants";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

let insightCounter = 0;
function nextId(): string {
  return `insight_${++insightCounter}`;
}

export function resetInsightCounter(): void {
  insightCounter = 0;
}

function fmtPctShort(n: number): string {
  return `${Math.abs(n).toFixed(1)}%`;
}

function fmtAUDShort(n: number): string {
  return `$${n.toFixed(2)}`;
}

function confidenceFromImpressions(impressions: number, hasDirectMetric: boolean): "high" | "medium" | "low" {
  if (impressions >= 5000 && hasDirectMetric) return "high";
  if (impressions >= 2000) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════════════
// MASTER ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

export function generateInsights(
  records: FBAdRecord[],
  dateRange: DateRange,
  availability: MetricAvailability,
  maxInsights: number = MAX_INSIGHTS_TOP,
): Insight[] {
  if (records.length === 0) return [];

  resetInsightCounter();

  const overall = computeOverallMetrics(records);
  const campaigns = aggregateCampaigns(records);
  const creatives = aggregateByCreative(records);

  const allInsights: Insight[] = [
    ...detectCreativeFatigue(records, creatives, overall, availability),
    ...detectBudgetWaste(campaigns, overall),
    ...identifyWinners(campaigns, creatives, overall, availability),
    ...detectTrendShifts(records, dateRange),
    ...analyzeFrequency(overall, availability),
    ...checkObjectiveAlignment(records, campaigns, overall, availability),
  ];

  // Sort: action first, then watch, then win. Within severity, higher-spend entities first.
  const severityOrder: Record<InsightSeverity, number> = { action: 0, watch: 1, win: 2 };
  allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Deduplicate by entityName + category
  const seen = new Set<string>();
  const deduped: Insight[] = [];
  for (const insight of allInsights) {
    const key = `${insight.category}:${insight.entityName || "global"}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(insight);
    }
  }

  if (deduped.length === 0) {
    const fallback = buildFallbackBenchmarkInsight(campaigns);
    if (fallback) {
      deduped.push(fallback);
    }
  }

  return deduped.slice(0, maxInsights);
}

function buildFallbackBenchmarkInsight(
  campaigns: ReturnType<typeof aggregateCampaigns>,
): Insight | null {
  const eligibleCampaigns = campaigns.filter(
    campaign => campaign.impressions >= MIN_IMPRESSIONS_FOR_INSIGHT && campaign.linkClicks >= MIN_CLICKS_FOR_RATE_INSIGHT
  );

  if (eligibleCampaigns.length === 0) return null;

  const topCampaign = [...eligibleCampaigns].sort((a, b) => {
    const aCtr = a.ctr ?? -1;
    const bCtr = b.ctr ?? -1;
    if (bCtr !== aCtr) return bCtr - aCtr;
    return b.spend - a.spend;
  })[0];

  return {
    id: nextId(),
    severity: "win",
    category: "creative",
    title: "Benchmark campaign identified",
    why: `${topCampaign.campaignName} is the strongest current benchmark with CTR ${fmtPctShort(topCampaign.ctr ?? 0)} across ${topCampaign.impressions.toLocaleString()} impressions.`,
    action: "Use this campaign as your comparison baseline when reviewing nested ad sets and ads below.",
    entityName: topCampaign.campaignName,
    entityType: "campaign",
    confidence: confidenceFromImpressions(topCampaign.impressions, topCampaign.ctr != null),
    metric: "ctr",
    value: topCampaign.ctr != null ? fmtPctShort(topCampaign.ctr) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. CREATIVE FATIGUE DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectCreativeFatigue(
  records: FBAdRecord[],
  creatives: ReturnType<typeof aggregateByCreative>,
  overall: FBAdsMetrics,
  availability: MetricAvailability,
): Insight[] {
  const insights: Insight[] = [];
  const totalSpend = overall.spend;

  for (const creative of creatives) {
    // Gate: minimum impressions + minimum spend share
    if (creative.impressions < MIN_IMPRESSIONS_FOR_INSIGHT) continue;
    if (totalSpend > 0 && (creative.spend / totalSpend) < MIN_SPEND_SHARE_FOR_FATIGUE) continue;

    const hasFrequency = availability.frequency && creative.frequency != null;

    if (hasFrequency && creative.frequency! >= FATIGUE_FREQUENCY_ACTION) {
      // Check CTR trend within this creative's records for additional signal
      const creativeRecs = records.filter(r => r.creativeName === creative.creativeName);
      const ctrDrop = computeHalfPeriodDelta(creativeRecs, "ctr");

      const ctrNote = ctrDrop != null && ctrDrop < -10
        ? `, CTR dropped ${fmtPctShort(ctrDrop)} in the second half`
        : "";

      insights.push({
        id: nextId(),
        severity: "action",
        category: "fatigue",
        title: "Creative fatigue detected",
        why: `Frequency ${creative.frequency!.toFixed(1)}x${ctrNote}.`,
        action: "Refresh the creative or narrow the audience to reduce repeat impressions.",
        entityName: creative.creativeName,
        entityType: "creative",
        confidence: confidenceFromImpressions(creative.impressions, true),
        metric: "frequency",
        value: creative.frequency!.toFixed(1),
      });
    } else if (hasFrequency && creative.frequency! >= FATIGUE_FREQUENCY_WATCH) {
      insights.push({
        id: nextId(),
        severity: "watch",
        category: "fatigue",
        title: "Approaching ad fatigue",
        why: `Frequency ${creative.frequency!.toFixed(1)}x — nearing the saturation threshold of ${FATIGUE_FREQUENCY_ACTION}.`,
        action: "Monitor closely. Prepare fresh creative variants as a backup.",
        entityName: creative.creativeName,
        entityType: "creative",
        confidence: confidenceFromImpressions(creative.impressions, true),
        metric: "frequency",
        value: creative.frequency!.toFixed(1),
      });
    } else if (!hasFrequency) {
      // Fallback: use CTR declining + CPC rising within same creative
      const creativeRecs = records.filter(r => r.creativeName === creative.creativeName);
      if (creativeRecs.length < 4) continue; // Need enough data points

      const ctrDelta = computeHalfPeriodDelta(creativeRecs, "ctr");
      const cpcDelta = computeHalfPeriodDelta(creativeRecs, "cpc");

      if (ctrDelta != null && ctrDelta < -15 && cpcDelta != null && cpcDelta > 15) {
        insights.push({
          id: nextId(),
          severity: "watch",
          category: "fatigue",
          title: "Possible creative fatigue (no frequency data)",
          why: `CTR dropped ${fmtPctShort(ctrDelta)} and CPC rose ${fmtPctShort(cpcDelta)} in the second half of this period.`,
          action: "Consider refreshing this creative. Add Reach column to CSV for frequency-based detection.",
          entityName: creative.creativeName,
          entityType: "creative",
          confidence: "low",
          metric: "ctr",
        });
      }
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// 2. BUDGET WASTE DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectBudgetWaste(
  campaigns: ReturnType<typeof aggregateCampaigns>,
  overall: FBAdsMetrics,
): Insight[] {
  const insights: Insight[] = [];
  const avgCPC = overall.cpc;

  if (avgCPC == null || avgCPC === 0) return insights;

  for (const campaign of campaigns) {
    // Gate: minimum spend + minimum clicks
    if (campaign.spend < BUDGET_WASTE_SPEND_MIN) continue;
    if (campaign.linkClicks < MIN_CLICKS_FOR_RATE_INSIGHT) continue;
    if (campaign.cpc == null) continue;

    const cpcRatio = campaign.cpc / avgCPC;

    if (cpcRatio >= BUDGET_WASTE_CPC_THRESHOLD) {
      const pctAbove = ((cpcRatio - 1) * 100).toFixed(0);
      insights.push({
        id: nextId(),
        severity: "action",
        category: "budget",
        title: "High CPC — possible budget waste",
        why: `CPC ${fmtAUDShort(campaign.cpc)} is ${pctAbove}% above account avg ${fmtAUDShort(avgCPC)}, with ${fmtAUDShort(campaign.spend)} spent.`,
        action: "Review targeting and ad creative. Consider pausing underperforming ad sets within this campaign.",
        entityName: campaign.campaignName,
        entityType: "campaign",
        confidence: campaign.spend >= 50 && campaign.linkClicks >= 100 ? "high" : "medium",
        metric: "cpc",
        value: fmtAUDShort(campaign.cpc),
      });
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// 3. WINNER IDENTIFICATION (objective-aware)
// ═══════════════════════════════════════════════════════════════════

function identifyWinners(
  campaigns: ReturnType<typeof aggregateCampaigns>,
  creatives: ReturnType<typeof aggregateByCreative>,
  overall: FBAdsMetrics,
  availability: MetricAvailability,
): Insight[] {
  const insights: Insight[] = [];

  // --- Creative winner ---
  const eligibleCreatives = creatives.filter(
    c => c.impressions >= MIN_IMPRESSIONS_FOR_INSIGHT && c.linkClicks >= MIN_CLICKS_FOR_RATE_INSIGHT
  );

  if (eligibleCreatives.length >= 2) {
    // Determine ranking metric based on available data
    let winnerMetric: string;
    let winnerLabel: string;

    if (availability.conversions && eligibleCreatives.some(c => c.costPerConversion != null && c.costPerConversion > 0)) {
      // Rank by CPA (lower is better)
      eligibleCreatives.sort((a, b) => (a.costPerConversion ?? Infinity) - (b.costPerConversion ?? Infinity));
      const winner = eligibleCreatives[0];
      if (winner.costPerConversion != null) {
        winnerMetric = "costPerConversion";
        winnerLabel = `Lowest CPA at ${fmtAUDShort(winner.costPerConversion)}`;

        insights.push({
          id: nextId(),
          severity: "win",
          category: "creative",
          title: "Top performing creative (by CPA)",
          why: `${winnerLabel} with ${winner.conversions} conversions.`,
          action: "Scale budget to this creative. Consider duplicating into new ad sets for broader reach.",
          entityName: winner.creativeName,
          entityType: "creative",
          confidence: confidenceFromImpressions(winner.impressions, true),
          metric: winnerMetric,
          value: fmtAUDShort(winner.costPerConversion),
        });
      }
    } else {
      // Fallback: rank by CTR
      eligibleCreatives.sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0));
      const winner = eligibleCreatives[0];
      if (winner.ctr != null && overall.ctr != null && overall.ctr > 0) {
        const multiplier = (winner.ctr / overall.ctr).toFixed(1);
        insights.push({
          id: nextId(),
          severity: "win",
          category: "creative",
          title: "Top engagement winner (CTR)",
          why: `CTR ${winner.ctr.toFixed(2)}% (${multiplier}x account avg). Note: conversion data not available for deeper ranking.`,
          action: "Scale budget gradually (10-20% increases). Monitor conversion performance if tracking is available.",
          entityName: winner.creativeName,
          entityType: "creative",
          confidence: "medium",
          metric: "ctr",
          value: `${winner.ctr.toFixed(2)}%`,
        });
      }
    }
  }

  // --- Campaign winner ---
  const eligibleCampaigns = campaigns.filter(
    c => c.impressions >= MIN_IMPRESSIONS_FOR_INSIGHT && c.linkClicks >= MIN_CLICKS_FOR_RATE_INSIGHT
  );

  if (eligibleCampaigns.length >= 2) {
    // Objective-aware scoring
    const scored = eligibleCampaigns.map(c => {
      const obj = c.campaignObjective || "";
      let score = 0;
      let scoreName = "efficiency";

      if ((obj === "OUTCOME_LEADS" || obj === "OUTCOME_SALES") && c.costPerConversion != null && c.costPerConversion > 0) {
        score = 1 / c.costPerConversion; // Lower CPA = higher score
        scoreName = "CPA";
      } else if (obj === "OUTCOME_TRAFFIC" && c.landingPageViewRate != null) {
        score = c.landingPageViewRate;
        scoreName = "LPV Rate";
      } else if (c.cpc != null && c.cpc > 0) {
        score = 1 / c.cpc;
        scoreName = "CPC";
      }

      return { campaign: c, score, scoreName };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (best.score > 0) {
      insights.push({
        id: nextId(),
        severity: "win",
        category: "efficiency",
        title: `Most efficient campaign (by ${best.scoreName})`,
        why: `Best ${best.scoreName} among all campaigns with ${fmtAUDShort(best.campaign.spend)} spent.`,
        action: "Consider increasing daily budget on this campaign gradually.",
        entityName: best.campaign.campaignName,
        entityType: "campaign",
        confidence: confidenceFromImpressions(best.campaign.impressions, availability.conversions),
        metric: best.scoreName.toLowerCase(),
      });
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// 4. TREND SHIFT DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectTrendShifts(
  records: FBAdRecord[],
  dateRange: DateRange,
): Insight[] {
  const insights: Insight[] = [];

  const start = new Date(dateRange.start + "T00:00:00");
  const end = new Date(dateRange.end + "T00:00:00");
  const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Gate: need minimum days
  if (daysDiff < TREND_MIN_DAYS) return insights;

  // Split into first half and second half
  const midpoint = new Date(start);
  midpoint.setDate(midpoint.getDate() + Math.floor(daysDiff / 2));
  const midStr = midpoint.toISOString().slice(0, 10);

  const firstHalf = records.filter(r => r.date >= dateRange.start && r.date < midStr);
  const secondHalf = records.filter(r => r.date >= midStr && r.date <= dateRange.end);

  const firstMetrics = computeOverallMetrics(firstHalf);
  const secondMetrics = computeOverallMetrics(secondHalf);

  // Gate: both halves need minimum volume
  if (firstMetrics.impressions < TREND_MIN_IMPRESSIONS_PER_HALF) return insights;
  if (secondMetrics.impressions < TREND_MIN_IMPRESSIONS_PER_HALF) return insights;

  const confidence: "high" | "medium" = daysDiff >= 14 ? "high" : "medium";

  // CTR declining
  const ctrDelta = computeDeltaPercent(secondMetrics.ctr, firstMetrics.ctr);
  if (ctrDelta != null && ctrDelta < -(TREND_CTR_DROP_THRESHOLD * 100)) {
    insights.push({
      id: nextId(),
      severity: "action",
      category: "efficiency",
      title: "CTR declining",
      why: `CTR dropped ${fmtPctShort(ctrDelta)} between the first and second half of this period.`,
      action: "Check for audience overlap, creative fatigue, or increased competition. Refresh creatives or narrow targeting.",
      confidence,
      metric: "ctr",
      value: `${secondMetrics.ctr?.toFixed(2)}%`,
    });
  }

  // CPC rising
  const cpcDelta = computeDeltaPercent(secondMetrics.cpc, firstMetrics.cpc);
  if (cpcDelta != null && cpcDelta > (TREND_CPC_RISE_THRESHOLD * 100)) {
    insights.push({
      id: nextId(),
      severity: "action",
      category: "budget",
      title: "CPC rising",
      why: `CPC increased ${fmtPctShort(cpcDelta)} in the second half of this period.`,
      action: "Review bid strategy and audience saturation. Consider expanding to new audiences or reducing frequency.",
      confidence,
      metric: "cpc",
      value: secondMetrics.cpc != null ? fmtAUDShort(secondMetrics.cpc) : undefined,
    });
  }

  // Conversions improving (win)
  if (secondMetrics.conversions != null && firstMetrics.conversions != null) {
    const convDelta = computeDeltaPercent(secondMetrics.conversions, firstMetrics.conversions);
    if (convDelta != null && convDelta > 20) {
      insights.push({
        id: nextId(),
        severity: "win",
        category: "efficiency",
        title: "Conversions trending up",
        why: `Conversions increased ${fmtPctShort(convDelta)} in the second half of this period.`,
        action: "Maintain current strategy. Consider scaling budget gradually to capitalize on this momentum.",
        confidence,
        metric: "conversions",
        value: `${secondMetrics.conversions}`,
      });
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// 5. FREQUENCY ALERT
// ═══════════════════════════════════════════════════════════════════

function analyzeFrequency(
  overall: FBAdsMetrics,
  availability: MetricAvailability,
): Insight[] {
  const insights: Insight[] = [];

  if (!availability.reach || overall.frequency == null) {
    return insights;
  }

  if (overall.frequency >= FATIGUE_FREQUENCY_ACTION) {
    insights.push({
      id: nextId(),
      severity: "action",
      category: "targeting",
      title: "Audience saturation",
      why: `Overall frequency ${overall.frequency.toFixed(1)}x — ads shown ${overall.frequency.toFixed(1)} times per person on average.`,
      action: "Expand your audience, add new interest targeting, or use lookalike audiences to reach fresh people.",
      confidence: "high",
      metric: "frequency",
      value: overall.frequency.toFixed(1),
    });
  } else if (overall.frequency >= FATIGUE_FREQUENCY_WATCH) {
    insights.push({
      id: nextId(),
      severity: "watch",
      category: "targeting",
      title: "Frequency approaching saturation",
      why: `Overall frequency ${overall.frequency.toFixed(1)}x — nearing the ${FATIGUE_FREQUENCY_ACTION}x threshold.`,
      action: "Prepare audience expansion. Consider excluding recent converters to improve relevance.",
      confidence: "high",
      metric: "frequency",
      value: overall.frequency.toFixed(1),
    });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// 6. OBJECTIVE ALIGNMENT CHECK
// ═══════════════════════════════════════════════════════════════════

function checkObjectiveAlignment(
  records: FBAdRecord[],
  campaigns: ReturnType<typeof aggregateCampaigns>,
  overall: FBAdsMetrics,
  availability: MetricAvailability,
): Insight[] {
  const insights: Insight[] = [];

  for (const campaign of campaigns) {
    if (campaign.impressions < MIN_IMPRESSIONS_FOR_INSIGHT) continue;
    if (!campaign.campaignObjective) continue;

    const obj = campaign.campaignObjective;

    // Traffic campaigns: check landing page view rate
    if (obj === "OUTCOME_TRAFFIC" && availability.landingPageViews) {
      if (campaign.landingPageViewRate != null && campaign.landingPageViewRate < LP_VIEW_RATE_THRESHOLD) {
        insights.push({
          id: nextId(),
          severity: "action",
          category: "efficiency",
          title: "Low landing page view rate",
          why: `Only ${campaign.landingPageViewRate.toFixed(1)}% of clicks result in a landing page view (threshold: ${LP_VIEW_RATE_THRESHOLD}%).`,
          action: "Check page load speed, ensure links are correct, and review mobile experience.",
          entityName: campaign.campaignName,
          entityType: "campaign",
          confidence: campaign.linkClicks >= MIN_CLICKS_FOR_RATE_INSIGHT ? "high" : "medium",
          metric: "landingPageViewRate",
          value: `${campaign.landingPageViewRate.toFixed(1)}%`,
        });
      }
    }

    // Lead/Sales campaigns: check CPA vs overall
    if ((obj === "OUTCOME_LEADS" || obj === "OUTCOME_SALES") && availability.conversions) {
      if (campaign.costPerConversion != null && overall.costPerConversion != null && overall.costPerConversion > 0) {
        const cpaRatio = campaign.costPerConversion / overall.costPerConversion;
        if (cpaRatio > 1.5 && campaign.spend >= BUDGET_WASTE_SPEND_MIN) {
          insights.push({
            id: nextId(),
            severity: "watch",
            category: "efficiency",
            title: "High cost per result",
            why: `CPA ${fmtAUDShort(campaign.costPerConversion)} is ${((cpaRatio - 1) * 100).toFixed(0)}% above account avg ${fmtAUDShort(overall.costPerConversion)}.`,
            action: "Review ad set targeting and creative performance within this campaign.",
            entityName: campaign.campaignName,
            entityType: "campaign",
            confidence: campaign.conversions != null && campaign.conversions >= 5 ? "high" : "medium",
            metric: "costPerConversion",
            value: fmtAUDShort(campaign.costPerConversion),
          });
        }
      }
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// HALF-PERIOD DELTA HELPER
// ═══════════════════════════════════════════════════════════════════

function computeHalfPeriodDelta(
  records: FBAdRecord[],
  metric: "ctr" | "cpc",
): number | null {
  if (records.length < 4) return null;

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstMetrics = computeOverallMetrics(firstHalf);
  const secondMetrics = computeOverallMetrics(secondHalf);

  const first = firstMetrics[metric];
  const second = secondMetrics[metric];

  return computeDeltaPercent(second, first);
}
