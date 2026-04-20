"use client";

import { useState, useMemo, useCallback } from "react";
import {
  FBAdRecord,
  DateRange,
  DrilldownState,
  DrillLevel,
  SortField,
  SortDirection,
  DataQualityWarning,
  ParseResult,
  CampaignSummary,
  AdSetSummary,
  MetricAvailability,
} from "@/lib/fb-ads/types";
import {
  computeOverallMetrics,
  aggregateCampaigns,
  aggregateByCreative,
  aggregateByPlatform,
  aggregateByPlacement,
  filterByDateRange,
  filterByAttributionWindow,
  getUniqueAttributionWindows,
  getMostCommonAttributionWindow,
  computeDailyTimeSeries,
  buildMetricAvailability,
  hasHourlyData,
  computeHeatmap,
} from "@/lib/fb-ads/engine";
import { addDaysLocal, formatDateLocal, parseDateLocal } from "@/lib/fb-ads/date-utils";
import { generateInsights } from "@/lib/fb-ads/recommendations";
import { MAX_INSIGHTS_TOP, MAX_INSIGHTS_DRILL } from "@/lib/fb-ads/constants";
import { validateData } from "@/lib/fb-ads/validation";

import DataSourceSelector from "@/components/fb-ads/inputs/DataSourceSelector";
import DateRangePicker from "@/components/fb-ads/inputs/DateRangePicker";
import DrilldownBreadcrumb from "@/components/fb-ads/inputs/DrilldownBreadcrumb";
import DataQualityBanner from "@/components/fb-ads/outputs/DataQualityBanner";
import SummaryCards from "@/components/fb-ads/outputs/SummaryCards";
import CampaignTable from "@/components/fb-ads/outputs/CampaignTable";
import CreativeTable from "@/components/fb-ads/outputs/CreativeTable";
import InsightsPanel from "@/components/fb-ads/outputs/InsightsPanel";
import PlatformBreakdown from "@/components/fb-ads/outputs/PlatformBreakdown";
import SpendTrendLine from "@/components/fb-ads/charts/SpendTrendLine";
import CTRTrendLine from "@/components/fb-ads/charts/CTRTrendLine";
import CPCTrendLine from "@/components/fb-ads/charts/CPCTrendLine";
import PerformanceHeatmap from "@/components/fb-ads/charts/PerformanceHeatmap";

// ═══════════════════════════════════════════════════════════════════
// DEFAULT DATE RANGE (last 30 days)
// ═══════════════════════════════════════════════════════════════════

