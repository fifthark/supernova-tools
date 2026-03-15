// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — CONSTANTS
// ═══════════════════════════════════════════════════════════════════

import { MetricDirection } from "./types";

// === COLUMN MAPPING: Sheet/CSV header → FBAdRecord field ===

export const COLUMN_MAP: Record<string, string> = {
  // Required columns
  "Date": "date",
  "Campaign ID": "campaignId",
  "Campaign Name": "campaignName",
  "Campaign Objective": "campaignObjective",
  "Ad Set ID": "adSetId",
  "Ad Set Name": "adSetName",
  "Ad ID": "adId",
  "Ad Name": "adName",
  "Creative Name": "creativeName",
  "Spend": "spend",
  "Impressions": "impressions",
  "Reach": "reach",
  "Link Clicks": "linkClicks",
  "Landing Page Views": "landingPageViews",
  "Conversions": "conversions",
  "Conversion Value": "conversionValue",
  "Attribution Window": "attributionWindow",
  "CPM": "cpmRaw",
  "Hour of Day": "hourOfDay",
  "Day of Week": "dayOfWeek",

  // Optional columns
  "Video 3s Views": "threeSecondVideoViews",
  "Platform": "platform",
  "Placement": "placement",
};

// === FB ADS MANAGER COLUMN ALIASES ===
// Facebook export headers vary by language/region — map common variants

export const COLUMN_ALIASES: Record<string, string> = {
  // Date variants
  "Reporting starts": "Date",
  "Reporting Starts": "Date",
  "Day": "Date",

  // Spend variants
  "Amount Spent (AUD)": "Spend",
  "Amount spent (AUD)": "Spend",
  "Amount Spent": "Spend",
  "Amount spent": "Spend",
  "Cost": "Spend",

  // Click variants
  "Link Clicks": "Link Clicks",
  "Outbound Clicks": "Link Clicks",
  "Website Clicks": "Link Clicks",
  "Clicks (All)": "Link Clicks",

  // Landing page variants
  "Landing Page Views": "Landing Page Views",
  "Landing page views": "Landing Page Views",

  // Conversion variants
  "Results": "Conversions",
  "Leads": "Conversions",
  "Registrations Completed": "Conversions",
  "Purchases": "Conversions",

  // Conversion value variants
  "Result Revenue": "Conversion Value",
  "Purchase ROAS": "Conversion Value",
  "Conversion Value": "Conversion Value",
  "Purchase Conversion Value": "Conversion Value",

  // CPM variants
  "CPM (Cost per 1,000 Impressions)": "CPM",
  "CPM (cost per 1,000 impressions)": "CPM",

  // Reach variants
  "Reach": "Reach",

  // Video variants
  "3-second video views": "Video 3s Views",
  "3-Second Video Views": "Video 3s Views",
  "ThruPlay Views": "Video 3s Views",

  // Campaign objective variants
  "Objective": "Campaign Objective",
  "Campaign objective": "Campaign Objective",

  // Attribution variants
  "Attribution setting": "Attribution Window",
  "Attribution Setting": "Attribution Window",
  "Conversion window": "Attribution Window",

  // Platform/placement
  "Publisher Platform": "Platform",
  "Platform": "Platform",
  "Impression Device": "Placement",
};

// === REQUIRED COLUMNS (must be present for dashboard to function) ===

export const REQUIRED_COLUMNS: string[] = [
  "date",
  "campaignId",
  "campaignName",
  "adSetId",
  "adSetName",
  "adId",
  "adName",
  "spend",
  "impressions",
  "linkClicks",
];

// === METRIC DIRECTIONS (for conditional colouring) ===

export const METRIC_DIRECTIONS: Record<string, MetricDirection> = {
  ctr: "higher-is-better",
  cpc: "lower-is-better",
  cpm: "lower-is-better",
  roas: "higher-is-better",
  conversionRate: "higher-is-better",
  costPerConversion: "lower-is-better",
  landingPageViewRate: "higher-is-better",
  thumbStopRatio: "higher-is-better",
  frequency: "neutral",
  spend: "neutral",
  impressions: "neutral",
  reach: "neutral",
  linkClicks: "neutral",
  conversions: "neutral",
  conversionValue: "neutral",
  landingPageViews: "neutral",
};

// === OBJECTIVE-AWARE METRIC PRIORITY ===

export const OBJECTIVE_METRICS: Record<string, string[]> = {
  OUTCOME_AWARENESS: ["reach", "frequency", "cpm", "impressions"],
  OUTCOME_TRAFFIC: ["linkClicks", "landingPageViews", "ctr", "cpc"],
  OUTCOME_ENGAGEMENT: ["linkClicks", "ctr", "cpc", "impressions"],
  OUTCOME_LEADS: ["conversions", "costPerConversion", "conversionRate", "spend"],
  OUTCOME_SALES: ["conversions", "roas", "costPerConversion", "conversionValue"],
};

// Universal metrics shown when viewing all campaigns or mixed objectives
export const UNIVERSAL_METRICS: string[] = [
  "spend", "impressions", "linkClicks", "ctr", "cpc", "conversions", "roas",
];

// === CHART COLOURS ===

export const CHART_COLORS = {
  spend: "#FF5F1F",          // accent-profit orange
  ctr: "#7C3AED",            // purple
  cpc: "#06B6D4",            // cyan
  conversions: "#10B981",    // green
  roas: "#F59E0B",           // amber
  impressions: "#6366F1",    // indigo
  reach: "#8B5CF6",          // violet
};

// === CONDITIONAL COLOURING THRESHOLDS ===

export const COLOUR_THRESHOLD = 0.10;  // 10% — green if >10% better, red if >10% worse

// === HEATMAP ===

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i);

// === DATE PRESETS ===

export const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This month", days: 0 },     // special: start of current month
  { label: "Last month", days: -1 },     // special: previous calendar month
] as const;

// === CREATIVE ALIASES (user-configurable in Phase 2) ===

export const CREATIVE_ALIASES: Record<string, string> = {
  // Example mappings — extend as needed
  // "celebration-v1": "Celebration Photo",
  // "celebration-crop": "Celebration Photo",
  // "squad-standing-v2": "Squad Standing Shot",
};

// === ERROR MESSAGES ===

export const ERROR_MESSAGES = {
  noData: "No data found for this date range. Try expanding the dates or uploading a different CSV.",
  missingColumns: "This CSV is missing required columns: {columns}. Export from Facebook Ads Manager with all columns included.",
  sheetsTimeout: "Google Sheets connection timed out. Try a smaller date range or switch to CSV upload.",
  noHourlyData: "Hourly data not available. Configure Make.com with hourly breakdowns to enable the performance heatmap.",
  multipleAttributionWindows: "This data contains multiple attribution windows. Select one from the dropdown to avoid double-counting conversions.",
  parseError: "Could not parse {count} rows. Check the CSV format — dates should be YYYY-MM-DD or DD/MM/YYYY.",
};
