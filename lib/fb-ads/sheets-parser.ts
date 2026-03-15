// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — GOOGLE SHEETS PARSER
// ═══════════════════════════════════════════════════════════════════
//
// Converts Google Sheets row arrays into FBAdRecords.
// Reuses the same normalisation logic as the CSV parser.
//
// Input: string[][] where rows[0] = headers, rows[1..n] = data
// Output: ParseResult
//
// ═══════════════════════════════════════════════════════════════════

import { FBAdRecord, ParseResult, DataQualityWarning } from "./types";
import { COLUMN_MAP, COLUMN_ALIASES } from "./constants";
import { normaliseDate, deriveDayOfWeek } from "./csv-parser";

// ═══════════════════════════════════════════════════════════════════
// NUMERIC PARSING
// ═══════════════════════════════════════════════════════════════════

function parseNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;

  const s = String(val).trim()
    .replace(/[$AUD,\s]/gi, "")
    .replace(/^[()]+|[()]+$/g, "");

  if (s === "" || s === "-" || s === "—") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseNumRequired(val: unknown): number {
  return parseNum(val) ?? 0;
}

// ═══════════════════════════════════════════════════════════════════
// COLUMN NAME RESOLUTION
// ═══════════════════════════════════════════════════════════════════

function resolveColumnName(header: string): string | null {
  const trimmed = header.trim();

  if (COLUMN_MAP[trimmed]) return trimmed;
  if (COLUMN_ALIASES[trimmed]) return COLUMN_ALIASES[trimmed];

  const lower = trimmed.toLowerCase();
  for (const [alias, canonical] of Object.entries(COLUMN_ALIASES)) {
    if (alias.toLowerCase() === lower) return canonical;
  }
  for (const key of Object.keys(COLUMN_MAP)) {
    if (key.toLowerCase() === lower) return key;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse Google Sheets row arrays into FBAdRecord[].
 * rows[0] = headers, rows[1..n] = data rows.
 */
export function parseSheetRows(rows: string[][]): ParseResult {
  const warnings: DataQualityWarning[] = [];
  let skippedRows = 0;

  if (rows.length < 2) {
    return { records: [], warnings, skippedRows: 0, totalRows: 0 };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Build column mapping: column index → FBAdRecord field
  const fieldMap: Record<number, string> = {};  // colIndex → recordField

  for (let i = 0; i < headers.length; i++) {
    const canonical = resolveColumnName(headers[i]);
    if (canonical && COLUMN_MAP[canonical]) {
      fieldMap[i] = COLUMN_MAP[canonical];
    }
  }

  // Parse each row
  const records: FBAdRecord[] = [];

  for (const row of dataRows) {
    // Helper to get field value by record field name
    const getField = (recordField: string): string | null => {
      for (const [colIdx, rf] of Object.entries(fieldMap)) {
        if (rf === recordField) {
          const val = row[Number(colIdx)];
          return val != null && val !== "" ? val : null;
        }
      }
      return null;
    };

    // Required fields check
    const campaignId = getField("campaignId")?.trim();
    const adSetId = getField("adSetId")?.trim();
    const adId = getField("adId")?.trim();
    const dateRaw = getField("date");

    if (!campaignId || !adSetId || !adId || !dateRaw) {
      skippedRows++;
      continue;
    }

    const date = normaliseDate(dateRaw);
    const dayOfWeek = deriveDayOfWeek(date);

    const record: FBAdRecord = {
      date,
      campaignId,
      campaignName: getField("campaignName")?.trim() || campaignId,
      campaignObjective: getField("campaignObjective")?.trim() || null,
      adSetId,
      adSetName: getField("adSetName")?.trim() || adSetId,
      adId,
      adName: getField("adName")?.trim() || adId,
      creativeName: getField("creativeName")?.trim() || null,

      spend: parseNumRequired(getField("spend")),
      impressions: parseNumRequired(getField("impressions")),
      reach: parseNum(getField("reach")),
      linkClicks: parseNumRequired(getField("linkClicks")),
      landingPageViews: parseNum(getField("landingPageViews")),
      conversions: parseNum(getField("conversions")),
      conversionValue: parseNum(getField("conversionValue")),
      cpmRaw: parseNum(getField("cpmRaw")),

      attributionWindow: getField("attributionWindow")?.trim() || null,

      threeSecondVideoViews: parseNum(getField("threeSecondVideoViews")),
      platform: getField("platform")?.trim() || null,
      placement: getField("placement")?.trim() || null,

      hourOfDay: parseNum(getField("hourOfDay")) != null
        ? Math.round(parseNum(getField("hourOfDay"))!)
        : null,
      dayOfWeek,
    };

    // Validate hourOfDay range
    if (record.hourOfDay != null && (record.hourOfDay < 0 || record.hourOfDay > 23)) {
      record.hourOfDay = null;
    }

    records.push(record);
  }

  if (skippedRows > 0) {
    warnings.push({
      type: "skipped_rows",
      severity: "info",
      message: `${skippedRows} rows skipped (missing required fields: Campaign ID, Ad Set ID, Ad ID, or Date).`,
    });
  }

  return {
    records,
    warnings,
    skippedRows,
    totalRows: dataRows.length,
  };
}
