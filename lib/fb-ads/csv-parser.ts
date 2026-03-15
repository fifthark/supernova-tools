// ═══════════════════════════════════════════════════════════════════
// FB ADS DASHBOARD — CSV PARSER
// ═══════════════════════════════════════════════════════════════════
//
// Parses CSV from Facebook Ads Manager export or custom format.
// Handles column name aliases, date normalisation, optional columns.
// Returns typed FBAdRecord[] + warnings.
//
// ═══════════════════════════════════════════════════════════════════

import Papa from "papaparse";
import { FBAdRecord, ParseResult, DataQualityWarning } from "./types";
import { COLUMN_MAP, COLUMN_ALIASES } from "./constants";

// ═══════════════════════════════════════════════════════════════════
// DATE NORMALISATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse a date string in various formats to YYYY-MM-DD.
 * Accepted: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, D/M/YYYY, ISO 8601
 * Returns "Invalid" if unparseable.
 */
export function normaliseDate(raw: string): string {
  if (!raw || typeof raw !== "string") return "Invalid";
  const s = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // ISO 8601 with time
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return s.slice(0, 10);
  }

  // DD/MM/YYYY or D/M/YYYY
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, part1, part2, year] = slashMatch;
    const p1 = parseInt(part1, 10);
    const p2 = parseInt(part2, 10);

    // Heuristic: if first part > 12, it must be DD/MM/YYYY
    // If second part > 12, it must be MM/DD/YYYY
    // If ambiguous (both <= 12), assume DD/MM/YYYY (AU format)
    let day: number, month: number;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      // Ambiguous — assume DD/MM/YYYY (Australian convention)
      day = p1;
      month = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return "Invalid";
}

/**
 * Derive day of week (0=Sunday) from YYYY-MM-DD date string.
 * More reliable than trusting source "Day of Week" column.
 */
export function deriveDayOfWeek(dateStr: string): number | null {
  if (dateStr === "Invalid") return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.getDay();
}

// ═══════════════════════════════════════════════════════════════════
// NUMERIC PARSING
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse a numeric value, handling currency symbols, commas, etc.
 * Returns number or null.
 */
function parseNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;

  const s = String(val).trim()
    .replace(/[$AUD,\s]/gi, "")
    .replace(/^[()]+|[()]+$/g, "");  // handle (negative) format

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

/**
 * Resolve a CSV header to a canonical column name using aliases.
 * Returns the canonical name or null if not recognised.
 */
function resolveColumnName(header: string): string | null {
  const trimmed = header.trim();

  // Direct match in COLUMN_MAP
  if (COLUMN_MAP[trimmed]) return trimmed;

  // Check aliases
  if (COLUMN_ALIASES[trimmed]) return COLUMN_ALIASES[trimmed];

  // Case-insensitive fallback
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
 * Parse a CSV string into FBAdRecord[].
 * Handles FB Ads Manager column name variations.
 * Returns records + warnings + stats.
 */
export function parseCSV(csvString: string): ParseResult {
  const warnings: DataQualityWarning[] = [];
  let skippedRows = 0;

  // Parse with Papa Parse
  const parsed = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,  // We handle types ourselves for control
  });

  if (parsed.errors.length > 0) {
    const errorCount = parsed.errors.filter(e => e.type === "Quotes" || e.type === "FieldMismatch").length;
    if (errorCount > 0) {
      warnings.push({
        type: "parse_error",
        severity: "warning",
        message: `CSV parser encountered ${errorCount} formatting issues. Some rows may be incomplete.`,
      });
    }
  }

  const rawRows = parsed.data as Record<string, string>[];
  if (rawRows.length === 0) {
    return { records: [], warnings, skippedRows: 0, totalRows: 0 };
  }

  // Build column mapping: CSV header → FBAdRecord field
  const headers = Object.keys(rawRows[0]);
  const fieldMap: Record<string, string> = {};  // csvHeader → recordField
  const resolvedHeaders = new Set<string>();

  for (const header of headers) {
    const canonical = resolveColumnName(header);
    if (canonical && COLUMN_MAP[canonical]) {
      fieldMap[header] = COLUMN_MAP[canonical];
      resolvedHeaders.add(COLUMN_MAP[canonical]);
    }
  }

  // Track which fields are present for validation
  const presentFields = new Set<string>(Object.values(fieldMap));

  // Parse each row
  const records: FBAdRecord[] = [];

  for (const row of rawRows) {
    // Helper to get field value
    const getField = (recordField: string): string | null => {
      for (const [csvHeader, rf] of Object.entries(fieldMap)) {
        if (rf === recordField) return row[csvHeader] ?? null;
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
      dayOfWeek,  // Always derived from date, not from source
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
    totalRows: rawRows.length,
  };
}
