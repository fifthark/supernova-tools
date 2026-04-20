"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FBAdsMetrics,
  CampaignSummary,
  AdSetSummary,
  AdSummary,
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
  aggregateAdSets,
  aggregateAds,
} from "@/lib/fb-ads/engine";
import { METRIC_DIRECTIONS } from "@/lib/fb-ads/constants";

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

interface Props {
  items: CampaignSummary[];
  level: DrillLevel;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onDrillDown: (item: CampaignSummary | AdSetSummary) => void;
  allRecords: FBAdRecord[];
  dateRange: { start: string; end: string };
  selectedCampaignId?: string | null;
  selectedAdSetId?: string | null;
}

type RenderItem = CampaignSummary | AdSetSummary | AdSummary;

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
  indentLevel = 0,
  rowClass,
  selected,
  expandToggle,
}: {
  item: RenderItem;
  name: string;
  id: string;
  entityField: "campaignId" | "adSetId" | "adId";
  level: DrillLevel;
  allRecords: FBAdRecord[];
  avgMetrics: FBAdsMetrics;
  clickable: boolean;
  onClick?: () => void;
  indentLevel?: number;
  rowClass?: string;
  selected?: boolean;
  expandToggle?: React.ReactNode;
}) {
  const className = [clickable ? "clickable" : "", rowClass || "", selected ? "selected-row" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={className} onClick={onClick}>
      {COLUMNS.map(col => {
        if (col.key === "name") {
          const spendSpark = computeSparkline(allRecords, id, entityField, "spend");
          return (
            <td key={col.key} className="name-cell">
              <div className="sparkline-cell" style={{ paddingLeft: indentLevel > 0 ? indentLevel * 20 : 0 }}>
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
          <td key={col.key} className={colourClass} style={{ textAlign: col.align }}>
            {formatted}
          </td>
        );
      })}
    </tr>
  );
}

export default function CampaignTable({
  items,
  level,
  sortField,
  sortDirection,
  onSort,
  onDrillDown,
  allRecords,
  dateRange,
  selectedCampaignId,
  selectedAdSetId,
}: Props) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  const avgMetrics = useMemo(() => computeOverallMetrics(allRecords), [allRecords]);
  const isNameSort = sortField === "campaignName" || sortField === "adSetName" || sortField === "adName";

  const resolveSortField = useCallback((itemLevel: "campaign" | "adSet" | "ad"): SortField => {
    if (sortField === "campaignName" || sortField === "adSetName" || sortField === "adName") {
      return itemLevel === "campaign"
        ? "campaignName"
        : itemLevel === "adSet"
        ? "adSetName"
        : "adName";
    }
    return sortField;
  }, [sortField]);

  const sortedCampaigns = useMemo(
    () => sortItems(items as unknown as Record<string, unknown>[], resolveSortField("campaign"), sortDirection) as unknown as CampaignSummary[],
    [items, resolveSortField, sortDirection]
  );

  const adSetsByCampaign = useMemo(() => {
    const map = new Map<string, AdSetSummary[]>();
    for (const campaign of sortedCampaigns) {
      const adSets = aggregateAdSets(allRecords, campaign.campaignId);
      const sortedAdSets = sortItems(
        adSets as unknown as Record<string, unknown>[],
        resolveSortField("adSet"),
        sortDirection
      ) as unknown as AdSetSummary[];
      map.set(campaign.campaignId, sortedAdSets);
    }
    return map;
  }, [sortedCampaigns, allRecords, resolveSortField, sortDirection]);

  const adsByAdSet = useMemo(() => {
    const map = new Map<string, AdSummary[]>();
    for (const adSets of adSetsByCampaign.values()) {
      for (const adSet of adSets) {
        const ads = aggregateAds(allRecords, adSet.adSetId);
        const sortedAds = sortItems(
          ads as unknown as Record<string, unknown>[],
          resolveSortField("ad"),
          sortDirection
        ) as unknown as AdSummary[];
        map.set(adSet.adSetId, sortedAds);
      }
    }
    return map;
  }, [adSetsByCampaign, allRecords, resolveSortField, sortDirection]);

  const visibleCampaignIds = useMemo(
    () => sortedCampaigns.map(campaign => campaign.campaignId),
    [sortedCampaigns]
  );

  const visibleAdSetIds = useMemo(
    () => Array.from(adSetsByCampaign.values()).flat().map(adSet => adSet.adSetId),
    [adSetsByCampaign]
  );

  useEffect(() => {
    const visibleIds = new Set(visibleCampaignIds);
    setExpandedCampaigns(prev => {
      const next = new Set(Array.from(prev).filter(id => visibleIds.has(id)));
      if (next.size === 0 && visibleCampaignIds.length > 0) {
        return new Set(visibleCampaignIds);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [visibleCampaignIds]);

  useEffect(() => {
    const visibleIds = new Set(visibleAdSetIds);
    setExpandedAdSets(prev => {
      const next = new Set(Array.from(prev).filter(id => visibleIds.has(id)));
      if (next.size === 0 && visibleAdSetIds.length > 0) {
        return new Set(visibleAdSetIds);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [visibleAdSetIds]);

  const expandedVisibleCampaigns = useMemo(
    () => visibleCampaignIds.filter(id => expandedCampaigns.has(id)).length,
    [visibleCampaignIds, expandedCampaigns]
  );

  const expandedVisibleAdSets = useMemo(
    () => visibleAdSetIds.filter(id => expandedAdSets.has(id)).length,
    [visibleAdSetIds, expandedAdSets]
  );

  const allExpanded = visibleCampaignIds.length > 0
    && visibleAdSetIds.length > 0
    && expandedVisibleCampaigns === visibleCampaignIds.length
    && expandedVisibleAdSets === visibleAdSetIds.length;

  const toggleCampaign = useCallback((campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  }, []);

  const toggleAdSet = useCallback((adSetId: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev);
      if (next.has(adSetId)) next.delete(adSetId);
      else next.add(adSetId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedCampaigns(new Set());
      setExpandedAdSets(new Set());
    } else {
      setExpandedCampaigns(new Set(visibleCampaignIds));
      setExpandedAdSets(new Set(visibleAdSetIds));
    }
  }, [allExpanded, visibleCampaignIds, visibleAdSetIds]);

  const handleExport = useCallback(() => {
    const headers = COLUMNS.map(c => c.label);
    const rows: (string | number | null)[][] = [];

    for (const campaign of sortedCampaigns) {
      rows.push([
        campaign.campaignName,
        campaign.spend,
        campaign.impressions,
        campaign.linkClicks,
        campaign.ctr,
        campaign.cpc,
        campaign.cpm,
        campaign.conversions,
        campaign.costPerConversion,
        campaign.roas,
      ]);

      for (const adSet of adSetsByCampaign.get(campaign.campaignId) || []) {
        rows.push([
          `  └ ${adSet.adSetName}`,
          adSet.spend,
          adSet.impressions,
          adSet.linkClicks,
          adSet.ctr,
          adSet.cpc,
          adSet.cpm,
          adSet.conversions,
          adSet.costPerConversion,
          adSet.roas,
        ]);

        for (const ad of adsByAdSet.get(adSet.adSetId) || []) {
          rows.push([
            `      └ ${ad.adName}`,
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

    exportTableAsCSV(headers, rows, `fb-ads-breakdown-${dateRange.start}-to-${dateRange.end}.csv`);
  }, [sortedCampaigns, adSetsByCampaign, adsByAdSet, dateRange]);

  if (sortedCampaigns.length === 0) {
    return (
      <div className="data-table-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No campaigns found</div>
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
          Campaign Breakdown ({sortedCampaigns.length} campaigns)
        </span>
        <div className="data-table-actions">
          <button className="btn-export" onClick={toggleAll}>
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
          <button className="btn-export" onClick={handleExport}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map(col => {
              const headerField = col.key === "name" ? "campaignName" : col.key as SortField;
              const isSorted = col.key === "name" ? isNameSort : sortField === col.key;

              return (
                <th
                  key={col.key}
                  style={{ textAlign: col.align }}
                  onClick={() => col.sortable && onSort(headerField)}
                >
                  {col.label}
                  {isSorted && (
                    <span className="sort-arrow">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedCampaigns.map(campaign => {
            const campaignExpanded = expandedCampaigns.has(campaign.campaignId);
            const adSets = adSetsByCampaign.get(campaign.campaignId) || [];

            return (
              <React.Fragment key={campaign.campaignId}>
                <MetricRow
                  item={campaign}
                  name={campaign.campaignName}
                  id={campaign.campaignId}
                  entityField="campaignId"
                  level={level}
                  allRecords={allRecords}
                  avgMetrics={avgMetrics}
                  clickable
                  onClick={() => onDrillDown(campaign)}
                  selected={selectedCampaignId === campaign.campaignId && !selectedAdSetId}
                  expandToggle={(
                    <button
                      className="expand-toggle"
                      onClick={e => {
                        e.stopPropagation();
                        toggleCampaign(campaign.campaignId);
                      }}
                      aria-label={campaignExpanded ? "Collapse campaign" : "Expand campaign"}
                    >
                      <span className={`expand-arrow ${campaignExpanded ? "expanded" : ""}`}>▶</span>
                    </button>
                  )}
                />

                {campaignExpanded && adSets.map(adSet => {
                  const adSetExpanded = expandedAdSets.has(adSet.adSetId);
                  const ads = adsByAdSet.get(adSet.adSetId) || [];

                  return (
                    <React.Fragment key={adSet.adSetId}>
                      <MetricRow
                        item={adSet}
                        name={adSet.adSetName}
                        id={adSet.adSetId}
                        entityField="adSetId"
                        level="adSet"
                        allRecords={allRecords}
                        avgMetrics={avgMetrics}
                        clickable
                        onClick={() => onDrillDown(adSet)}
                        indentLevel={1}
                        rowClass="nested-adset-row"
                        selected={selectedAdSetId === adSet.adSetId}
                        expandToggle={(
                          <button
                            className="expand-toggle"
                            onClick={e => {
                              e.stopPropagation();
                              toggleAdSet(adSet.adSetId);
                            }}
                            aria-label={adSetExpanded ? "Collapse ad set" : "Expand ad set"}
                          >
                            <span className={`expand-arrow ${adSetExpanded ? "expanded" : ""}`}>▶</span>
                          </button>
                        )}
                      />

                      {adSetExpanded && ads.map(ad => (
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
                          indentLevel={2}
                          rowClass="nested-ad-row"
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
