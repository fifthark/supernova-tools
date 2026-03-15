import { describe, it, expect } from "vitest";
import { parseCSV, normaliseDate, deriveDayOfWeek } from "../csv-parser";

// ═══════════════════════════════════════════════════════════════════
// DATE NORMALISATION
// ═══════════════════════════════════════════════════════════════════

describe("normaliseDate", () => {
  it("passes through YYYY-MM-DD", () => {
    expect(normaliseDate("2026-03-01")).toBe("2026-03-01");
  });

  it("extracts date from ISO 8601", () => {
    expect(normaliseDate("2026-03-01T10:30:00Z")).toBe("2026-03-01");
    expect(normaliseDate("2026-03-01T10:30:00+11:00")).toBe("2026-03-01");
  });

  it("parses DD/MM/YYYY (Australian format)", () => {
    expect(normaliseDate("15/03/2026")).toBe("2026-03-15");
    expect(normaliseDate("1/3/2026")).toBe("2026-03-01");
  });

  it("handles ambiguous dates as DD/MM/YYYY", () => {
    // 05/03/2026 — ambiguous. Australian convention = 5th March
    expect(normaliseDate("05/03/2026")).toBe("2026-03-05");
  });

  it("detects MM/DD/YYYY when day > 12", () => {
    // 03/15/2026 — first part ≤ 12, second part > 12, so MM/DD/YYYY
    expect(normaliseDate("03/15/2026")).toBe("2026-03-15");
  });

  it("handles DD-MM-YYYY with dashes", () => {
    expect(normaliseDate("15-03-2026")).toBe("2026-03-15");
  });

  it("returns Invalid for empty/null", () => {
    expect(normaliseDate("")).toBe("Invalid");
    expect(normaliseDate(null as any)).toBe("Invalid");
  });

  it("returns Invalid for garbage", () => {
    expect(normaliseDate("not a date")).toBe("Invalid");
    expect(normaliseDate("abc/def/ghij")).toBe("Invalid");
  });
});

