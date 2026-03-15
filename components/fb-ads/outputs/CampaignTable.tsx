"use client";

import { useMemo, useCallback } from "react";
import {
  FBAdsMetrics,
  CampaignSummary,
  AdSetSummary,
  AdSummary,
  CreativeSummary,
  DrillLevel,
  SortField,
  SortDirection,
  FBAdRecord,
} from "@/lib/fb-ads/types";
import {
  fmtAUD,
  fmtPct,
  fmtNumber,
  fmtRoas,
  sortItems,
  getMetricColour,
  computeOverallMetrics,
  computeSparkline,
  exportTableAsCSV,
} from "@/lib/fb-ads/engine";
import { METRIC_DIRECTIONS } from "@/lib/fb-ads/constants";

// ═══════════════════════════════════════════════════════════════════
// SPARKLINE SVG
// ═══════════════════════════════════════════════════════════════════

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0 || data.every(d => d === 0)) return null;

  const max = Math.max(...data, 0.001);
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="sparkline-svg" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

interface Column {
  key: string;
  label: string;
  format: (v: unknown) => string;
  sortable: boolean;
  colourable: boolean;
  align?: "left" | "right";
}

const COLUMNS: Column[] = [
  { key: "name", label: "Name", format: v => String(v || "—"), sortable: true, colourable: false, align: "left" },
  { key: "spend", label: "Spend", format: v => fmtAUD(Number(v) || 0), sortable: true, colourable: false, align: "right" },
  { key: "impressions", label: "Impr.", format: v => fmtNumber(v as number), sortable: true, colourable: false, align: "right" },
  { key: "linkClicks", label: "Clicks", format: v => fmtNumber(v as number), sortable: true, colourable: false, align: "right" },
  { key: "ctr", label: "CTR", format: v => fmtPct(v as number | null), sortable: true, colourable: true, align: "right" },
  { key: "cpc", label: "CPC", format: v => v != null ? fmtAUD(Number(v)) : "—", sortable: true, colourable: true, align: "right" },
  { key: "cpm", label: "CPM", format: v => v != null ? fmtAUD(Number(v)) : "—", sortable: true, colourable: true, align: "right" },
  { key: "conversions", label: "Conv.", format: v => fmtNumber(v as number | null), sortable: true, colourable: false, align: "right" },
  { key: "costPerConversion", label: "Cost/Conv", format: v => v != null ? fmtAUD(Number(v)) : "—", sortable: true, colourable: true, align: "right" },
  { key: "roas", label: "ROAS", format: v => fmtRoas(v as number | null), sortable: true, colourable: true, align: "right" },
];

// ═══════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════

type AnyItem = CampaignSummary | AdSetSummary | AdSummary | CreativeSummary;

interface Props {
  items: AnyItem[];
  level: DrillLevel;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onDrillDown: (item: AnyItem) => void;
  allRecords: FBAdRecord[];
  dateRange: { start: string; end: string };
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function CampaignTable({
  items,
  level,
  sortField,
  sortDirection,
  onSort,
  onDrillDown,
  allRecords,
  dateRange,
}: Props) {
  // Compute overall average metrics for conditional colouring
  const avgMetrics = useMemo(() => computeOverallMetrics(allRecords), [allRecords]);

  // Sort items
  const sortedItems = useMemo(
    () => sortItems(items as unknown as Record<string, unknown>[], sortField, sortDirection) as unknown as AnyItem[],
    [items, sortField, sortDirection]
  );

  // Get name and entity field based on drill level
  const getItemName = useCallback((item: AnyItem): string => {
    if ("creativeName" in item && level === "creative") return (item as CreativeSummary).creativeName;
    if ("campaignName" in item && level === "campaign") return (item as CampaignSummary).campaignName;
    if ("adSetName" in item && level === "adSet") return (item as AdSetSummary).adSetName;
    if ("adName" in item && level === "ad") return (item as AdSummary).adName;
    return "—";
  }, [level]);

  const getEntityId = useCallback((item: AnyItem): string => {
    if ("creativeName" in item && level === "creative") return (item as CreativeSummary).creativeName;
    if ("campaignId" in item && level === "campaign") return (item as CampaignSummary).campaignId;
    if ("adSetId" in item && level === "adSet") return (item as AdSetSummary).adSetId;
    if ("adId" in item && level === "ad") return (item as AdSummary).adId;
    return "";
  }, [level]);

  const entityField = level === "campaign" ? "campaignId"
    : level === "adSet" ? "adSetId"
    : level === "ad" ? "adId"
    : "campaignId";

  const canDrillDown = level === "campaign" || level === "adSet";

  // CSV export handler
  const handleExport = useCallback(() => {
    const headers = COLUMNS.map(c => c.label);
    const rows = sortedItems.map(item => [
      getItemName(item),
      item.spend,
      item.impressions,
      item.linkClicks,
      item.ctr,
      item.cpc,
      item.cpm,
      item.conversions,
      item.costPerConversion,
      item.roas,
    ]);
    const filename = `fb-ads-${level}-${dateRange.start}-to-${dateRange.end}.csv`;
    exportTableAsCSV(headers, rows, filename);
  }, [sortedItems, level, dateRange, getItemName]);

  // Level label
  const levelLabel = level === "campaign" ? "Campaigns"
    : level === "adSet" ? "Ad Sets"
    : level === "ad" ? "Ads"
    : "Creatives";

  if (sortedItems.length === 0) {
    return (
      <div className="data-table-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No {levelLabel.toLowerCase()} found</div>
          <div className="empty-state-text">
            Try adjusting your date range or upload a different CSV.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <span className="data-table-title">
          {levelLabel} ({sortedItems.length})
        </span>
        <div className="data-table-actions">
          <button className="btn-export" onClick={handleExport}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                style={{ textAlign: col.align }}
                onClick={() => col.sortable && onSort(col.key as SortField)}
              >
                {col.label}
                {sortField === col.key && (
                  <span className="sort-arrow">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const id = getEntityId(item);
            const name = getItemName(item);

            return (
              <tr
                key={id}
                className={canDrillDown ? "clickable" : ""}
                onClick={() => canDrillDown && onDrillDown(item)}
              >
                {COLUMNS.map(col => {
                  if (col.key === "name") {
                    // Name column with sparkline
                    const spendSpark = level !== "creative"
                      ? computeSparkline(allRecords, id, entityField as any, "spend")
                      : [];
                    return (
                      <td key={col.key} className="name-cell">
                        <div className="sparkline-cell">
                          <span>{name}</span>
                          {spendSpark.length > 0 && (
                            <Sparkline data={spendSpark} color="var(--accent-profit)" />
                          )}
                        </div>
                      </td>
                    );
                  }

                  const value = (item as unknown as Record<string, unknown>)[col.key];
                  const formatted = col.format(value);

                  // Conditional colouring
                  let colourClass = "metric-neutral";
                  if (col.colourable && value != null) {
                    const direction = METRIC_DIRECTIONS[col.key];
                    if (direction && direction !== "neutral") {
                      const avg = (avgMetrics as unknown as Record<string, unknown>)[col.key] as number | null;
                      const colour = getMetricColour(value as number, avg, direction);
                      colourClass = `metric-${colour}`;
                    }
                  }

                  return (
                    <td
                      key={col.key}
                      className={colourClass}
                      style={{ textAlign: col.align }}
                    >
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
