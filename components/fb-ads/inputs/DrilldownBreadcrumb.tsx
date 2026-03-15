"use client";

import { DrilldownState } from "@/lib/fb-ads/types";

interface Props {
  drilldown: DrilldownState;
  onNavigate: (drilldown: DrilldownState) => void;
}

export default function DrilldownBreadcrumb({ drilldown, onNavigate }: Props) {
  const goToCampaigns = () =>
    onNavigate({ level: "campaign", campaignId: null, campaignName: null, adSetId: null, adSetName: null });

  const goToAdSets = () =>
    onNavigate({ ...drilldown, level: "adSet", adSetId: null, adSetName: null });

  const goToCreative = () =>
    onNavigate({ level: "creative", campaignId: null, campaignName: null, adSetId: null, adSetName: null });

  return (
    <div className="breadcrumb">
      {drilldown.level === "campaign" && (
        <span className="breadcrumb-active">All Campaigns</span>
      )}

      {drilldown.level === "creative" && (
        <span className="breadcrumb-active">Creative Performance</span>
      )}

      {drilldown.level === "adSet" && (
        <>
          <span className="breadcrumb-item" onClick={goToCampaigns}>
            All Campaigns
          </span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-active">
            {drilldown.campaignName || drilldown.campaignId}
          </span>
        </>
      )}

      {drilldown.level === "ad" && (
        <>
          <span className="breadcrumb-item" onClick={goToCampaigns}>
            All Campaigns
          </span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-item" onClick={goToAdSets}>
            {drilldown.campaignName || drilldown.campaignId}
          </span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-active">
            {drilldown.adSetName || drilldown.adSetId}
          </span>
        </>
      )}

      {/* Quick link to creative view */}
      {drilldown.level === "campaign" && (
        <span
          className="breadcrumb-item"
          onClick={goToCreative}
          style={{ marginLeft: "auto", fontSize: 12 }}
        >
          View by Creative →
        </span>
      )}

      {drilldown.level !== "campaign" && drilldown.level !== "creative" && (
        <span
          className="breadcrumb-item"
          onClick={goToCampaigns}
          style={{ marginLeft: "auto", fontSize: 12 }}
        >
          ← Back to All
        </span>
      )}

      {drilldown.level === "creative" && (
        <span
          className="breadcrumb-item"
          onClick={goToCampaigns}
          style={{ marginLeft: "auto", fontSize: 12 }}
        >
          ← View by Campaign
        </span>
      )}
    </div>
  );
}
