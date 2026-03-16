"use client";

import { Insight, MetricAvailability } from "@/lib/fb-ads/types";

// ═══════════════════════════════════════════════════════════════════
// DATA COMPLETENESS INDICATOR
// ═══════════════════════════════════════════════════════════════════

function DataCompleteness({ availability }: { availability: MetricAvailability }) {
  const fields: { key: keyof MetricAvailability; label: string }[] = [
    { key: "reach", label: "Reach/Frequency" },
    { key: "conversions", label: "Conversions" },
    { key: "conversionValue", label: "Revenue (ROAS)" },
    { key: "landingPageViews", label: "Landing Page Views" },
    { key: "platform", label: "Platform" },
    { key: "placement", label: "Placement" },
    { key: "videoViews", label: "Video Views" },
    { key: "hourlyData", label: "Hourly Data" },
  ];

  const present = fields.filter(f => availability[f.key]);
  const missing = fields.filter(f => !availability[f.key]);

  if (missing.length === 0) return null;

  return (
    <div className="data-completeness">
      <span className="data-completeness-label">Data available:</span>
      {present.map(f => (
        <span key={f.key} className="data-completeness-tag data-completeness-present">
          {f.label}
        </span>
      ))}
      {missing.map(f => (
        <span key={f.key} className="data-completeness-tag data-completeness-missing">
          {f.label}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SEVERITY INDICATOR
// ═══════════════════════════════════════════════════════════════════

function SeverityDot({ severity }: { severity: Insight["severity"] }) {
  return <div className={`insight-severity insight-severity-${severity}`} />;
}

function ConfidenceBadge({ confidence }: { confidence: Insight["confidence"] }) {
  return (
    <span className={`insight-confidence insight-confidence-${confidence}`}>
      {confidence}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface Props {
  insights: Insight[];
  availability: MetricAvailability;
}

export default function InsightsPanel({ insights, availability }: Props) {
  if (insights.length === 0) {
    return (
      <div className="insights-panel">
        <DataCompleteness availability={availability} />
      </div>
    );
  }

  const actions = insights.filter(i => i.severity === "action");
  const watches = insights.filter(i => i.severity === "watch");
  const wins = insights.filter(i => i.severity === "win");

  return (
    <div className="insights-panel">
      <div className="insights-panel-header">
        <span className="insights-panel-title">
          Insights
          {actions.length > 0 && (
            <span className="insights-action-count">{actions.length} action{actions.length > 1 ? "s" : ""} needed</span>
          )}
        </span>
      </div>

      <div className="insights-list">
        {insights.map(insight => (
          <div key={insight.id} className="insight-item">
            <SeverityDot severity={insight.severity} />
            <div className="insight-content">
              <div className="insight-title-row">
                <span className="insight-title">{insight.title}</span>
                <ConfidenceBadge confidence={insight.confidence} />
              </div>
              <div className="insight-why">{insight.why}</div>
              <div className="insight-action">{insight.action}</div>
              {insight.entityName && (
                <span className="insight-entity-chip">
                  {insight.entityType === "campaign" ? "Campaign" :
                   insight.entityType === "adSet" ? "Ad Set" :
                   insight.entityType === "creative" ? "Creative" : ""}: {insight.entityName}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <DataCompleteness availability={availability} />
    </div>
  );
}
