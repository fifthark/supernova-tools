"use client";

import { PlatformSummary, PlacementSummary } from "@/lib/fb-ads/types";
import { fmtAUD, fmtPct, fmtNumber } from "@/lib/fb-ads/engine";

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface Props {
  platforms: PlatformSummary[];
  placements: PlacementSummary[];
}

export default function PlatformBreakdown({ platforms, placements }: Props) {
  // Only render if we have meaningful platform data (not just "Unknown")
  const realPlatforms = platforms.filter(p => p.platform !== "Unknown");
  const realPlacements = placements.filter(p => p.placement !== "Unknown");

  if (realPlatforms.length === 0 && realPlacements.length === 0) return null;

  const totalSpend = platforms.reduce((sum, p) => sum + p.spend, 0);
  const maxPlacementSpend = Math.max(...placements.map(p => p.spend), 1);

  return (
    <div className="platform-breakdown">
      {/* Platform comparison */}
      {realPlatforms.length > 0 && (
        <div className="platform-section">
          <div className="platform-section-title">Platform Performance</div>
          <div className="platform-cards">
            {realPlatforms.map(p => {
              const spendShare = totalSpend > 0 ? ((p.spend / totalSpend) * 100).toFixed(0) : "0";
              return (
                <div key={p.platform} className="platform-card">
                  <div className="platform-card-name">{p.platform}</div>
                  <div className="platform-card-spend">
                    {fmtAUD(p.spend)}
                    <span className="platform-card-share">{spendShare}%</span>
                  </div>
                  <div className="platform-card-metrics">
                    <div className="platform-metric">
                      <span className="platform-metric-label">CTR</span>
                      <span className="platform-metric-value">{fmtPct(p.ctr)}</span>
                    </div>
                    <div className="platform-metric">
                      <span className="platform-metric-label">CPC</span>
                      <span className="platform-metric-value">{p.cpc != null ? fmtAUD(p.cpc) : "—"}</span>
                    </div>
                    <div className="platform-metric">
                      <span className="platform-metric-label">Conv.</span>
                      <span className="platform-metric-value">{fmtNumber(p.conversions)}</span>
                    </div>
                    <div className="platform-metric">
                      <span className="platform-metric-label">Clicks</span>
                      <span className="platform-metric-value">{fmtNumber(p.linkClicks)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Placement breakdown */}
      {realPlacements.length > 0 && (
        <div className="platform-section">
          <div className="platform-section-title">Placement Breakdown</div>
          <table className="placement-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Placement</th>
                <th>Spend</th>
                <th>Dist.</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {realPlacements
                .sort((a, b) => b.spend - a.spend)
                .map(p => {
                  const barPct = maxPlacementSpend > 0 ? (p.spend / maxPlacementSpend) * 100 : 0;
                  return (
                    <tr key={p.placement}>
                      <td className="placement-name">{p.placement}</td>
                      <td style={{ textAlign: "right" }}>{fmtAUD(p.spend)}</td>
                      <td>
                        <div className="spend-bar-bg" style={{ width: 60 }}>
                          <div className="spend-bar-fill" style={{ width: `${barPct}%` }} />
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>{fmtPct(p.ctr)}</td>
                      <td style={{ textAlign: "right" }}>{p.cpc != null ? fmtAUD(p.cpc) : "—"}</td>
                      <td style={{ textAlign: "right" }}>{fmtNumber(p.conversions)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
