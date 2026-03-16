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
  aggregateAdSets,
  aggregateAds,
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
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { start: start.toISOString().slice(0, 10), end };
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

  // Overall metrics
  const summaryMetrics = useMemo(
    () => computeOverallMetrics(filteredRecords),
    [filteredRecords]
  );

  // Previous-period metrics for delta chips
  const previousMetrics = useMemo(() => {
    const start = new Date(dateRange.start + "T00:00:00");
    const end = new Date(dateRange.end + "T00:00:00");
    const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff + 1);

    const prevRange: DateRange = {
      start: prevStart.toISOString().slice(0, 10),
      end: prevEnd.toISOString().slice(0, 10),
    };

    const prevRecords = filterByDateRange(rawRecords, prevRange);
    if (prevRecords.length === 0) return null;

    let prevFiltered = prevRecords;
    if (attributionWindow) {
      prevFiltered = filterByAttributionWindow(prevRecords, attributionWindow);
    }
    if (prevFiltered.length === 0) return null;

    return computeOverallMetrics(prevFiltered);
  }, [rawRecords, dateRange, attributionWindow]);

  // Attribution windows
  const uniqueWindows = useMemo(
    () => getUniqueAttributionWindows(rawRecords),
    [rawRecords]
  );

  // Daily time series (for trend charts)
  const dailyTimeSeries = useMemo(
    () => computeDailyTimeSeries(filteredRecords),
    [filteredRecords]
  );

  // Creative summaries
  const creativeSummaries = useMemo(
    () => aggregateByCreative(filteredRecords),
    [filteredRecords]
  );

  // Platform & Placement
  const platformSummaries = useMemo(
    () => metricAvailability.platform ? aggregateByPlatform(filteredRecords) : [],
    [filteredRecords, metricAvailability.platform]
  );

  const placementSummaries = useMemo(
    () => metricAvailability.placement ? aggregateByPlacement(filteredRecords) : [],
    [filteredRecords, metricAvailability.placement]
  );

  // Heatmap
  const showHeatmap = useMemo(() => hasHourlyData(filteredRecords), [filteredRecords]);
  const heatmapData = useMemo(
    () => showHeatmap ? computeHeatmap(filteredRecords) : [],
    [filteredRecords, showHeatmap]
  );

  // Recommendations
  const insightsCap = drilldown.level === "campaign" ? MAX_INSIGHTS_TOP : MAX_INSIGHTS_DRILL;
  const insights = useMemo(
    () => generateInsights(filteredRecords, dateRange, metricAvailability, insightsCap),
    [filteredRecords, dateRange, metricAvailability, insightsCap]
  );

  // Current drill level items
  const currentItems = useMemo(() => {
    switch (drilldown.level) {
      case "campaign":
        return aggregateCampaigns(filteredRecords);
      case "adSet":
        return aggregateAdSets(filteredRecords, drilldown.campaignId!);
      case "ad":
        return aggregateAds(filteredRecords, drilldown.adSetId!);
      case "creative":
        return aggregateByCreative(filteredRecords);
    }
  }, [filteredRecords, drilldown]);

  // Determine active objective for summary cards
  const activeObjective = useMemo(() => {
    if (drilldown.level === "campaign" || drilldown.level === "creative") {
      return null;  // Mixed objectives at top level
    }
    // When drilled into a campaign, use that campaign's objective
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

  const handleDrillDown = useCallback((item: any) => {
    if (drilldown.level === "campaign") {
      const campaign = item as CampaignSummary;
      setDrilldown({
        level: "adSet",
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        adSetId: null,
        adSetName: null,
      });
      setSortField("spend");
      setSortDirection("desc");
    } else if (drilldown.level === "adSet") {
      const adSet = item as AdSetSummary;
      setDrilldown({
        ...drilldown,
        level: "ad",
        adSetId: adSet.adSetId,
        adSetName: adSet.adSetName,
      });
      setSortField("spend");
      setSortDirection("desc");
    }
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
            availability={metricAvailability}
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
          {(metricAvailability.platform || metricAvailability.placement) && (
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
              level={drilldown.level}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onDrillDown={handleDrillDown}
              allRecords={filteredRecords}
              dateRange={dateRange}
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
