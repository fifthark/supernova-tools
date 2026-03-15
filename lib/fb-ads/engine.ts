// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — COMPUTATION ENGINE
// ═══════════════════════════════════════════════════════════════════
//
// Pure functions. No React, no side effects.
// All division handles zero/null — returns null when undefined.
// Aggregation uses weighted averages (sum components, then derive).
//
// ═══════════════════════════════════════════════════════════════════

import {
  FBAdRecord,
  FBAdsMetrics,
  CampaignSummary,
  AdSetSummary,
  AdSummary,
  CreativeSummary,
  DailyMetrics,
  WeeklyMetrics,
  HeatmapCell,
  DateRange,
  SortField,
  SortDirection,
} from "./types";

// ═══════════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════════════

const audFmt = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const audFmtCompact = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat("en-AU");

export function fmtAUD(n: number): string {
  return n >= 10000 ? audFmtCompact.format(n) : audFmt.format(n);
}

export function fmtPct(n: number | null): string {
  return n != null ? `${n.toFixed(2)}%` : "—";
}

export function fmtNumber(n: number | null): string {
  return n != null ? numFmt.format(Math.round(n)) : "—";
}

export function fmtRoas(n: number | null): string {
  return n != null ? `${n.toFixed(2)}x` : "—";
}

// ═══════════════════════════════════════════════════════════════════
// CORE METRIC COMPUTATION (from raw sums)
// ═══════════════════════════════════════════════════════════════════

interface RawSums {
  spend: number;
  impressions: number;
  reach: number | null;
  linkClicks: number;
  landingPageViews: number | null;
  conversions: number | null;
  conversionValue: number | null;
  threeSecondVideoViews: number | null;
}

