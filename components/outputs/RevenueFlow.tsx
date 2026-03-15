"use client";

import type { TournamentResult } from "@/lib/calc/types";

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface RevenueFlowProps {
  result: TournamentResult;
}

export function RevenueFlow({ result }: RevenueFlowProps) {
  return (
    <div className="card">
      <div className="section-header">Revenue Flow</div>
      <div className="revenue-row">
        <span>Gross Revenue</span>
        <span style={{ fontWeight: 500 }}>{fmt$(result.grossRevenue)}</span>
      </div>
      {result.platformFees > 0 && (
        <div className="revenue-row">
          <span>Platform Fees</span>
          <span className="deduction">-{fmt$(result.platformFees)}</span>
        </div>
      )}
      {result.refundLeakage > 0 && (
        <div className="revenue-row">
          <span>Refund Leakage</span>
          <span className="deduction">-{fmt$(result.refundLeakage)}</span>
        </div>
      )}
      {result.additionalRevenue > 0 && (
        <div className="revenue-row">
          <span>Sponsorship & Grants</span>
          <span style={{ fontWeight: 500, color: "var(--accent-profit)" }}>+{fmt$(result.additionalRevenue)}</span>
        </div>
      )}
      <div className="revenue-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
        <span style={{ fontWeight: 600 }}>Net Revenue</span>
        <span style={{ fontWeight: 600 }}>{fmt$(result.netRevenue + result.additionalRevenue)}</span>
      </div>
    </div>
  );
}
