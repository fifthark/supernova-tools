"use client";

import { useState } from "react";
import { HeatmapCell } from "@/lib/fb-ads/types";
import { DAYS_OF_WEEK, HEATMAP_MIN_IMPRESSIONS } from "@/lib/fb-ads/constants";
import { fmtPct, fmtAUD } from "@/lib/fb-ads/engine";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type HeatmapMetric = "ctr" | "cpc" | "spend";

interface Props {
  cells: HeatmapCell[];
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const METRIC_COLORS: Record<HeatmapMetric, string> = {
  ctr: "124, 58, 237",    // purple
  cpc: "6, 182, 212",     // cyan
  spend: "255, 95, 31",   // orange
};

function getCellValue(cell: HeatmapCell, metric: HeatmapMetric): number | null {
  switch (metric) {
    case "ctr": return cell.ctr;
    case "cpc": return cell.cpc;
    case "spend": return cell.spend;
  }
}

function formatCellValue(value: number | null, metric: HeatmapMetric): string {
  if (value == null) return "—";
  switch (metric) {
    case "ctr": return fmtPct(value);
    case "cpc": return fmtAUD(value);
    case "spend": return fmtAUD(value);
  }
}

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function PerformanceHeatmap({ cells }: Props) {
  const [metric, setMetric] = useState<HeatmapMetric>("ctr");

  // Build lookup: dayOfWeek -> hourOfDay -> cell
  const cellMap = new Map<string, HeatmapCell>();
  for (const cell of cells) {
    cellMap.set(`${cell.dayOfWeek}-${cell.hourOfDay}`, cell);
  }

  // Compute min/max for color scaling (only cells with sufficient impressions)
  const validValues: number[] = [];
  for (const cell of cells) {
    if (cell.impressions >= HEATMAP_MIN_IMPRESSIONS) {
      const v = getCellValue(cell, metric);
      if (v != null) validValues.push(v);
    }
  }

  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 1;
  const range = maxVal - minVal || 1;

  // Hours to show (only hours that have any data)
  const hoursWithData = new Set(cells.map(c => c.hourOfDay));
  const hours = Array.from(hoursWithData).sort((a, b) => a - b);

  if (hours.length === 0) return null;

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <span className="heatmap-title">Performance by Day & Hour</span>
        <div className="heatmap-metric-toggle">
          {(["ctr", "cpc", "spend"] as HeatmapMetric[]).map(m => (
            <button
              key={m}
              className={`heatmap-metric-btn ${metric === m ? "active" : ""}`}
              onClick={() => setMetric(m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="heatmap-grid" style={{ gridTemplateColumns: `48px repeat(${hours.length}, 1fr)` }}>
        {/* Hour labels row */}
        <div className="heatmap-corner" />
        {hours.map(h => (
          <div key={h} className="heatmap-hour-label">{formatHour(h)}</div>
        ))}

        {/* Data rows */}
        {DAYS_OF_WEEK.map((dayName, dow) => (
          <>
            <div key={`label-${dow}`} className="heatmap-label">{dayName}</div>
            {hours.map(hour => {
              const cell = cellMap.get(`${dow}-${hour}`);
              if (!cell || cell.impressions < HEATMAP_MIN_IMPRESSIONS) {
                return (
                  <div
                    key={`${dow}-${hour}`}
                    className="heatmap-cell heatmap-cell-insufficient"
                    title={cell ? `${cell.impressions} impressions (insufficient)` : "No data"}
                  >
                    —
                  </div>
                );
              }

              const value = getCellValue(cell, metric);
              const opacity = value != null ? 0.15 + ((value - minVal) / range) * 0.75 : 0;
              const rgb = METRIC_COLORS[metric];

              return (
                <div
                  key={`${dow}-${hour}`}
                  className="heatmap-cell"
                  style={{ backgroundColor: `rgba(${rgb}, ${opacity.toFixed(2)})` }}
                  title={`${dayName} ${formatHour(hour)}: ${formatCellValue(value, metric)} (${cell.impressions.toLocaleString()} impr.)`}
                />
              );
            })}
          </>
        ))}
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Low</span>
        <div className="heatmap-legend-gradient" style={{
          background: `linear-gradient(to right, rgba(${METRIC_COLORS[metric]}, 0.1), rgba(${METRIC_COLORS[metric]}, 0.9))`,
        }} />
        <span className="heatmap-legend-label">High</span>
      </div>
    </div>
  );
}