function computeMetrics(sums: RawSums): FBAdsMetrics {
  const {
    spend, impressions, reach, linkClicks,
    landingPageViews, conversions, conversionValue,
    threeSecondVideoViews,
  } = sums;

  return {
    spend,
    impressions,
    reach,
    linkClicks,
    landingPageViews,
    conversions,
    conversionValue,
    ctr: impressions > 0 ? (linkClicks / impressions) * 100 : null,
    cpc: linkClicks > 0 ? spend / linkClicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    costPerConversion: conversions != null && conversions > 0 ? spend / conversions : null,
    roas: spend > 0 && conversionValue != null ? conversionValue / spend : null,
    conversionRate: linkClicks > 0 && conversions != null ? (conversions / linkClicks) * 100 : null,
    frequency: reach != null && reach > 0 ? impressions / reach : null,
    landingPageViewRate: linkClicks > 0 && landingPageViews != null ? (landingPageViews / linkClicks) * 100 : null,
    thumbStopRatio: impressions > 0 && threeSecondVideoViews != null
      ? (threeSecondVideoViews / impressions) * 100
      : null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SUM RECORDS (weighted aggregation foundation)
// ═══════════════════════════════════════════════════════════════════

function sumRecords(records: FBAdRecord[]): RawSums {
  let spend = 0;
  let impressions = 0;
  let reach: number | null = null;
  let linkClicks = 0;
  let landingPageViews: number | null = null;
  let conversions: number | null = null;
  let conversionValue: number | null = null;
  let threeSecondVideoViews: number | null = null;

  for (const r of records) {
    spend += r.spend;
    impressions += r.impressions;
    linkClicks += r.linkClicks;

    if (r.reach != null) {
      reach = (reach ?? 0) + r.reach;
    }
    if (r.landingPageViews != null) {
      landingPageViews = (landingPageViews ?? 0) + r.landingPageViews;
    }
    if (r.conversions != null) {
      conversions = (conversions ?? 0) + r.conversions;
    }
    if (r.conversionValue != null) {
      conversionValue = (conversionValue ?? 0) + r.conversionValue;
    }
    if (r.threeSecondVideoViews != null) {
      threeSecondVideoViews = (threeSecondVideoViews ?? 0) + r.threeSecondVideoViews;
    }
  }

  return {
    spend, impressions, reach, linkClicks,
    landingPageViews, conversions, conversionValue,
    threeSecondVideoViews,
  };
}

// ═══════════════════════════════════════════════════════════════════
// OVERALL METRICS
// ═══════════════════════════════════════════════════════════════════

export function computeOverallMetrics(records: FBAdRecord[]): FBAdsMetrics {
  if (records.length === 0) {
    return computeMetrics({
      spend: 0, impressions: 0, reach: null, linkClicks: 0,
      landingPageViews: null, conversions: null, conversionValue: null,
      threeSecondVideoViews: null,
    });
  }
  return computeMetrics(sumRecords(records));
}

// ═══════════════════════════════════════════════════════════════════
// CAMPAIGN AGGREGATION
// ═══════════════════════════════════════════════════════════════════

export function aggregateCampaigns(records: FBAdRecord[]): CampaignSummary[] {
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of records) {
    const key = r.campaignId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([campaignId, recs]) => {
    const metrics = computeMetrics(sumRecords(recs));
    const adSetIds = new Set(recs.map(r => r.adSetId));
    return {
      campaignId,
      campaignName: recs[0].campaignName,
      campaignObjective: recs[0].campaignObjective,
      adSetCount: adSetIds.size,
      ...metrics,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// AD SET AGGREGATION
// ═══════════════════════════════════════════════════════════════════

export function aggregateAdSets(records: FBAdRecord[], campaignId: string): AdSetSummary[] {
  const filtered = records.filter(r => r.campaignId === campaignId);
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of filtered) {
    const key = r.adSetId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([adSetId, recs]) => {
    const metrics = computeMetrics(sumRecords(recs));
    const adIds = new Set(recs.map(r => r.adId));
    return {
      adSetId,
      adSetName: recs[0].adSetName,
      campaignId: recs[0].campaignId,
      campaignName: recs[0].campaignName,
      campaignObjective: recs[0].campaignObjective,
      adCount: adIds.size,
      ...metrics,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// AD AGGREGATION
// ═══════════════════════════════════════════════════════════════════

export function aggregateAds(records: FBAdRecord[], adSetId: string): AdSummary[] {
  const filtered = records.filter(r => r.adSetId === adSetId);
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of filtered) {
    const key = r.adId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([adId, recs]) => {
    const metrics = computeMetrics(sumRecords(recs));
    return {
      adId,
      adName: recs[0].adName,
      adSetId: recs[0].adSetId,
      adSetName: recs[0].adSetName,
      campaignId: recs[0].campaignId,
      campaignName: recs[0].campaignName,
      campaignObjective: recs[0].campaignObjective,
      creativeName: recs[0].creativeName,
      ...metrics,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// CREATIVE PERFORMANCE GROUPING
// ═══════════════════════════════════════════════════════════════════

export function aggregateByCreative(records: FBAdRecord[]): CreativeSummary[] {
  const withCreative = records.filter(r => r.creativeName != null && r.creativeName.trim() !== "");
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of withCreative) {
    const key = r.creativeName!;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([creativeName, recs]) => {
    const metrics = computeMetrics(sumRecords(recs));
    const campaignIds = new Set(recs.map(r => r.campaignId));
    const adIds = new Set(recs.map(r => r.adId));
    return {
      creativeName,
      campaignCount: campaignIds.size,
      adCount: adIds.size,
      ...metrics,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// DATE FILTERING
// ═══════════════════════════════════════════════════════════════════

export function filterByDateRange(records: FBAdRecord[], range: DateRange): FBAdRecord[] {
  return records.filter(r => r.date >= range.start && r.date <= range.end);
}

export function filterByAttributionWindow(records: FBAdRecord[], window: string): FBAdRecord[] {
  return records.filter(r => r.attributionWindow === window || r.attributionWindow == null);
}

// ═══════════════════════════════════════════════════════════════════
// TIME SERIES
// ═══════════════════════════════════════════════════════════════════

export function computeDailyTimeSeries(records: FBAdRecord[]): DailyMetrics[] {
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of records) {
    if (!groups.has(r.date)) groups.set(r.date, []);
    groups.get(r.date)!.push(r);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, recs]) => {
      const sums = sumRecords(recs);
      const m = computeMetrics(sums);
      return {
        date,
        spend: m.spend,
        impressions: m.impressions,
        linkClicks: m.linkClicks,
        ctr: m.ctr,
        cpc: m.cpc,
        cpm: m.cpm,
        conversions: m.conversions,
      };
    });
}

export function computeWeeklyTimeSeries(records: FBAdRecord[]): WeeklyMetrics[] {
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of records) {
    const d = new Date(r.date + "T00:00:00");
    const dayOfWeek = d.getDay();
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);
    const weekKey = startOfWeek.toISOString().slice(0, 10);

    if (!groups.has(weekKey)) groups.set(weekKey, []);
    groups.get(weekKey)!.push(r);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, recs]) => {
      const sums = sumRecords(recs);
      const m = computeMetrics(sums);
      const d = new Date(weekStart + "T00:00:00");
      const weekNum = Math.ceil(d.getDate() / 7);
      const monthName = d.toLocaleString("en-AU", { month: "short" });
      return {
        date: weekStart,
        weekLabel: `W${weekNum} ${monthName}`,
        spend: m.spend,
        impressions: m.impressions,
        linkClicks: m.linkClicks,
        ctr: m.ctr,
        cpc: m.cpc,
        cpm: m.cpm,
        conversions: m.conversions,
      };
    });
}

// ═══════════════════════════════════════════════════════════════════
// HEATMAP
// ═══════════════════════════════════════════════════════════════════

export function hasHourlyData(records: FBAdRecord[]): boolean {
  const uniqueHours = new Set(records.map(r => r.hourOfDay).filter(h => h != null));
  return uniqueHours.size > 1;
}

export function computeHeatmap(records: FBAdRecord[]): HeatmapCell[] {
  const withHours = records.filter(r => r.hourOfDay != null && r.dayOfWeek != null);
  const groups = new Map<string, FBAdRecord[]>();

  for (const r of withHours) {
    const key = `${r.dayOfWeek}-${r.hourOfDay}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([key, recs]) => {
    const [dow, hod] = key.split("-").map(Number);
    const sums = sumRecords(recs);
    const m = computeMetrics(sums);
    return {
      dayOfWeek: dow,
      hourOfDay: hod,
      spend: m.spend,
      ctr: m.ctr,
      cpc: m.cpc,
      impressions: m.impressions,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// SPARKLINE DATA (last 7 days for a specific entity)
// ═══════════════════════════════════════════════════════════════════

export function computeSparkline(
  records: FBAdRecord[],
  entityId: string,
  entityField: "campaignId" | "adSetId" | "adId",
  metric: "spend" | "ctr",
  days: number = 7
): number[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = records.filter(
    r => r[entityField] === entityId && r.date >= cutoffStr
  );

  // Group by date
  const daily = new Map<string, FBAdRecord[]>();
  for (const r of filtered) {
    if (!daily.has(r.date)) daily.set(r.date, []);
    daily.get(r.date)!.push(r);
  }

  // Fill all days in range
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayRecs = daily.get(dateStr) || [];

    if (dayRecs.length === 0) {
      result.push(0);
    } else {
      const sums = sumRecords(dayRecs);
      if (metric === "spend") {
        result.push(sums.spend);
      } else {
        result.push(sums.impressions > 0 ? (sums.linkClicks / sums.impressions) * 100 : 0);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// SORTING
// ═══════════════════════════════════════════════════════════════════

export function sortItems<T extends Record<string, unknown>>(
  items: T[],
  field: SortField,
  direction: SortDirection
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    // null values sort to bottom
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // String comparison
    if (typeof aVal === "string" && typeof bVal === "string") {
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return direction === "asc" ? cmp : -cmp;
    }

    // Numeric comparison
    const numA = Number(aVal) || 0;
    const numB = Number(bVal) || 0;
    return direction === "asc" ? numA - numB : numB - numA;
  });
}

// ═══════════════════════════════════════════════════════════════════
// CONDITIONAL COLOURING
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns "good" | "bad" | "neutral" based on how a metric value
 * compares to the average, accounting for metric direction.
 */
export function getMetricColour(
  value: number | null,
  average: number | null,
  direction: "higher-is-better" | "lower-is-better" | "neutral"
): "good" | "bad" | "neutral" {
  if (value == null || average == null || average === 0 || direction === "neutral") {
    return "neutral";
  }

  const pctDiff = (value - average) / Math.abs(average);

  if (direction === "higher-is-better") {
    if (pctDiff > 0.10) return "good";
    if (pctDiff < -0.10) return "bad";
    return "neutral";
  } else {
    // lower-is-better: below average is good
    if (pctDiff < -0.10) return "good";
    if (pctDiff > 0.10) return "bad";
    return "neutral";
  }
}

// ═══════════════════════════════════════════════════════════════════
// ATTRIBUTION WINDOW HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getUniqueAttributionWindows(records: FBAdRecord[]): string[] {
  const windows = new Set<string>();
  for (const r of records) {
    if (r.attributionWindow != null && r.attributionWindow.trim() !== "") {
      windows.add(r.attributionWindow.trim());
    }
  }
  return Array.from(windows).sort();
}

export function getMostCommonAttributionWindow(records: FBAdRecord[]): string | null {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.attributionWindow != null && r.attributionWindow.trim() !== "") {
      const w = r.attributionWindow.trim();
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  if (counts.size === 0) return null;

  let maxKey: string | null = null;
  let maxCount = 0;
  for (const [key, count] of counts) {
    if (count > maxCount) {
      maxKey = key;
      maxCount = count;
    }
  }
  return maxKey;
}

// ═══════════════════════════════════════════════════════════════════
// OBJECTIVE HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getUniqueObjectives(records: FBAdRecord[]): string[] {
  const objectives = new Set<string>();
  for (const r of records) {
    if (r.campaignObjective != null && r.campaignObjective.trim() !== "") {
      objectives.add(r.campaignObjective.trim());
    }
  }
  return Array.from(objectives).sort();
}

// ═══════════════════════════════════════════════════════════════════
// PREVIOUS-PERIOD COMPARISON (for delta chips)
// ═══════════════════════════════════════════════════════════════════

export interface PeriodDelta {
  metric: string;
  current: number | null;
  previous: number | null;
  changePercent: number | null;  // e.g., +12.5 or -8.3
}

/**
 * Computes delta between current period and an equal-length previous period.
 * e.g., if current = Feb 15–28, previous = Feb 1–14.
 */
export function computePreviousPeriod(
  records: FBAdRecord[],
  dateRange: DateRange
): { previousMetrics: FBAdsMetrics; deltas: Record<string, number | null> } {
  const start = new Date(dateRange.start + "T00:00:00");
  const end = new Date(dateRange.end + "T00:00:00");
  const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Previous period: same length, immediately before current
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - daysDiff + 1);

  const prevRange: DateRange = {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  };

  const prevRecords = filterByDateRange(records, prevRange);
  const previousMetrics = computeOverallMetrics(prevRecords);

  // Compute percent change for key metrics
  const deltaKeys = [
    "spend", "impressions", "linkClicks", "ctr", "cpc", "cpm",
    "conversions", "costPerConversion", "roas", "conversionRate",
    "reach", "frequency", "landingPageViews", "conversionValue",
  ];

  const deltas: Record<string, number | null> = {};
  for (const key of deltaKeys) {
    const curr = (previousMetrics as unknown as Record<string, unknown>)[key];
    const prev = (previousMetrics as unknown as Record<string, unknown>)[key];
    // We actually need current metrics too
    deltas[key] = null;
  }

  return { previousMetrics, deltas };
}

/**
 * Compute delta % between two metric values.
 * Returns null if either value is null or previous is 0.
 */
export function computeDeltaPercent(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ═══════════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════════

export function exportTableAsCSV(
  headers: string[],
  rows: (string | number | null)[][],
  filename: string
): void {
  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row.map(cell => {
        if (cell == null) return "";
        const str = String(cell);
        // Escape commas and quotes
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
