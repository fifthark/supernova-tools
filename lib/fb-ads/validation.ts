// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — DATA QUALITY VALIDATION
// ═══════════════════════════════════════════════════════════════════
//
// Runs before rendering any metrics. Returns dismissible warnings.
// A dashboard without data validation is a car with a beautiful
// speedometer and no engine warning light.
//
// ═══════════════════════════════════════════════════════════════════

import { FBAdRecord, DataQualityWarning } from "./types";
import { REQUIRED_COLUMNS } from "./constants";

/**
 * Run all data quality checks on parsed records.
 * Returns warnings sorted by severity (error > warning > info).
 */
export function validateData(
  records: FBAdRecord[],
  presentFields: Set<string>
): DataQualityWarning[] {
  const warnings: DataQualityWarning[] = [];

  // 1. Missing required columns
  const missingCols = REQUIRED_COLUMNS.filter(col => !presentFields.has(col));
  if (missingCols.length > 0) {
    warnings.push({
      type: "missing_columns",
      severity: "error",
      message: `Missing required columns: ${missingCols.join(", ")}`,
    });
  }

  if (records.length === 0) {
    return warnings;
  }

  // 2. Duplicate rows (same date + campaign + ad set + ad)
  const grainKeys = new Set<string>();
  let dupeCount = 0;
  for (const r of records) {
    const key = `${r.date}|${r.campaignId}|${r.adSetId}|${r.adId}|${r.hourOfDay ?? "all"}`;
    if (grainKeys.has(key)) {
      dupeCount++;
    } else {
      grainKeys.add(key);
    }
  }
  if (dupeCount > 0) {
    warnings.push({
      type: "duplicate_rows",
      severity: "warning",
      message: `${dupeCount} duplicate rows detected (same date + campaign + ad set + ad). Totals may be inflated.`,
    });
  }

  // 3. Invalid dates (empty or unparseable — should have been caught by parser)
  const invalidDateCount = records.filter(r => !r.date || r.date === "Invalid").length;
  if (invalidDateCount > 0) {
    warnings.push({
      type: "invalid_dates",
      severity: "error",
      message: `${invalidDateCount} rows have unparseable dates.`,
    });
  }

  // 4. Spend with zero impressions
  const spendNoImpressions = records.filter(r => r.spend > 0 && r.impressions === 0).length;
  if (spendNoImpressions > 0) {
    warnings.push({
      type: "spend_no_impressions",
      severity: "warning",
      message: `${spendNoImpressions} rows have spend but zero impressions — these may be data processing artifacts.`,
    });
  }

  // 5. Conversions without attribution window
  const hasConversions = records.some(r => r.conversions != null && r.conversions > 0);
  const hasAttribution = records.some(r => r.attributionWindow != null && r.attributionWindow.trim() !== "");
  if (hasConversions && !hasAttribution) {
    warnings.push({
      type: "conversions_no_attribution",
      severity: "warning",
      message: "Conversions present but Attribution Window column is blank — ROAS and conversion numbers may use mixed attribution models.",
    });
  }

  // 6. Multiple attribution windows
  const windows = new Set<string>();
  for (const r of records) {
    if (r.attributionWindow != null && r.attributionWindow.trim() !== "") {
      windows.add(r.attributionWindow.trim());
    }
  }
  if (windows.size > 1) {
    warnings.push({
      type: "multiple_attribution_windows",
      severity: "warning",
      message: `Data contains multiple attribution windows (${Array.from(windows).join(", ")}). Select one from the dropdown to avoid double-counting conversions.`,
    });
  }

  // 7. Missing creative names
  const missingCreative = records.filter(
    r => r.creativeName == null || r.creativeName.trim() === ""
  ).length;
  if (missingCreative > 0 && missingCreative < records.length) {
    warnings.push({
      type: "missing_creative_names",
      severity: "info",
      message: `${missingCreative} rows have blank Creative Name — these won't appear in creative grouping.`,
    });
  }

  // 8. No hourly data
  const uniqueHours = new Set(records.map(r => r.hourOfDay).filter(h => h != null));
  if (uniqueHours.size <= 1) {
    warnings.push({
      type: "no_hourly_data",
      severity: "info",
      message: "Hourly data not available. Configure Make.com with hourly breakdowns to enable the performance heatmap.",
    });
  }

  // Sort: error > warning > info
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings;
}
