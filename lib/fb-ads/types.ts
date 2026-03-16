// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

// === RAW DATA (from Google Sheets or CSV) ===

export interface FBAdRecord {
  // Identity
  date: string;                       // YYYY-MM-DD (normalised)
  campaignId: string;
  campaignName: string;
  campaignObjective: string | null;   // e.g., OUTCOME_TRAFFIC, OUTCOME_LEADS
  adSetId: string;
  adSetName: string;
  adId: string;
  adName: string;
  creativeName: string | null;        // For A/B testing grouping

  // Core metrics
  spend: number;                      // AUD
  impressions: number;
  reach: number | null;
  linkClicks: number;
  landingPageViews: number | null;
  conversions: number | null;
  conversionValue: number | null;     // Revenue from conversions (for ROAS)
  cpmRaw: number | null;             // CPM from source (for validation)

  // Attribution
  attributionWindow: string | null;   // e.g., "7d_click", "1d_click"

  // Optional columns
  threeSecondVideoViews: number | null;
  platform: string | null;            // Facebook, Instagram
  placement: string | null;           // Feed, Story, Reels

  // Time granularity (optional — for heatmap)
  hourOfDay: number | null;           // 0-23
  dayOfWeek: number | null;           // 0=Sunday, 6=Saturday (derived from date)
}

// === COMPUTED METRICS ===

export interface FBAdsMetrics {
  spend: number;
  impressions: number;
  reach: number | null;
  linkClicks: number;
  landingPageViews: number | null;
  ctr: number | null;                 // (linkClicks / impressions) * 100
  cpc: number | null;                 // spend / linkClicks
  cpm: number | null;                 // (spend / impressions) * 1000
  conversions: number | null;
  conversionValue: number | null;
  costPerConversion: number | null;   // spend / conversions
  roas: number | null;                // conversionValue / spend
  conversionRate: number | null;      // (conversions / linkClicks) * 100
  frequency: number | null;           // impressions / reach
  landingPageViewRate: number | null;  // (landingPageViews / linkClicks) * 100
  thumbStopRatio: number | null;      // (3s video views / impressions) * 100
}

// === HIERARCHY SUMMARIES ===

export interface CampaignSummary extends FBAdsMetrics {
  campaignId: string;
  campaignName: string;
  campaignObjective: string | null;
  adSetCount: number;
}

export interface AdSetSummary extends FBAdsMetrics {
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  campaignObjective: string | null;
  adCount: number;
}

export interface AdSummary extends FBAdsMetrics {
  adId: string;
  adName: string;
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  campaignObjective: string | null;
  creativeName: string | null;
}

export interface CreativeSummary extends FBAdsMetrics {
  creativeName: string;
  campaignCount: number;
  adCount: number;
}

// === TIME SERIES ===

export interface DailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
}

export interface WeeklyMetrics extends DailyMetrics {
  weekLabel: string;                  // e.g., "W1 Mar", "W2 Mar"
}

// === HEATMAP ===

export interface HeatmapCell {
  dayOfWeek: number;                  // 0-6
  hourOfDay: number;                  // 0-23
  spend: number;
  ctr: number | null;
  cpc: number | null;
  impressions: number;
}

// === DRILL-DOWN STATE ===

export type DrillLevel = "campaign" | "adSet" | "ad" | "creative";

export interface DrilldownState {
  level: DrillLevel;
  campaignId: string | null;
  campaignName: string | null;
  adSetId: string | null;
  adSetName: string | null;
}

// === DATA SOURCE ===

export type DataSource = "sheets" | "csv";

export interface DateRange {
  start: string;                      // YYYY-MM-DD
  end: string;                        // YYYY-MM-DD
}

// === COMPARISON ===

export interface ComparisonItem {
  id: string;
  name: string;
  level: DrillLevel;
  metrics: FBAdsMetrics;
}

// === SORTING ===

export type SortField = keyof FBAdsMetrics | "campaignName" | "adSetName" | "adName" | "creativeName";
export type SortDirection = "asc" | "desc";

// === METRIC DIRECTION (for conditional colouring) ===

export type MetricDirection = "higher-is-better" | "lower-is-better" | "neutral";

// === DATA QUALITY ===

export interface DataQualityWarning {
  type: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface ParseResult {
  records: FBAdRecord[];
  warnings: DataQualityWarning[];
  skippedRows: number;
  totalRows: number;
}

// === METRIC AVAILABILITY (gating for insights) ===

export interface MetricAvailability {
  frequency: boolean;
  reach: boolean;
  platform: boolean;
  placement: boolean;
  hourlyData: boolean;
  landingPageViews: boolean;
  conversions: boolean;
  conversionValue: boolean;
  videoViews: boolean;
  creativeName: boolean;
  campaignObjective: boolean;
}

// === PLATFORM & PLACEMENT BREAKDOWN ===

export interface PlatformSummary extends FBAdsMetrics {
  platform: string;
  recordCount: number;
}

export interface PlacementSummary extends FBAdsMetrics {
  placement: string;
  recordCount: number;
}

// === RECOMMENDATIONS ENGINE ===

export type InsightSeverity = "action" | "watch" | "win";

export type InsightCategory =
  | "fatigue"
  | "budget"
  | "creative"
  | "targeting"
  | "timing"
  | "efficiency";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  why: string;
  action: string;
  entityName?: string;
  entityType?: "campaign" | "adSet" | "creative";
  confidence: "high" | "medium" | "low";
  metric?: string;
  value?: string;
}
