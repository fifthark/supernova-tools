"use client";

import { useMemo, useCallback, useState } from "react";
import {
  CreativeSummary,
  FBAdRecord,
  SortField,
  SortDirection,
  MetricAvailability,
} from "@/lib/fb-ads/types";
import {
  fmtAUD,
  fmtPct,
  fmtNumber,
  fmtRoas,
  sortItems,
  getMetricColour,
  computeOverallMetrics,
  exportTableAsCSV,
} from "@/lib/fb-ads/engine";
import { METRIC_DIRECTIONS, FATIGUE_FREQUENCY_ACTION, FATIGUE_FREQUENCY_WATCH } from "@/lib/fb-ads/constants";

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

const BASE_COLUMNS: Column[] = [
  { key: "creativeName", label: "Creative", format: v => String(v || "—"), sortable: true, colourable: false, align: "left" },
  { key: "campaignCount", label: "Campaigns", format: v => String(v ?? "—"), sortable: true, colourable: false, align: "right" },
  { key: "adCount", label: "Ads", format: v => String(v ?? "—"), sortable: true, colourable: false, align: "right" },
  { key: "spend", label: "Spend", format: v => fmtAUD(Number(v) || 0), sortable: true, colourable: false, align: "right" },
  { key: "impressions", label: "Impr.", format: v => fmtNumber(v as number), sortable: true, colourable: false, align: "right" },
  { key: "linkClicks", label: "Clicks", format: v => fmtNumber(v as number), sortable: true, colourable: false, align: "right" },
  { key: "ctr", label: "CTR", format: v => fmtPct(v as number | null), sortable: true, colourable: true, align: "right" },
  { key: "cpc", label: "CPC", format: v => v != null ? fmtAUD(Number(v)) : "—", sortable: true, colourable: true, align: "right" },
  { key: "conversions", label: "Conv.", format: v => fmtNumber(v as number | null), sortable: true, colourable: false, align: "right" },
  { key: "roas", label: "ROAS", format: v => fmtRoas(v as number | null), sortable: true, colourable: true, align: "right" },
];

const FREQ_COLUMN: Column = {
  key: "frequency", label: "Freq.", format: v => v != null ? (v as number).toFixed(1) : "—", sortable: true, colourable: false, align: "right",
};

const THUMB_STOP_COLUMN: Column = {
  key: "thumbStopRatio", label: "Thumb Stop", format: v => fmtPct(v as number | null), sortable: true, colourable: true, align: "right",
};

function buildColumns(availability?: MetricAvailability): Column[] {
  const cols = [...BASE_COLUMNS];
  // Insert frequency after CPC (index 7 in base)
  if (availability?.frequency) {
    cols.splice(8, 0, FREQ_COLUMN);
  }
  // Insert thumb stop before ROAS
  if (availability?.videoViews) {
    const roasIdx = cols.findIndex(c => c.key === "roas");
    if (roasIdx >= 0) cols.splice(roasIdx, 0, THUMB_STOP_COLUMN);
  }
  return cols;
}

function FatigueDot({ frequency }: { frequency: number | null }) {
  if (frequency == null) return null;
  if (frequency >= FATIGUE_FREQUENCY_ACTION) {
    return <span className="fatigue-dot fatigue-dot-red" title={`Frequency ${frequency.toFixed(1)} — fatigued`} />;
  }
  if (frequency >= FATIGUE_FREQUENCY_WATCH) {
    return <span className="fatigue-dot fatigue-dot-amber" title={`Frequency ${frequency.toFixed(1)} — watch`} />;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// SPEND DISTRIBUTION BAR
// ═══════════════════════════════════════════════════════════════════

function SpendBar({ spend, maxSpend }: { spend: number; maxSpend: number }) {
  const pct = maxSpend > 0 ? (spend / maxSpend) * 100 : 0;
  return (
    <div className="spend-bar-bg">
      <div
        className="spend-bar-fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface Props {
  items: CreativeSummary[];
  allRecords: FBAdRecord[];
  dateRange: { start: string; end: string };
  availability?: MetricAvailability;
}

export default function CreativeTable({ items, allRecords, dateRange, availability }: Props) {
  const [sortField, setSortField] = useState<SortField>("spend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Overall averages for conditional colouring
  const avgMetrics = useMemo(() => computeOverallMetrics(allRecords), [allRecords]);

  // Sort items
  const sortedItems = useMemo(
    () => sortItems(items as unknown as Record<string, unknown>[], sortField, sortDirection) as unknown as CreativeSummary[],
    [items, sortField, sortDirection]
  );

  // Max spend for distribution bars
  const maxSpend = useMemo(
    () => Math.max(...sortedItems.map(i => i.spend), 1),
    [sortedItems]
  );

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  // Build columns based on available metrics
  const columns = useMemo(() => buildColumns(availability), [availability]);

  // CSV export
  const handleExport = useCallback(() => {
    const headers = columns.map(c => c.label);
    const rows = sortedItems.map(item =>
      columns.map(col => (item as unknown as Record<string, unknown>)[col.key] as string | number | null)
    );
    const filename = `fb-ads-creative-${dateRange.start}-to-${dateRange.end}.csv`;
    exportTableAsCSV(headers, rows, filename);
  }, [sortedItems, dateRange, columns]);

  if (sortedItems.length === 0) {
    return (
      <div className="data-table-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">🎨</div>
          <div className="empty-state-title">No creative data</div>
          <div className="empty-state-text">
            Creative names are needed for A/B testing analysis.
            Ensure your CSV includes a &quot;Creative Name&quot; column.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <span className="data-table-title">
          Creative Performance ({sortedItems.length})
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
            {columns.map(col => (
              <th
                key={col.key}
                style={{ textAlign: col.align }}
                onClick={() => col.sortable && handleSort(col.key as SortField)}
              >
                {col.label}
                {sortField === col.key && (
                  <span className="sort-arrow">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
            <th style={{ textAlign: "left", minWidth: 100 }}>Spend Dist.</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <tr key={item.creativeName}>
              {columns.map(col => {
                if (col.key === "creativeName") {
                  return (
                    <td key={col.key} className="name-cell">
                      <FatigueDot frequency={item.frequency} />
                      {item.creativeName}
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
              <td>
                <SpendBar spend={item.spend} maxSpend={maxSpend} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