describe("deriveDayOfWeek", () => {
  it("derives Sunday = 0", () => {
    expect(deriveDayOfWeek("2026-03-01")).toBe(0);  // March 1, 2026 is a Sunday
  });

  it("derives Monday = 1", () => {
    expect(deriveDayOfWeek("2026-03-02")).toBe(1);
  });

  it("returns null for invalid date", () => {
    expect(deriveDayOfWeek("Invalid")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════════

describe("parseCSV", () => {
  it("parses basic CSV with standard column names", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks
2026-03-01,c1,Squad Tourney,as1,Broad 18-35,ad1,Celebration v1,50.00,5000,100
2026-03-02,c1,Squad Tourney,as1,Broad 18-35,ad1,Celebration v1,30.00,3000,60`;

    const result = parseCSV(csv);
    expect(result.records).toHaveLength(2);
    expect(result.skippedRows).toBe(0);

    const r = result.records[0];
    expect(r.date).toBe("2026-03-01");
    expect(r.campaignId).toBe("c1");
    expect(r.campaignName).toBe("Squad Tourney");
    expect(r.spend).toBe(50);
    expect(r.impressions).toBe(5000);
    expect(r.linkClicks).toBe(100);
  });

  it("handles Facebook Ads Manager column aliases", () => {
    const csv = `Reporting starts,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Amount Spent (AUD),Impressions,Outbound Clicks
2026-03-01,c1,Camp,as1,Set,ad1,Ad,75.50,8000,150`;

    const result = parseCSV(csv);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].spend).toBe(75.5);
    expect(result.records[0].linkClicks).toBe(150);
  });

  it("handles optional columns gracefully", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks,Conversions,Creative Name
2026-03-01,c1,Camp,as1,Set,ad1,Ad,50,5000,100,5,Celebration Photo`;

    const result = parseCSV(csv);
    expect(result.records[0].conversions).toBe(5);
    expect(result.records[0].creativeName).toBe("Celebration Photo");
  });

  it("handles missing optional columns (null values)", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks
2026-03-01,c1,Camp,as1,Set,ad1,Ad,50,5000,100`;

    const result = parseCSV(csv);
    expect(result.records[0].conversions).toBeNull();
    expect(result.records[0].reach).toBeNull();
    expect(result.records[0].creativeName).toBeNull();
    expect(result.records[0].threeSecondVideoViews).toBeNull();
  });

  it("skips rows with missing required fields", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks
2026-03-01,c1,Camp,as1,Set,ad1,Ad,50,5000,100
,c2,Camp2,as2,Set2,ad2,Ad2,30,3000,60
2026-03-02,,Camp3,as3,Set3,ad3,Ad3,20,2000,40`;

    const result = parseCSV(csv);
    expect(result.records).toHaveLength(1);
    expect(result.skippedRows).toBe(2);
    expect(result.warnings.some(w => w.type === "skipped_rows")).toBe(true);
  });

  it("normalises dates in DD/MM/YYYY format", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks
15/03/2026,c1,Camp,as1,Set,ad1,Ad,50,5000,100`;

    const result = parseCSV(csv);
    expect(result.records[0].date).toBe("2026-03-15");
  });

  it("derives dayOfWeek from date (ignores source column)", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks,Day of Week
2026-03-01,c1,Camp,as1,Set,ad1,Ad,50,5000,100,5`;

    const result = parseCSV(csv);
    // March 1, 2026 is a Sunday (0), even if source says 5
    expect(result.records[0].dayOfWeek).toBe(0);
  });

  it("handles numeric values with currency symbols and commas", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks
2026-03-01,c1,Camp,as1,Set,ad1,Ad,"$1,234.56","10,000",500`;

    const result = parseCSV(csv);
    expect(result.records[0].spend).toBe(1234.56);
    expect(result.records[0].impressions).toBe(10000);
  });

  it("handles empty CSV", () => {
    const result = parseCSV("");
    expect(result.records).toHaveLength(0);
    expect(result.totalRows).toBe(0);
  });

  it("validates hourOfDay range", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks,Hour of Day
2026-03-01,c1,Camp,as1,Set,ad1,Ad,50,5000,100,25`;

    const result = parseCSV(csv);
    // 25 is out of 0-23 range, should be set to null
    expect(result.records[0].hourOfDay).toBeNull();
  });

  it("parses Hour of Day correctly", () => {
    const csv = `Date,Campaign ID,Campaign Name,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Spend,Impressions,Link Clicks,Hour of Day
2026-03-01,c1,Camp,as1,Set,ad1,Ad,50,5000,100,14`;

    const result = parseCSV(csv);
    expect(result.records[0].hourOfDay).toBe(14);
  });

  it("handles all 18+ columns", () => {
    const csv = `Date,Campaign ID,Campaign Name,Campaign Objective,Ad Set ID,Ad Set Name,Ad ID,Ad Name,Creative Name,Spend,Impressions,Reach,Link Clicks,Landing Page Views,Conversions,Conversion Value,Attribution Window,CPM,Hour of Day,Day of Week
2026-03-01,c1,Squad,OUTCOME_TRAFFIC,as1,Broad,ad1,Celebration,Celebration Photo,50.00,5000,3000,100,80,5,150.00,7d_click,10.00,14,0`;

    const result = parseCSV(csv);
    expect(result.records).toHaveLength(1);

    const r = result.records[0];
    expect(r.campaignObjective).toBe("OUTCOME_TRAFFIC");
    expect(r.creativeName).toBe("Celebration Photo");
    expect(r.reach).toBe(3000);
    expect(r.landingPageViews).toBe(80);
    expect(r.conversions).toBe(5);
    expect(r.conversionValue).toBe(150);
    expect(r.attributionWindow).toBe("7d_click");
    expect(r.cpmRaw).toBe(10);
    expect(r.hourOfDay).toBe(14);
    expect(r.dayOfWeek).toBe(0);  // Derived from date, not source
  });
});
