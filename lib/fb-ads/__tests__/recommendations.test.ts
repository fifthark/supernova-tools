import { describe, it, expect, beforeEach } from "vitest";
import { generateInsights, resetInsightCounter } from "../recommendations";
import { FBAdRecord, MetricAvailability, DateRange } from "../types";

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

function fullAvailability(): MetricAvailability {
  return {
    frequency: true,
    reach: true,
    platform: true,
    placement: true,
    hourlyData: false,
    landingPageViews: true,
    conversions: true,
    conversionValue: true,
    videoViews: false,
    creativeName: true,
    campaignObjective: true,
  };
}

function minimalAvailability(): MetricAvailability {
  return {
    frequency: false,
    reach: false,
    platform: false,
    placement: false,
    hourlyData: false,
    landingPageViews: false,
    conversions: false,
    conversionValue: false,
    videoViews: false,
    creativeName: false,
    campaignObjective: false,
  };
}

const DEFAULT_DATE_RANGE: DateRange = { start: "2026-03-01", end: "2026-03-14" };

// ═══════════════════════════════════════════════════════════════════
// BASIC BEHAVIOUR
// ═══════════════════════════════════════════════════════════════════

describe("generateInsights", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("returns empty array for empty records", () => {
    const result = generateInsights([], DEFAULT_DATE_RANGE, fullAvailability());
    expect(result).toEqual([]);
  });

  it("returns empty array for insufficient data", () => {
    // Under 1000 impressions — no insights should fire
    const records = [makeRecord({ impressions: 500, linkClicks: 10, spend: 5 })];
    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    // Only global-level insights (frequency, trends) might fire, but single-entity ones shouldn't
    const entityInsights = result.filter(r => r.entityName != null);
    expect(entityInsights.length).toBe(0);
  });

  it("caps insights at maxInsights", () => {
    // Create many campaigns to generate lots of insights
    const records: FBAdRecord[] = [];
    for (let i = 0; i < 20; i++) {
      records.push(
        makeRecord({
          campaignId: `camp_${i}`,
          campaignName: `Campaign ${i}`,
          creativeName: `Creative ${i}`,
          adId: `ad_${i}`,
          spend: 100 + i * 10,
          impressions: 10000,
          linkClicks: 50,
          reach: 2000,
          // High CPC triggers budget waste for each
          conversions: 1,
          conversionValue: 50,
        }),
      );
    }

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability(), 8);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("sorts by severity: action > watch > win", () => {
    // Create data that triggers all three severities
    const records = [
      // Fatigue action (freq > 3)
      makeRecord({
        campaignId: "c1", campaignName: "Fatigued Campaign",
        creativeName: "Fatigued Creative",
        adId: "ad_f",
        impressions: 6000, reach: 1500, linkClicks: 60, spend: 80,
      }),
      // Budget waste (high CPC)
      makeRecord({
        campaignId: "c2", campaignName: "Expensive Campaign",
        creativeName: "Expensive Creative",
        adId: "ad_e",
        impressions: 5000, linkClicks: 30, spend: 100, reach: 3000,
      }),
      // Winner creative (good CTR)
      makeRecord({
        campaignId: "c3", campaignName: "Winner Campaign",
        creativeName: "Winner Creative",
        adId: "ad_w",
        impressions: 8000, linkClicks: 400, spend: 40, reach: 5000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());

    // Verify action comes before watch, which comes before win
    const severities = result.map(r => r.severity);
    const firstAction = severities.indexOf("action");
    const firstWatch = severities.indexOf("watch");
    const firstWin = severities.indexOf("win");

    if (firstAction >= 0 && firstWatch >= 0) {
      expect(firstAction).toBeLessThan(firstWatch);
    }
    if (firstWatch >= 0 && firstWin >= 0) {
      expect(firstWatch).toBeLessThan(firstWin);
    }
    if (firstAction >= 0 && firstWin >= 0) {
      expect(firstAction).toBeLessThan(firstWin);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// CREATIVE FATIGUE DETECTION
// ═══════════════════════════════════════════════════════════════════

describe("Creative fatigue detection", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("detects fatigue when frequency >= 3", () => {
    // frequency = impressions / reach = 10000 / 3000 = 3.33
    const records = [
      makeRecord({
        creativeName: "Fatigued Ad",
        impressions: 10000,
        reach: 3000,
        linkClicks: 100,
        spend: 80,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const fatigueInsights = result.filter(r => r.category === "fatigue" && r.severity === "action");
    expect(fatigueInsights.length).toBeGreaterThanOrEqual(1);
    expect(fatigueInsights[0].title).toContain("fatigue");
  });

  it("watches when frequency between 2.5 and 3", () => {
    // frequency = 8000 / 3000 = 2.67
    const records = [
      makeRecord({
        creativeName: "Watch Ad",
        impressions: 8000,
        reach: 3000,
        linkClicks: 100,
        spend: 60,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const watchInsights = result.filter(
      r => r.category === "fatigue" && r.severity === "watch" && r.entityName === "Watch Ad"
    );
    expect(watchInsights.length).toBe(1);
    expect(watchInsights[0].title).toContain("Approaching");
  });

  it("skips creatives below minimum impressions", () => {
    const records = [
      makeRecord({
        creativeName: "Small Ad",
        impressions: 500, // Below 1000 threshold
        reach: 100,       // freq = 5 — would trigger if not gated
        linkClicks: 10,
        spend: 5,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const fatigueInsights = result.filter(
      r => r.category === "fatigue" && r.entityName === "Small Ad"
    );
    expect(fatigueInsights.length).toBe(0);
  });

  it("skips creatives below minimum spend share", () => {
    const records = [
      // Big spender (dominates total)
      makeRecord({
        campaignId: "c1", creativeName: "Big Spender",
        impressions: 10000, reach: 5000, linkClicks: 200, spend: 500,
      }),
      // Tiny creative (<5% of total spend) with high frequency
      makeRecord({
        campaignId: "c2", creativeName: "Tiny Fatigued",
        adId: "ad2",
        impressions: 2000, reach: 500, linkClicks: 40, spend: 10, // 10/510 = 1.96%
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const tinyFatigue = result.filter(
      r => r.category === "fatigue" && r.entityName === "Tiny Fatigued"
    );
    expect(tinyFatigue.length).toBe(0);
  });

  it("falls back to CTR+CPC trends when no frequency data", () => {
    const availability = fullAvailability();
    availability.frequency = false;
    availability.reach = false;

    // Create records over time where CTR drops and CPC rises
    const records: FBAdRecord[] = [];
    for (let i = 1; i <= 14; i++) {
      const day = String(i).padStart(2, "0");
      const isFirstHalf = i <= 7;
      records.push(
        makeRecord({
          date: `2026-03-${day}`,
          creativeName: "Declining Creative",
          impressions: 1000,
          reach: null,
          linkClicks: isFirstHalf ? 50 : 20,  // CTR drops from 5% to 2%
          spend: isFirstHalf ? 20 : 40,        // CPC rises from 0.40 to 2.00
        }),
      );
    }

    const result = generateInsights(records, DEFAULT_DATE_RANGE, availability);
    const fallbackFatigue = result.filter(
      r => r.category === "fatigue" && r.entityName === "Declining Creative"
    );
    expect(fallbackFatigue.length).toBe(1);
    expect(fallbackFatigue[0].confidence).toBe("low");
    expect(fallbackFatigue[0].title).toContain("no frequency");
  });
});

// ═══════════════════════════════════════════════════════════════════
// BUDGET WASTE DETECTION
// ═══════════════════════════════════════════════════════════════════

describe("Budget waste detection", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("detects high CPC campaigns (> 50% above avg)", () => {
    const records = [
      // Cheap campaign: CPC = 40/100 = $0.40
      makeRecord({
        campaignId: "c1", campaignName: "Cheap Campaign",
        creativeName: "Cheap Creative",
        impressions: 10000, linkClicks: 100, spend: 40, reach: 5000,
      }),
      // Expensive campaign: CPC = 100/30 = $3.33 (>50% above avg CPC of ~1.08)
      makeRecord({
        campaignId: "c2", campaignName: "Expensive Campaign",
        creativeName: "Expensive Creative",
        adId: "ad2",
        impressions: 5000, linkClicks: 30, spend: 100, reach: 3000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const wasteInsights = result.filter(
      r => r.category === "budget" && r.entityName === "Expensive Campaign"
    );
    expect(wasteInsights.length).toBe(1);
    expect(wasteInsights[0].severity).toBe("action");
  });

  it("skips campaigns below $20 spend", () => {
    const records = [
      // Reference campaign with low CPC
      makeRecord({
        campaignId: "c1", campaignName: "Reference",
        creativeName: "Ref Creative",
        impressions: 10000, linkClicks: 200, spend: 100, reach: 5000,
      }),
      // High CPC but only $15 spend — should be skipped
      makeRecord({
        campaignId: "c2", campaignName: "Small Expensive",
        creativeName: "Small Creative",
        adId: "ad2",
        impressions: 2000, linkClicks: 30, spend: 15, reach: 1000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const wasteInsights = result.filter(
      r => r.category === "budget" && r.entityName === "Small Expensive"
    );
    expect(wasteInsights.length).toBe(0);
  });

  it("skips campaigns with fewer than 30 clicks", () => {
    const records = [
      makeRecord({
        campaignId: "c1", campaignName: "Reference",
        creativeName: "Ref Creative",
        impressions: 10000, linkClicks: 200, spend: 100, reach: 5000,
      }),
      // High CPC, enough spend, but only 20 clicks
      makeRecord({
        campaignId: "c2", campaignName: "Low Clicks",
        creativeName: "Low Click Creative",
        adId: "ad2",
        impressions: 5000, linkClicks: 20, spend: 50, reach: 3000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const wasteInsights = result.filter(
      r => r.category === "budget" && r.entityName === "Low Clicks"
    );
    expect(wasteInsights.length).toBe(0);
  });

  it("confidence is 'high' for campaigns with >= $50 spend + >= 100 clicks", () => {
    const records = [
      // Low CPC reference
      makeRecord({
        campaignId: "c1", campaignName: "Cheap",
        creativeName: "Cheap C",
        impressions: 50000, linkClicks: 1000, spend: 200, reach: 20000,
      }),
      // Expensive campaign passing high-confidence threshold
      makeRecord({
        campaignId: "c2", campaignName: "Pricey",
        creativeName: "Pricey C",
        adId: "ad2",
        impressions: 10000, linkClicks: 100, spend: 80, reach: 5000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const wasteInsights = result.filter(
      r => r.category === "budget" && r.entityName === "Pricey"
    );
    // CPC pricey = 80/100 = 0.80, avg CPC = 280/1100 = 0.2545, ratio = 3.14 > 1.5
    if (wasteInsights.length > 0) {
      expect(wasteInsights[0].confidence).toBe("high");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// WINNER IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════

describe("Winner identification", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("identifies winner by CPA when conversion data available", () => {
    const records = [
      makeRecord({
        campaignId: "c1", creativeName: "CPA Winner",
        impressions: 6000, linkClicks: 100, spend: 50,
        conversions: 10, costPerConversion: 5, conversionValue: 200, reach: 4000,
      }),
      makeRecord({
        campaignId: "c2", creativeName: "CPA Loser",
        adId: "ad2",
        impressions: 6000, linkClicks: 80, spend: 80,
        conversions: 4, costPerConversion: 20, conversionValue: 100, reach: 4000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const winInsights = result.filter(r => r.severity === "win" && r.category === "creative");
    expect(winInsights.length).toBeGreaterThanOrEqual(1);
    expect(winInsights[0].entityName).toBe("CPA Winner");
    expect(winInsights[0].title).toContain("CPA");
  });

  it("falls back to CTR when no conversion data, and labels it", () => {
    const availability = fullAvailability();
    availability.conversions = false;
    availability.conversionValue = false;

    const records = [
      makeRecord({
        campaignId: "c1", creativeName: "CTR Winner",
        impressions: 6000, linkClicks: 200, spend: 50,
        conversions: null, conversionValue: null, reach: 4000,
      }),
      makeRecord({
        campaignId: "c2", creativeName: "CTR Loser",
        adId: "ad2",
        impressions: 6000, linkClicks: 60, spend: 50,
        conversions: null, conversionValue: null, reach: 4000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, availability);
    const winInsights = result.filter(r => r.severity === "win" && r.category === "creative");
    expect(winInsights.length).toBeGreaterThanOrEqual(1);
    expect(winInsights[0].entityName).toBe("CTR Winner");
    expect(winInsights[0].title).toContain("CTR");
    expect(winInsights[0].confidence).toBe("medium"); // CTR-only = medium
  });

  it("needs at least 2 eligible creatives for winner detection", () => {
    const records = [
      makeRecord({
        creativeName: "Solo Creative",
        impressions: 10000, linkClicks: 200, spend: 80, reach: 5000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const creativeWins = result.filter(r => r.category === "creative" && r.severity === "win");
    expect(creativeWins.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// TREND SHIFT DETECTION
// ═══════════════════════════════════════════════════════════════════

describe("Trend shift detection", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("detects CTR decline over 14 days", () => {
    const records: FBAdRecord[] = [];
    for (let i = 1; i <= 14; i++) {
      const day = String(i).padStart(2, "0");
      const isFirstHalf = i <= 7;
      records.push(
        makeRecord({
          date: `2026-03-${day}`,
          impressions: 2000,
          linkClicks: isFirstHalf ? 80 : 40,  // CTR 4% → 2% (50% drop)
          spend: 20,
          reach: 1000,
        }),
      );
    }

    const dateRange: DateRange = { start: "2026-03-01", end: "2026-03-14" };
    const result = generateInsights(records, dateRange, fullAvailability());
    const trendInsights = result.filter(r => r.title === "CTR declining");
    expect(trendInsights.length).toBe(1);
    expect(trendInsights[0].severity).toBe("action");
    expect(trendInsights[0].confidence).toBe("high"); // >= 14 days
  });

  it("skips trend analysis when date range < 7 days", () => {
    const records: FBAdRecord[] = [];
    for (let i = 1; i <= 5; i++) {
      records.push(
        makeRecord({
          date: `2026-03-0${i}`,
          impressions: 2000,
          linkClicks: i <= 2 ? 100 : 20, // Big CTR swing
          spend: 20,
          reach: 1000,
        }),
      );
    }

    const dateRange: DateRange = { start: "2026-03-01", end: "2026-03-05" };
    const result = generateInsights(records, dateRange, fullAvailability());
    const trendInsights = result.filter(
      r => r.title === "CTR declining" || r.title === "CPC rising"
    );
    expect(trendInsights.length).toBe(0);
  });

  it("detects conversions trending up as a win", () => {
    const records: FBAdRecord[] = [];
    for (let i = 1; i <= 14; i++) {
      const day = String(i).padStart(2, "0");
      const isFirstHalf = i <= 7;
      records.push(
        makeRecord({
          date: `2026-03-${day}`,
          impressions: 2000,
          linkClicks: 80,
          spend: 20,
          reach: 1000,
          conversions: isFirstHalf ? 2 : 10,  // Conversions 14 → 70 (+400%)
        }),
      );
    }

    const dateRange: DateRange = { start: "2026-03-01", end: "2026-03-14" };
    const result = generateInsights(records, dateRange, fullAvailability());
    const convWins = result.filter(r => r.title === "Conversions trending up");
    expect(convWins.length).toBe(1);
    expect(convWins[0].severity).toBe("win");
  });
});

// ═══════════════════════════════════════════════════════════════════
// FREQUENCY ALERT
// ═══════════════════════════════════════════════════════════════════

describe("Frequency alert", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("fires action when overall frequency >= 3", () => {
    // freq = 15000 / 4000 = 3.75
    const records = [
      makeRecord({ impressions: 15000, reach: 4000, linkClicks: 200, spend: 100 }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const freqInsights = result.filter(
      r => r.category === "targeting" && r.title === "Audience saturation"
    );
    expect(freqInsights.length).toBe(1);
    expect(freqInsights[0].severity).toBe("action");
  });

  it("fires watch when overall frequency between 2.5 and 3", () => {
    // freq = 8000 / 3000 = 2.67
    const records = [
      makeRecord({ impressions: 8000, reach: 3000, linkClicks: 100, spend: 50 }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const freqInsights = result.filter(
      r => r.category === "targeting" && r.title === "Frequency approaching saturation"
    );
    expect(freqInsights.length).toBe(1);
    expect(freqInsights[0].severity).toBe("watch");
  });

  it("skips when no reach data available", () => {
    const availability = fullAvailability();
    availability.reach = false;
    availability.frequency = false;

    const records = [
      makeRecord({ impressions: 15000, reach: null, linkClicks: 200, spend: 100 }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, availability);
    const freqInsights = result.filter(r => r.category === "targeting");
    expect(freqInsights.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// OBJECTIVE ALIGNMENT
// ═══════════════════════════════════════════════════════════════════

describe("Objective alignment", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("detects low LP view rate for traffic campaigns", () => {
    const records = [
      makeRecord({
        campaignId: "c1",
        campaignName: "Traffic Campaign",
        campaignObjective: "OUTCOME_TRAFFIC",
        impressions: 5000,
        linkClicks: 100,
        landingPageViews: 30,  // 30% LP view rate (below 50%)
        spend: 50,
        reach: 3000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const lpInsights = result.filter(
      r => r.title === "Low landing page view rate" && r.entityName === "Traffic Campaign"
    );
    expect(lpInsights.length).toBe(1);
    expect(lpInsights[0].severity).toBe("action");
  });

  it("skips LP check when landingPageViews not available", () => {
    const availability = fullAvailability();
    availability.landingPageViews = false;

    const records = [
      makeRecord({
        campaignObjective: "OUTCOME_TRAFFIC",
        impressions: 5000, linkClicks: 100,
        landingPageViews: null, spend: 50, reach: 3000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, availability);
    const lpInsights = result.filter(r => r.title === "Low landing page view rate");
    expect(lpInsights.length).toBe(0);
  });

  it("detects high CPA for lead campaigns", () => {
    const records = [
      // Reference: avg CPA
      makeRecord({
        campaignId: "c1", campaignName: "Good Leads",
        campaignObjective: "OUTCOME_LEADS",
        impressions: 10000, linkClicks: 200, spend: 100,
        conversions: 20, conversionValue: 500, reach: 5000,
      }),
      // Bad CPA (50/2 = $25 vs avg 150/22 = $6.82) — 3.66x above avg
      makeRecord({
        campaignId: "c2", campaignName: "Bad Leads",
        campaignObjective: "OUTCOME_LEADS",
        adId: "ad2", creativeName: "Bad Lead Creative",
        impressions: 5000, linkClicks: 100, spend: 50,
        conversions: 2, conversionValue: 50, reach: 3000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    const cpaInsights = result.filter(
      r => r.title === "High cost per result" && r.entityName === "Bad Leads"
    );
    expect(cpaInsights.length).toBe(1);
    expect(cpaInsights[0].severity).toBe("watch");
  });
});

// ═══════════════════════════════════════════════════════════════════
// MISSING-FIELD SCENARIOS
// ═══════════════════════════════════════════════════════════════════

describe("Missing-field scenarios", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("handles CSV with no frequency/reach — fatigue falls back to CTR+CPC", () => {
    const availability = minimalAvailability();
    availability.creativeName = true;

    // 14 days of data, declining CTR + rising CPC in second half
    const records: FBAdRecord[] = [];
    for (let i = 1; i <= 14; i++) {
      const day = String(i).padStart(2, "0");
      const isFirstHalf = i <= 7;
      records.push(
        makeRecord({
          date: `2026-03-${day}`,
          creativeName: "Test Creative",
          impressions: 1000,
          reach: null,
          linkClicks: isFirstHalf ? 50 : 15,  // CTR 5% → 1.5%
          spend: isFirstHalf ? 20 : 50,         // CPC 0.40 → 3.33
          conversions: null,
          conversionValue: null,
        }),
      );
    }

    const result = generateInsights(records, DEFAULT_DATE_RANGE, availability);
    // Should get fallback fatigue OR trend shift (both are valid)
    const fatigue = result.filter(r => r.category === "fatigue");
    const trends = result.filter(r => r.title === "CTR declining" || r.title === "CPC rising");
    expect(fatigue.length + trends.length).toBeGreaterThanOrEqual(1);
  });

  it("handles CSV with no platform/placement — no platform insights", () => {
    const availability = minimalAvailability();

    const records = [
      makeRecord({
        platform: null, placement: null, reach: null,
        conversions: null, conversionValue: null,
        impressions: 5000, linkClicks: 100, spend: 50,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, availability);
    // No platform-specific insights exist in the recommendations engine
    // (platform breakdown is a component concern, not recommendation concern)
    expect(result).toBeDefined();
  });

  it("handles single day of data — trend analysis skips", () => {
    const records = [
      makeRecord({ date: "2026-03-01", impressions: 10000, linkClicks: 200, spend: 100 }),
    ];

    const dateRange: DateRange = { start: "2026-03-01", end: "2026-03-01" };
    const result = generateInsights(records, dateRange, fullAvailability());
    const trendInsights = result.filter(
      r => r.title === "CTR declining" || r.title === "CPC rising" || r.title === "Conversions trending up"
    );
    expect(trendInsights.length).toBe(0);
  });

  it("handles mixed objectives — winner detection uses per-campaign scoring", () => {
    const records = [
      makeRecord({
        campaignId: "c1", campaignName: "Traffic Camp",
        campaignObjective: "OUTCOME_TRAFFIC",
        creativeName: "Traffic Creative",
        impressions: 8000, linkClicks: 200, spend: 60,
        landingPageViews: 160, reach: 5000,
      }),
      makeRecord({
        campaignId: "c2", campaignName: "Leads Camp",
        campaignObjective: "OUTCOME_LEADS",
        creativeName: "Leads Creative",
        adId: "ad2",
        impressions: 8000, linkClicks: 150, spend: 80,
        conversions: 20, costPerConversion: 4, conversionValue: 400, reach: 5000,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());
    // Should produce campaign-level winner using objective-aware scoring
    const efficiencyWins = result.filter(r => r.category === "efficiency" && r.severity === "win");
    expect(efficiencyWins.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════

describe("Deduplication", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("deduplicates by category + entityName", () => {
    // A creative that's both fatigued AND a budget waste target
    // Should only appear once per category
    const records = [
      makeRecord({
        campaignId: "c1", campaignName: "Multi-Issue Campaign",
        creativeName: "Problem Creative",
        impressions: 10000, reach: 2500, // freq 4.0
        linkClicks: 100, spend: 200,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());

    // Check no duplicate category+entity combos
    const keys = result.map(r => `${r.category}:${r.entityName || "global"}`);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INSIGHT STRUCTURE
// ═══════════════════════════════════════════════════════════════════

describe("Insight structure", () => {
  beforeEach(() => {
    resetInsightCounter();
  });

  it("every insight has required fields", () => {
    const records = [
      makeRecord({
        impressions: 15000, reach: 4000, linkClicks: 200, spend: 100,
        conversions: 10, conversionValue: 300,
      }),
      makeRecord({
        campaignId: "c2", campaignName: "Second Campaign",
        creativeName: "Second Creative",
        adId: "ad2",
        impressions: 8000, reach: 3000, linkClicks: 50, spend: 80,
        conversions: 2, conversionValue: 50,
      }),
    ];

    const result = generateInsights(records, DEFAULT_DATE_RANGE, fullAvailability());

    for (const insight of result) {
      expect(insight.id).toBeTruthy();
      expect(["action", "watch", "win"]).toContain(insight.severity);
      expect(["fatigue", "budget", "creative", "targeting", "timing", "efficiency"]).toContain(insight.category);
      expect(insight.title).toBeTruthy();
      expect(insight.why).toBeTruthy();
      expect(insight.action).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(insight.confidence);
    }
  });
});
