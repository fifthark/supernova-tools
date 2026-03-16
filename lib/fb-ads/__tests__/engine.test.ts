import { describe, it, expect } from "vitest";
import {
  computeOverallMetrics,
  aggregateCampaigns,
  aggregateAdSets,
  aggregateAds,
  aggregateByCreative,
  filterByDateRange,
  computeDailyTimeSeries,
  computeWeeklyTimeSeries,
  hasHourlyData,
  computeHeatmap,
  sortItems,
  getMetricColour,
  getUniqueAttributionWindows,
  getMostCommonAttributionWindow,
  fmtAUD,
  fmtPct,
  fmtNumber,
  fmtRoas,
  computeDeltaPercent,
  buildMetricAvailability,
  aggregateByPlatform,
  aggregateByPlacement,
} from "../engine";
import { FBAdRecord } from "../types";

// ═══════════════════════════════════════════════════════════════════
// TEST DATA FACTORY
// ═══════════════════════════════════════════════════════════════════

function makeRecord(overrides: Partial<FBAdRecord> = {}): FBAdRecord {
  return {
    date: "2026-03-01",
    campaignId: "camp_1",
    campaignName: "Squad Tournament",
    campaignObjective: "OUTCOME_TRAFFIC",
    adSetId: "as_1",
    adSetName: "Broad 18-35",
    adId: "ad_1",
    adName: "Celebration Photo v1",
    creativeName: "Celebration Photo",
    spend: 50,
    impressions: 5000,
    reach: 3000,
    linkClicks: 100,
    landingPageViews: 80,
    conversions: 5,
    conversionValue: 150,
    cpmRaw: 10,
    attributionWindow: "7d_click",
    threeSecondVideoViews: null,
    platform: "Facebook",
    placement: "Feed",
    hourOfDay: null,
    dayOfWeek: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════════

describe("Formatting helpers", () => {
  it("fmtAUD formats currency", () => {
    expect(fmtAUD(1234.56)).toContain("1,234.56");
    expect(fmtAUD(0)).toContain("0");
  });

  it("fmtPct handles null", () => {
    expect(fmtPct(null)).toBe("—");
    expect(fmtPct(12.345)).toBe("12.35%");
  });

  it("fmtNumber handles null", () => {
    expect(fmtNumber(null)).toBe("—");
    expect(fmtNumber(1234)).toContain("1,234");
  });

  it("fmtRoas handles null", () => {
    expect(fmtRoas(null)).toBe("—");
    expect(fmtRoas(3.456)).toBe("3.46x");
  });
});

// ═══════════════════════════════════════════════════════════════════
// OVERALL METRICS
// ═══════════════════════════════════════════════════════════════════

describe("computeOverallMetrics", () => {
  it("returns zeroed metrics for empty records", () => {
    const m = computeOverallMetrics([]);
    expect(m.spend).toBe(0);
    expect(m.impressions).toBe(0);
    expect(m.ctr).toBeNull();
    expect(m.cpc).toBeNull();
    expect(m.roas).toBeNull();
  });

  it("computes weighted metrics correctly", () => {
    const records = [
      makeRecord({ spend: 100, impressions: 10000, linkClicks: 200, conversions: 10, conversionValue: 500 }),
      makeRecord({ spend: 50, impressions: 2000, linkClicks: 50, conversions: 5, conversionValue: 200 }),
    ];
    const m = computeOverallMetrics(records);

    // Spend: 100 + 50 = 150
    expect(m.spend).toBe(150);
    // Impressions: 10000 + 2000 = 12000
    expect(m.impressions).toBe(12000);
    // CTR: (200 + 50) / (10000 + 2000) * 100 = 2.0833...
    expect(m.ctr).toBeCloseTo(2.083, 2);
    // CPC: 150 / 250 = 0.60
    expect(m.cpc).toBeCloseTo(0.6, 2);
    // CPM: (150 / 12000) * 1000 = 12.50
    expect(m.cpm).toBeCloseTo(12.5, 2);
    // ROAS: 700 / 150 = 4.666...
    expect(m.roas).toBeCloseTo(4.667, 2);
    // Cost per conversion: 150 / 15 = 10.00
    expect(m.costPerConversion).toBeCloseTo(10, 2);
  });

  it("uses weighted averages NOT simple averages", () => {
    // Campaign A: 1000 impressions, 100 clicks (10% CTR)
    // Campaign B: 9000 impressions, 90 clicks (1% CTR)
    // Simple average CTR = (10 + 1) / 2 = 5.5%
    // Weighted CTR = 190 / 10000 = 1.9% ← correct answer
    const records = [
      makeRecord({ impressions: 1000, linkClicks: 100 }),
      makeRecord({ impressions: 9000, linkClicks: 90 }),
    ];
    const m = computeOverallMetrics(records);
    expect(m.ctr).toBeCloseTo(1.9, 2);  // NOT 5.5
  });

  it("handles zero impressions (CTR = null)", () => {
    const records = [makeRecord({ impressions: 0, linkClicks: 0 })];
    const m = computeOverallMetrics(records);
    expect(m.ctr).toBeNull();
    expect(m.cpm).toBeNull();
  });

  it("handles zero clicks (CPC = null)", () => {
    const records = [makeRecord({ linkClicks: 0, spend: 10 })];
    const m = computeOverallMetrics(records);
    expect(m.cpc).toBeNull();
    expect(m.conversionRate).toBeNull();
  });

  it("handles zero spend (ROAS = null)", () => {
    const records = [makeRecord({ spend: 0, conversionValue: 100 })];
    const m = computeOverallMetrics(records);
    expect(m.roas).toBeNull();
  });

  it("handles null conversions", () => {
    const records = [makeRecord({ conversions: null, conversionValue: null })];
    const m = computeOverallMetrics(records);
    expect(m.conversions).toBeNull();
    expect(m.costPerConversion).toBeNull();
    expect(m.conversionRate).toBeNull();
    expect(m.roas).toBeNull();
  });

  it("handles null reach (frequency = null)", () => {
    const records = [makeRecord({ reach: null })];
    const m = computeOverallMetrics(records);
    expect(m.frequency).toBeNull();
  });

  it("computes frequency correctly", () => {
    const records = [makeRecord({ impressions: 10000, reach: 4000 })];
    const m = computeOverallMetrics(records);
    expect(m.frequency).toBeCloseTo(2.5, 2);
  });

  it("computes thumbStopRatio when video data present", () => {
    const records = [makeRecord({ impressions: 10000, threeSecondVideoViews: 3000 })];
    const m = computeOverallMetrics(records);
    expect(m.thumbStopRatio).toBeCloseTo(30, 2);
  });

  it("thumbStopRatio is null when no video data", () => {
    const records = [makeRecord({ threeSecondVideoViews: null })];
    const m = computeOverallMetrics(records);
    expect(m.thumbStopRatio).toBeNull();
  });

  it("excludes null values from sums (not treated as 0)", () => {
    const records = [
      makeRecord({ conversions: 5 }),
      makeRecord({ conversions: null }),
      makeRecord({ conversions: 3 }),
    ];
    const m = computeOverallMetrics(records);
    // Should be 5 + 3 = 8, not 5 + 0 + 3 (null excluded but sum is still correct)
    expect(m.conversions).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CAMPAIGN AGGREGATION
// ═══════════════════════════════════════════════════════════════════

describe("aggregateCampaigns", () => {
  it("groups by campaign ID", () => {
    const records = [
      makeRecord({ campaignId: "c1", campaignName: "Camp 1", adSetId: "as1" }),
      makeRecord({ campaignId: "c1", campaignName: "Camp 1", adSetId: "as2" }),
      makeRecord({ campaignId: "c2", campaignName: "Camp 2", adSetId: "as3" }),
    ];
    const campaigns = aggregateCampaigns(records);
    expect(campaigns).toHaveLength(2);

    const c1 = campaigns.find(c => c.campaignId === "c1")!;
    expect(c1.campaignName).toBe("Camp 1");
    expect(c1.adSetCount).toBe(2);
    expect(c1.spend).toBe(100);  // 50 + 50

    const c2 = campaigns.find(c => c.campaignId === "c2")!;
    expect(c2.adSetCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AD SET AGGREGATION
// ═══════════════════════════════════════════════════════════════════

describe("aggregateAdSets", () => {
  it("filters to specific campaign", () => {
    const records = [
      makeRecord({ campaignId: "c1", adSetId: "as1", adId: "ad1" }),
      makeRecord({ campaignId: "c1", adSetId: "as1", adId: "ad2" }),
      makeRecord({ campaignId: "c2", adSetId: "as2", adId: "ad3" }),
    ];
    const adSets = aggregateAdSets(records, "c1");
    expect(adSets).toHaveLength(1);
    expect(adSets[0].adSetId).toBe("as1");
    expect(adSets[0].adCount).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AD AGGREGATION
// ═══════════════════════════════════════════════════════════════════

describe("aggregateAds", () => {
  it("filters to specific ad set", () => {
    const records = [
      makeRecord({ adSetId: "as1", adId: "ad1", date: "2026-03-01" }),
      makeRecord({ adSetId: "as1", adId: "ad1", date: "2026-03-02" }),
      makeRecord({ adSetId: "as2", adId: "ad2" }),
    ];
    const ads = aggregateAds(records, "as1");
    expect(ads).toHaveLength(1);
    expect(ads[0].adId).toBe("ad1");
    expect(ads[0].spend).toBe(100);  // 50 + 50
  });
});

// ═══════════════════════════════════════════════════════════════════
// CREATIVE GROUPING
// ═══════════════════════════════════════════════════════════════════

describe("aggregateByCreative", () => {
  it("groups across campaigns by creative name", () => {
    const records = [
      makeRecord({ campaignId: "c1", adId: "ad1", creativeName: "Celebration Photo", spend: 100 }),
      makeRecord({ campaignId: "c2", adId: "ad2", creativeName: "Celebration Photo", spend: 200 }),
      makeRecord({ campaignId: "c1", adId: "ad3", creativeName: "Squad Standing", spend: 150 }),
    ];
    const creatives = aggregateByCreative(records);
    expect(creatives).toHaveLength(2);

    const celebration = creatives.find(c => c.creativeName === "Celebration Photo")!;
    expect(celebration.spend).toBe(300);
    expect(celebration.campaignCount).toBe(2);
    expect(celebration.adCount).toBe(2);
  });

  it("skips records with null/empty creative name", () => {
    const records = [
      makeRecord({ creativeName: "Photo A", spend: 100 }),
      makeRecord({ creativeName: null, spend: 200 }),
      makeRecord({ creativeName: "", spend: 300 }),
    ];
    const creatives = aggregateByCreative(records);
    expect(creatives).toHaveLength(1);
    expect(creatives[0].spend).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════
// DATE FILTERING
// ═══════════════════════════════════════════════════════════════════

describe("filterByDateRange", () => {
  it("includes boundary dates", () => {
    const records = [
      makeRecord({ date: "2026-02-28" }),
      makeRecord({ date: "2026-03-01" }),
      makeRecord({ date: "2026-03-05" }),
      makeRecord({ date: "2026-03-06" }),
    ];
    const filtered = filterByDateRange(records, { start: "2026-03-01", end: "2026-03-05" });
    expect(filtered).toHaveLength(2);
    expect(filtered[0].date).toBe("2026-03-01");
    expect(filtered[1].date).toBe("2026-03-05");
  });
});

// ═══════════════════════════════════════════════════════════════════
// TIME SERIES
// ═══════════════════════════════════════════════════════════════════

describe("computeDailyTimeSeries", () => {
  it("groups by date and sorts chronologically", () => {
    const records = [
      makeRecord({ date: "2026-03-02", spend: 30 }),
      makeRecord({ date: "2026-03-01", spend: 50 }),
      makeRecord({ date: "2026-03-01", spend: 20 }),
    ];
    const daily = computeDailyTimeSeries(records);
    expect(daily).toHaveLength(2);
    expect(daily[0].date).toBe("2026-03-01");
    expect(daily[0].spend).toBe(70);  // 50 + 20
    expect(daily[1].date).toBe("2026-03-02");
    expect(daily[1].spend).toBe(30);
  });
});

describe("computeWeeklyTimeSeries", () => {
  it("groups into weekly buckets", () => {
    const records = [
      makeRecord({ date: "2026-03-01", spend: 10 }),  // Sunday
      makeRecord({ date: "2026-03-02", spend: 20 }),  // Monday (same week)
      makeRecord({ date: "2026-03-08", spend: 30 }),  // Next Sunday
    ];
    const weekly = computeWeeklyTimeSeries(records);
    expect(weekly).toHaveLength(2);
    expect(weekly[0].spend).toBe(30);   // Mar 1 + Mar 2
    expect(weekly[1].spend).toBe(30);   // Mar 8
  });
});

// ═══════════════════════════════════════════════════════════════════
// HEATMAP
// ═══════════════════════════════════════════════════════════════════

describe("hasHourlyData", () => {
  it("returns false when no hourly data", () => {
    const records = [makeRecord({ hourOfDay: null })];
    expect(hasHourlyData(records)).toBe(false);
  });

  it("returns false when all same hour", () => {
    const records = [
      makeRecord({ hourOfDay: 10 }),
      makeRecord({ hourOfDay: 10 }),
    ];
    expect(hasHourlyData(records)).toBe(false);
  });

  it("returns true when multiple hours", () => {
    const records = [
      makeRecord({ hourOfDay: 10 }),
      makeRecord({ hourOfDay: 14 }),
    ];
    expect(hasHourlyData(records)).toBe(true);
  });
});

describe("computeHeatmap", () => {
  it("groups by day-of-week and hour-of-day", () => {
    const records = [
      makeRecord({ dayOfWeek: 1, hourOfDay: 10, spend: 20 }),
      makeRecord({ dayOfWeek: 1, hourOfDay: 10, spend: 30 }),
      makeRecord({ dayOfWeek: 2, hourOfDay: 14, spend: 10 }),
    ];
    const heatmap = computeHeatmap(records);
    expect(heatmap).toHaveLength(2);

    const mon10 = heatmap.find(h => h.dayOfWeek === 1 && h.hourOfDay === 10)!;
    expect(mon10.spend).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// SORTING
// ═══════════════════════════════════════════════════════════════════

describe("sortItems", () => {
  it("sorts by numeric field ascending", () => {
    const items = [
      { spend: 100, campaignName: "B" },
      { spend: 50, campaignName: "A" },
    ];
    const sorted = sortItems(items, "spend" as any, "asc");
    expect(sorted[0].spend).toBe(50);
    expect(sorted[1].spend).toBe(100);
  });

  it("sorts by string field descending", () => {
    const items = [
      { spend: 100, campaignName: "Alpha" },
      { spend: 50, campaignName: "Zulu" },
    ];
    const sorted = sortItems(items, "campaignName" as any, "desc");
    expect(sorted[0].campaignName).toBe("Zulu");
  });

  it("null values sort to bottom", () => {
    const items = [
      { cpc: null, campaignName: "A" },
      { cpc: 1.5, campaignName: "B" },
      { cpc: 0.8, campaignName: "C" },
    ];
    const sorted = sortItems(items, "cpc" as any, "asc");
    expect(sorted[2].cpc).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// CONDITIONAL COLOURING
// ═══════════════════════════════════════════════════════════════════

describe("getMetricColour", () => {
  it("returns good when higher-is-better and > 10% above average", () => {
    expect(getMetricColour(2.5, 2.0, "higher-is-better")).toBe("good");
  });

  it("returns bad when higher-is-better and > 10% below average", () => {
    expect(getMetricColour(1.5, 2.0, "higher-is-better")).toBe("bad");
  });

  it("returns good when lower-is-better and > 10% below average", () => {
    expect(getMetricColour(0.8, 1.0, "lower-is-better")).toBe("good");
  });

  it("returns bad when lower-is-better and > 10% above average", () => {
    expect(getMetricColour(1.2, 1.0, "lower-is-better")).toBe("bad");
  });

  it("returns neutral within ±10%", () => {
    expect(getMetricColour(1.05, 1.0, "higher-is-better")).toBe("neutral");
  });

  it("returns neutral for null values", () => {
    expect(getMetricColour(null, 1.0, "higher-is-better")).toBe("neutral");
    expect(getMetricColour(1.0, null, "higher-is-better")).toBe("neutral");
  });

  it("returns neutral for neutral direction", () => {
    expect(getMetricColour(100, 50, "neutral")).toBe("neutral");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ATTRIBUTION WINDOW HELPERS
// ═══════════════════════════════════════════════════════════════════

describe("getUniqueAttributionWindows", () => {
  it("returns unique windows sorted", () => {
    const records = [
      makeRecord({ attributionWindow: "7d_click" }),
      makeRecord({ attributionWindow: "1d_click" }),
      makeRecord({ attributionWindow: "7d_click" }),
      makeRecord({ attributionWindow: null }),
    ];
    const windows = getUniqueAttributionWindows(records);
    expect(windows).toEqual(["1d_click", "7d_click"]);
  });
});

describe("getMostCommonAttributionWindow", () => {
  it("returns the most frequent window", () => {
    const records = [
      makeRecord({ attributionWindow: "7d_click" }),
      makeRecord({ attributionWindow: "7d_click" }),
      makeRecord({ attributionWindow: "1d_click" }),
    ];
    expect(getMostCommonAttributionWindow(records)).toBe("7d_click");
  });

  it("returns null when no windows", () => {
    const records = [makeRecord({ attributionWindow: null })];
    expect(getMostCommonAttributionWindow(records)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// DELTA PERCENT
// ═══════════════════════════════════════════════════════════════════

describe("computeDeltaPercent", () => {
  it("computes positive delta", () => {
    // (120 - 100) / 100 * 100 = 20%
    expect(computeDeltaPercent(120, 100)).toBeCloseTo(20, 2);
  });

  it("computes negative delta", () => {
    // (80 - 100) / 100 * 100 = -20%
    expect(computeDeltaPercent(80, 100)).toBeCloseTo(-20, 2);
  });

  it("returns null when previous is 0", () => {
    expect(computeDeltaPercent(100, 0)).toBeNull();
  });

  it("returns null when either value is null", () => {
    expect(computeDeltaPercent(null, 100)).toBeNull();
    expect(computeDeltaPercent(100, null)).toBeNull();
    expect(computeDeltaPercent(null, null)).toBeNull();
  });

  it("uses abs(previous) in denominator for negative previous", () => {
    // (10 - (-5)) / |−5| * 100 = 300%
    expect(computeDeltaPercent(10, -5)).toBeCloseTo(300, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// METRIC AVAILABILITY
// ═══════════════════════════════════════════════════════════════════

describe("buildMetricAvailability", () => {
  it("detects all available metrics", () => {
    const records = [
      makeRecord({
        reach: 3000,
        platform: "Facebook",
        placement: "Feed",
        landingPageViews: 80,
        conversions: 5,
        conversionValue: 150,
        threeSecondVideoViews: 1000,
        creativeName: "Test Creative",
        campaignObjective: "OUTCOME_TRAFFIC",
        hourOfDay: 10,
      }),
      makeRecord({
        hourOfDay: 14, // Different hour to trigger hourlyData
      }),
    ];

    const avail = buildMetricAvailability(records);
    expect(avail.reach).toBe(true);
    expect(avail.frequency).toBe(true);
    expect(avail.platform).toBe(true);
    expect(avail.placement).toBe(true);
    expect(avail.landingPageViews).toBe(true);
    expect(avail.conversions).toBe(true);
    expect(avail.conversionValue).toBe(true);
    expect(avail.videoViews).toBe(true);
    expect(avail.creativeName).toBe(true);
    expect(avail.campaignObjective).toBe(true);
    expect(avail.hourlyData).toBe(true);
  });

  it("reports false for missing fields", () => {
    const records = [
      makeRecord({
        reach: null,
        platform: null,
        placement: null,
        landingPageViews: null,
        conversions: null,
        conversionValue: null,
        threeSecondVideoViews: null,
        creativeName: null,
        campaignObjective: null,
        hourOfDay: null,
      }),
    ];

    const avail = buildMetricAvailability(records);
    expect(avail.reach).toBe(false);
    expect(avail.frequency).toBe(false);
    expect(avail.platform).toBe(false);
    expect(avail.placement).toBe(false);
    expect(avail.landingPageViews).toBe(false);
    expect(avail.conversions).toBe(false);
    expect(avail.conversionValue).toBe(false);
    expect(avail.videoViews).toBe(false);
    expect(avail.creativeName).toBe(false);
    expect(avail.campaignObjective).toBe(false);
    expect(avail.hourlyData).toBe(false);
  });

  it("returns all false for empty records", () => {
    const avail = buildMetricAvailability([]);
    expect(avail.reach).toBe(false);
    expect(avail.frequency).toBe(false);
    expect(avail.hourlyData).toBe(false);
  });

  it("hourlyData requires at least 2 different hours", () => {
    const records = [
      makeRecord({ hourOfDay: 10 }),
      makeRecord({ hourOfDay: 10 }),  // Same hour
    ];

    const avail = buildMetricAvailability(records);
    expect(avail.hourlyData).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PLATFORM AGGREGATION
// ═══════════════════════════════════════════════════════════════════

describe("aggregateByPlatform", () => {
  it("groups records by platform", () => {
    const records = [
      makeRecord({ platform: "Facebook", spend: 100, impressions: 5000 }),
      makeRecord({ platform: "Facebook", spend: 50, impressions: 3000 }),
      makeRecord({ platform: "Instagram", spend: 80, impressions: 4000 }),
    ];

    const platforms = aggregateByPlatform(records);
    expect(platforms).toHaveLength(2);

    const fb = platforms.find(p => p.platform === "Facebook")!;
    expect(fb.spend).toBe(150);
    expect(fb.impressions).toBe(8000);
    expect(fb.recordCount).toBe(2);

    const ig = platforms.find(p => p.platform === "Instagram")!;
    expect(ig.spend).toBe(80);
    expect(ig.recordCount).toBe(1);
  });

  it("groups null platforms as 'Unknown'", () => {
    const records = [
      makeRecord({ platform: null, spend: 50 }),
      makeRecord({ platform: "", spend: 30 }),
      makeRecord({ platform: "Facebook", spend: 100 }),
    ];

    const platforms = aggregateByPlatform(records);
    const unknown = platforms.find(p => p.platform === "Unknown");
    expect(unknown).toBeDefined();
    expect(unknown!.spend).toBe(80);
    expect(unknown!.recordCount).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PLACEMENT AGGREGATION
// ═══════════════════════════════════════════════════════════════════

describe("aggregateByPlacement", () => {
  it("groups records by placement", () => {
    const records = [
      makeRecord({ placement: "Feed", spend: 100 }),
      makeRecord({ placement: "Feed", spend: 50 }),
      makeRecord({ placement: "Story", spend: 80 }),
      makeRecord({ placement: "Reels", spend: 40 }),
    ];

    const placements = aggregateByPlacement(records);
    expect(placements).toHaveLength(3);

    const feed = placements.find(p => p.placement === "Feed")!;
    expect(feed.spend).toBe(150);
    expect(feed.recordCount).toBe(2);
  });

  it("groups null placements as 'Unknown'", () => {
    const records = [
      makeRecord({ placement: null, spend: 50 }),
      makeRecord({ placement: "Feed", spend: 100 }),
    ];

    const placements = aggregateByPlacement(records);
    const unknown = placements.find(p => p.placement === "Unknown");
    expect(unknown).toBeDefined();
    expect(unknown!.spend).toBe(50);
  });
});