function defaultDateRange(): DateRange {
  const now = new Date();
  return {
    start: formatDateLocal(addDaysLocal(now, -29)),
    end: formatDateLocal(now),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function FBAdsPage() {
  // ─── State ───
  const [rawRecords, setRawRecords] = useState<FBAdRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<DataQualityWarning[]>([]);
  const [presentFields, setPresentFields] = useState<Set<string>>(new Set());

  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [attributionWindow, setAttributionWindow] = useState<string | null>(null);

  const [drilldown, setDrilldown] = useState<DrilldownState>({
    level: "campaign",
    campaignId: null,
    campaignName: null,
    adSetId: null,
    adSetName: null,
  });

  const [sortField, setSortField] = useState<SortField>("spend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showCharts, setShowCharts] = useState(true);

  // ─── Data Loading ───
  const handleDataLoaded = useCallback((result: ParseResult & { _fileName?: string }) => {
    setRawRecords(result.records);
    setFileName(result._fileName || "CSV Upload");

    // Detect present fields from first record
    const fields = new Set<string>();
    if (result.records.length > 0) {
      const sample = result.records[0];
      for (const [key, value] of Object.entries(sample)) {
        if (value != null && value !== "") fields.add(key);
      }
    }
    setPresentFields(fields);

    // Run validation
    const validationWarnings = validateData(result.records, fields);
    setWarnings([...result.warnings, ...validationWarnings]);

    // Auto-select attribution window if multiple exist
    const windows = getUniqueAttributionWindows(result.records);
    if (windows.length > 1) {
      setAttributionWindow(getMostCommonAttributionWindow(result.records));
    } else {
      setAttributionWindow(null);  // null = no filter needed
    }

    // Auto-adjust date range to match data
    if (result.records.length > 0) {
      const dates = result.records.map(r => r.date).filter(d => d !== "Invalid").sort();
      setDateRange({ start: dates[0], end: dates[dates.length - 1] });
    }

    // Reset drill-down
    setDrilldown({
      level: "campaign",
      campaignId: null,
      campaignName: null,
      adSetId: null,
      adSetName: null,
    });
  }, []);

  // ─── Derived Data ───

  // Filter by date range
  const dateFiltered = useMemo(
    () => filterByDateRange(rawRecords, dateRange),
    [rawRecords, dateRange]
  );

  // Filter by attribution window (if multiple exist)
  const filteredRecords = useMemo(() => {
    if (attributionWindow) {
      return filterByAttributionWindow(dateFiltered, attributionWindow);
    }
    return dateFiltered;
  }, [dateFiltered, attributionWindow]);

  // Metric availability (what fields exist in the data)
  const metricAvailability = useMemo<MetricAvailability>(
    () => buildMetricAvailability(filteredRecords),
    [filteredRecords]
  );

  const dataDateBounds = useMemo(() => {
    if (rawRecords.length === 0) return null;
    const sortedDates = rawRecords.map(r => r.date).filter(Boolean).sort();
    return {
      min: sortedDates[0],
      max: sortedDates[sortedDates.length - 1],
    };
  }, [rawRecords]);

  // Records scoped to current selection context
  const drilldownRecords = useMemo(() => {
    if (drilldown.level === "creative") return filteredRecords;
    if (drilldown.adSetId) {
      return filteredRecords.filter(r => r.adSetId === drilldown.adSetId);
    }
    if (drilldown.campaignId) {
      return filteredRecords.filter(r => r.campaignId === drilldown.campaignId);
    }
    return filteredRecords;
  }, [filteredRecords, drilldown]);

  const scopedMetricAvailability = useMemo<MetricAvailability>(
    () => buildMetricAvailability(drilldownRecords),
    [drilldownRecords]
  );

  // Overall metrics
  const summaryMetrics = useMemo(
    () => computeOverallMetrics(drilldownRecords),
    [drilldownRecords]
  );

  // Previous-period metrics for delta chips
  const previousMetrics = useMemo(() => {
    const start = parseDateLocal(dateRange.start);
    const end = parseDateLocal(dateRange.end);
    const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const prevEnd = addDaysLocal(start, -1);
    const prevStart = addDaysLocal(prevEnd, -daysDiff + 1);

    const prevRange: DateRange = {
      start: formatDateLocal(prevStart),
      end: formatDateLocal(prevEnd),
    };

    let prevRecords = filterByDateRange(rawRecords, prevRange);
    if (prevRecords.length === 0) return null;

    if (attributionWindow) {
      prevRecords = filterByAttributionWindow(prevRecords, attributionWindow);
    }
    if (drilldown.adSetId) {
      prevRecords = prevRecords.filter(r => r.adSetId === drilldown.adSetId);
    } else if (drilldown.campaignId) {
      prevRecords = prevRecords.filter(r => r.campaignId === drilldown.campaignId);
    }
    if (prevRecords.length === 0) return null;

    return computeOverallMetrics(prevRecords);
  }, [rawRecords, dateRange, attributionWindow, drilldown]);

  // Attribution windows
  const uniqueWindows = useMemo(
    () => getUniqueAttributionWindows(rawRecords),
    [rawRecords]
  );

  // Daily time series (for trend charts)
  const dailyTimeSeries = useMemo(
    () => computeDailyTimeSeries(drilldownRecords),
    [drilldownRecords]
  );

  // Creative summaries
  const creativeSummaries = useMemo(
    () => aggregateByCreative(filteredRecords),
    [filteredRecords]
  );

  // Platform & Placement
  const platformSummaries = useMemo(
    () => scopedMetricAvailability.platform ? aggregateByPlatform(drilldownRecords) : [],
    [drilldownRecords, scopedMetricAvailability.platform]
  );

  const placementSummaries = useMemo(
    () => scopedMetricAvailability.placement ? aggregateByPlacement(drilldownRecords) : [],
    [drilldownRecords, scopedMetricAvailability.placement]
  );

  // Heatmap
  const showHeatmap = useMemo(() => hasHourlyData(drilldownRecords), [drilldownRecords]);
  const heatmapData = useMemo(
    () => showHeatmap ? computeHeatmap(drilldownRecords) : [],
    [drilldownRecords, showHeatmap]
  );

  // Recommendations
  const insightsCap = drilldown.campaignId || drilldown.adSetId ? MAX_INSIGHTS_DRILL : MAX_INSIGHTS_TOP;
  const insights = useMemo(
    () => generateInsights(drilldownRecords, dateRange, scopedMetricAvailability, insightsCap),
    [drilldownRecords, dateRange, scopedMetricAvailability, insightsCap]
  );

  // Current drill level items
  const currentItems = useMemo(() => {
    return aggregateCampaigns(filteredRecords);
  }, [filteredRecords]);

  // Determine active objective for summary cards
  const activeObjective = useMemo(() => {
    if (!drilldown.campaignId || drilldown.level === "creative") {
      return null;  // Mixed objectives at top level
    }
    const campaignRecords = filteredRecords.filter(r => r.campaignId === drilldown.campaignId);
    if (campaignRecords.length > 0 && campaignRecords[0].campaignObjective) {
      return campaignRecords[0].campaignObjective;
    }
    return null;
  }, [filteredRecords, drilldown]);

  // ─── Handlers ───

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const handleDrillDown = useCallback((item: CampaignSummary | AdSetSummary) => {
    if ("adSetId" in item) {
      const adSet = item as AdSetSummary;
      const isSameAdSet = drilldown.adSetId === adSet.adSetId;
      setDrilldown({
        level: isSameAdSet ? "adSet" : "ad",
        campaignId: adSet.campaignId,
        campaignName: adSet.campaignName,
        adSetId: isSameAdSet ? null : adSet.adSetId,
        adSetName: isSameAdSet ? null : adSet.adSetName,
      });
    } else {
      const campaign = item as CampaignSummary;
      const isSameCampaign = drilldown.campaignId === campaign.campaignId && drilldown.adSetId == null;
      setDrilldown({
        level: isSameCampaign ? "campaign" : "adSet",
        campaignId: isSameCampaign ? null : campaign.campaignId,
        campaignName: isSameCampaign ? null : campaign.campaignName,
        adSetId: null,
        adSetName: null,
      });
    }
    setSortField("spend");
    setSortDirection("desc");
  }, [drilldown]);

  const handleNavigate = useCallback((newDrilldown: DrilldownState) => {
    setDrilldown(newDrilldown);
    setSortField("spend");
    setSortDirection("desc");
  }, []);

  // ─── Empty State ───

  const hasData = rawRecords.length > 0;
  const isCreativeView = drilldown.level === "creative";

  return (
    <div className="fb-ads-container">
      {/* Controls Row */}
      <div className="fb-ads-controls">
        <div style={{ flex: 1, minWidth: 280 }}>
          <DataSourceSelector
            onDataLoaded={handleDataLoaded}
            loading={loading}
            recordCount={hasData ? rawRecords.length : null}
            fileName={fileName}
          />
        </div>
        {hasData && (
          <div>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={dataDateBounds?.min || null}
              maxDate={dataDateBounds?.max || null}
            />
          </div>
        )}
      </div>

      {/* Attribution Window Filter */}
      {uniqueWindows.length > 1 && (
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="label" style={{ fontSize: 12 }}>Attribution:</span>
          <select
            className="date-input"
            value={attributionWindow || ""}
            onChange={e => setAttributionWindow(e.target.value || null)}
          >
            {uniqueWindows.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      )}

      {/* Data Quality Warnings */}
      <DataQualityBanner warnings={warnings} />

      {/* Dashboard Content */}
      {hasData ? (
        <>
          {/* Insights Panel — actionable recommendations first */}
          <InsightsPanel
            insights={insights}
            availability={scopedMetricAvailability}
          />

          {/* Breadcrumb */}
          <DrilldownBreadcrumb
            drilldown={drilldown}
            onNavigate={handleNavigate}
          />

          {/* Summary Cards with delta chips */}
          <SummaryCards
            metrics={summaryMetrics}
            objective={activeObjective}
            previousMetrics={previousMetrics}
          />

          {/* Platform & Placement Breakdown */}
          {(scopedMetricAvailability.platform || scopedMetricAvailability.placement) && (
            <PlatformBreakdown
              platforms={platformSummaries}
              placements={placementSummaries}
            />
          )}

          {/* Trend Charts (at all drill levels, collapsible) */}
          {dailyTimeSeries.length >= 2 && (
            <div className="charts-section">
              <div className="charts-section-header">
                <span className="charts-section-title">Trends</span>
                <button
                  className="btn-toggle-charts"
                  onClick={() => setShowCharts(prev => !prev)}
                >
                  {showCharts ? "Hide" : "Show"} charts
                </button>
              </div>
              {showCharts && (
                <div className="trend-charts-grid">
                  <SpendTrendLine data={dailyTimeSeries} />
                  <CTRTrendLine data={dailyTimeSeries} />
                  <CPCTrendLine data={dailyTimeSeries} />
                </div>
              )}
            </div>
          )}

          {/* Performance Heatmap (if hourly data exists) */}
          {showHeatmap && heatmapData.length > 0 && (
            <PerformanceHeatmap cells={heatmapData} />
          )}

          {/* Creative Performance Table or Main Table */}
          {isCreativeView ? (
            <CreativeTable
              items={creativeSummaries}
              allRecords={filteredRecords}
              dateRange={dateRange}
              availability={metricAvailability}
            />
          ) : (
            <CampaignTable
              items={currentItems}
              level="campaign"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onDrillDown={handleDrillDown}
              allRecords={filteredRecords}
              dateRange={dateRange}
              selectedCampaignId={drilldown.campaignId}
              selectedAdSetId={drilldown.adSetId}
            />
          )}
        </>
      ) : (
        !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No data loaded</div>
            <div className="empty-state-text">
              Upload a CSV exported from Facebook Ads Manager to get started.
              The dashboard will automatically detect your columns and compute key metrics.
            </div>
          </div>
        )
      )}
    </div>
  );
}
