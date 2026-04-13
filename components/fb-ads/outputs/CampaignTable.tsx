"use client";

import React, { useMemo, useCallback, useEffect, useState } from "react";
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
  aggregateAds,
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
  selectedItemId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// METRIC ROW RENDERER (shared between parent rows and nested ad rows)
// ═══════════════════════════════════════════════════════════════════

function MetricRow({
  item,
  name,
  id,
  entityField,
  level,
  allRecords,
  avgMetrics,
  clickable,
  onClick,
  indent,
  expandToggle,
  selected,
}: {
  item: AnyItem;
  name: string;
  id: string;
  entityField: string;
  level: DrillLevel;
  allRecords: FBAdRecord[];
  avgMetrics: FBAdsMetrics;
  clickable: boolean;
  onClick?: () => void;
  indent?: boolean;
  expandToggle?: React.ReactNode;
  selected?: boolean;
}) {
  const className = [
    clickable ? "clickable" : "",
    indent ? "nested-ad-row" : "",
    selected ? "selected-row" : "",
  ].filter(Boolean).join(" ");

  return (
    <tr
      className={className}
      onClick={onClick}
    >
      {COLUMNS.map(col => {
        if (col.key === "name") {
          const spendSpark = level !== "creative"
            ? computeSparkline(allRecords, id, entityField as any, "spend")
            : [];
          return (
            <td key={col.key} className="name-cell">
              <div className="sparkline-cell" style={indent ? { paddingLeft: 24 } : undefined}>
                {expandToggle}
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
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
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
  selectedItemId,
}: Props) {
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  // Compute overall average metrics for conditional colouring
  const avgMetrics = useMemo(() => computeOverallMetrics(allRecords), [allRecords]);

  // Sort items
  const sortedItems = useMemo(
    () => sortItems(items as unknown as Record<string, unknown>[], sortField, sortDirection) as unknown as AnyItem[],
    [items, sortField, sortDirection]
  );

  // Pre-compute ads for each ad set when at adSet level
  const adsByAdSet = useMemo(() => {
    if (level !== "adSet") return new Map<string, AdSummary[]>();
    const map = new Map<string, AdSummary[]>();
    for (const item of sortedItems) {
      const adSet = item as AdSetSummary;
      const ads = aggregateAds(allRecords, adSet.adSetId);
      // Sort nested ads by the same field
      const sorted = sortItems(
        ads as unknown as Record<string, unknown>[],
        sortField,
        sortDirection
      ) as unknown as AdSummary[];
      map.set(adSet.adSetId, sorted);
    }
    return map;
  }, [level, sortedItems, allRecords, sortField, sortDirection]);

  const visibleAdSetIds = useMemo(
    () => level === "adSet"
      ? sortedItems.map(item => (item as AdSetSummary).adSetId)
      : [],
    [level, sortedItems]
  );

  const expandedVisibleCount = useMemo(
    () => visibleAdSetIds.filter(id => expandedAdSets.has(id)).length,
    [visibleAdSetIds, expandedAdSets]
  );

  const allVisibleExpanded = level === "adSet"
    && visibleAdSetIds.length > 0
    && expandedVisibleCount === visibleAdSetIds.length;

  useEffect(() => {
    if (level !== "adSet") {
      if (expandedAdSets.size > 0) {
        setExpandedAdSets(new Set());
      }
      return;
    }

    const visibleIds = new Set(visibleAdSetIds);
    setExpandedAdSets(prev => {
      const next = new Set(Array.from(prev).filter(id => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [level, visibleAdSetIds, expandedAdSets.size]);

  // Get name and entity field based on drill level
  const getItemName = useCallback((item: AnyItem, itemLevel?: DrillLevel): string => {
    const l = itemLevel || level;
    if ("creativeName" in item && l === "creative") return (item as CreativeSummary).creativeName;
    if ("campaignName" in item && l === "campaign") return (item as CampaignSummary).campaignName;
    if ("adSetName" in item && l === "adSet") return (item as AdSetSummary).adSetName;
    if ("adName" in item && l === "ad") return (item as AdSummary).adName;
    return "—";
  }, [level]);

  const getEntityId = useCallback((item: AnyItem, itemLevel?: DrillLevel): string => {
    const l = itemLevel || level;
    if ("creativeName" in item && l === "creative") return (item as CreativeSummary).creativeName;
    if ("campaignId" in item && l === "campaign") return (item as CampaignSummary).campaignId;
    if ("adSetId" in item && l === "adSet") return (item as AdSetSummary).adSetId;
    if ("adId" in item && l === "ad") return (item as AdSummary).adId;
    return "";
  }, [level]);

  const entityField = level === "campaign" ? "campaignId"
    : level === "adSet" ? "adSetId"
    : level === "ad" ? "adId"
    : "campaignId";

  const canDrillDown = level === "campaign" || level === "adSet";

  // Toggle expand/collapse for an ad set
  const toggleAdSet = useCallback((adSetId: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev);
      if (next.has(adSetId)) {
        next.delete(adSetId);
      } else {
        next.add(adSetId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const toggleAllAdSets = useCallback(() => {
    if (allVisibleExpanded) {
      setExpandedAdSets(new Set());
    } else {
      setExpandedAdSets(new Set(visibleAdSetIds));
    }
  }, [allVisibleExpanded, visibleAdSetIds]);

  // CSV export handler
  const handleExport = useCallback(() => {
    const headers = COLUMNS.map(c => c.label);
    const rows: (string | number | null)[][] = [];

    for (const item of sortedItems) {
      rows.push([
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

      // Include nested ads in export when at adSet level
      if (level === "adSet") {
        const adSetId = (item as AdSetSummary).adSetId;
        const ads = adsByAdSet.get(adSetId) || [];
        for (const ad of ads) {
          rows.push([
            `  └ ${ad.adName}`,
            ad.spend,
            ad.impressions,
            ad.linkClicks,
            ad.ctr,
            ad.cpc,
            ad.cpm,
            ad.conversions,
            ad.costPerConversion,
            ad.roas,
          ]);
        }
      }
    }

    const filename = `fb-ads-${level}-${dateRange.start}-to-${dateRange.end}.csv`;
    exportTableAsCSV(headers, rows, filename);
  }, [sortedItems, level, dateRange, getItemName, adsByAdSet]);

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
          {level === "adSet" && (
            <button
              className="btn-export"
              onClick={toggleAllAdSets}
              style={{ marginRight: 4 }}
            >
              {allVisibleExpanded ? "Collapse All" : "Expand All"}
            </button>
          )}
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
            const isAdSetLevel = level === "adSet";
            const isExpanded = isAdSetLevel && expandedAdSets.has(id);
            const isSelected = selectedItemId != null && selectedItemId === id;
            const ads = isAdSetLevel ? (adsByAdSet.get(id) || []) : [];

            return (
              <React.Fragment key={id}>
                <MetricRow
                  item={item}
                  name={name}
                  id={id}
                  entityField={entityField}
                  level={level}
                  allRecords={allRecords}
                  avgMetrics={avgMetrics}
                  clickable={canDrillDown}
                  onClick={canDrillDown ? () => onDrillDown(item) : isAdSetLevel ? () => toggleAdSet(id) : undefined}
                  selected={isSelected}
                  expandToggle={isAdSetLevel ? (
                    <button
                      className="expand-toggle"
                      onClick={(e) => { e.stopPropagation(); toggleAdSet(id); }}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <span className={`expand-arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
                    </button>
                  ) : undefined}
                />
                {isExpanded && ads.map(ad => (
                  <MetricRow
                    key={ad.adId}
                    item={ad}
                    name={ad.adName}
                    id={ad.adId}
                    entityField="adId"
                    level="ad"
                    allRecords={allRecords}
                    avgMetrics={avgMetrics}
                    clickable={false}
                    indent
                  />
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
