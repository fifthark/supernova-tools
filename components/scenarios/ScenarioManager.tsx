"use client";

import { useState } from "react";
import type { TournamentInput, TournamentResult, SavedScenario } from "@/lib/calc/types";

interface ScenarioManagerProps {
  inputs: TournamentInput;
  result: TournamentResult;
  format: string;
  saved: SavedScenario[];
  onSave: (scenario: SavedScenario) => void;
  onDelete: (id: string) => void;
  onLoad: (scenario: SavedScenario) => void;
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export function ScenarioManager({
  inputs,
  result,
  format,
  saved,
  onSave,
  onDelete,
  onLoad,
}: ScenarioManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [label, setLabel] = useState("");

  const defaultLabel = `${format} — ${result.totalPools}p @ $${inputs.pricePerPlayer}`;

  const handleSave = () => {
    const scenario: SavedScenario = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: label.trim() || defaultLabel,
      timestamp: Date.now(),
      inputs: { ...inputs },
      result: { ...result },
    };
    onSave(scenario);
    setShowModal(false);
    setLabel("");
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className="btn-secondary btn-small"
          onClick={() => {
            setLabel(defaultLabel);
            setShowModal(true);
          }}
          disabled={saved.length >= 3}
        >
          Save Scenario {saved.length >= 3 && "(Max 3)"}
        </button>
      </div>

      {saved.length > 0 && (
        <div className="card">
          <div className="section-header">Saved Scenarios</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {saved.map((s) => (
              <div key={s.id} className="scenario-card" style={{
                padding: "10px 14px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ color: s.result.profit >= 0 ? "var(--accent-profit)" : "var(--accent-loss)", fontWeight: 600 }}>
                  {fmt$(s.result.profit)} ({s.result.marginPct.toFixed(1)}%)
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button className="btn-secondary btn-small" onClick={() => onLoad(s)}>Load</button>
                  <button className="btn-secondary btn-small" onClick={() => onDelete(s.id)} style={{ color: "var(--accent-loss)" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      {saved.length >= 1 && (
        <div className="card">
          <div className="section-header">Scenario Comparison</div>
          <div style={{ overflowX: "auto" }}>
            <table className="scenario-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Current</th>
                  {saved.map((s) => (
                    <th key={s.id}>{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Pools", current: result.totalPools, fn: (r: TournamentResult) => r.totalPools },
                  { label: "Teams", current: result.effectiveTeams, fn: (r: TournamentResult) => r.effectiveTeams },
                  { label: "Players", current: result.totalPlayers, fn: (r: TournamentResult) => r.totalPlayers },
                  { label: "Revenue", current: fmt$(result.grossRevenue), fn: (r: TournamentResult) => fmt$(r.grossRevenue) },
                  { label: "Costs", current: fmt$(result.costs.total), fn: (r: TournamentResult) => fmt$(r.costs.total) },
                  { label: "Profit", current: fmt$(result.profit), fn: (r: TournamentResult) => fmt$(r.profit) },
                  { label: "Margin", current: result.marginPct.toFixed(1) + "%", fn: (r: TournamentResult) => r.marginPct.toFixed(1) + "%" },
                  { label: "Duration", current: result.totalEventDuration.toFixed(1) + "h", fn: (r: TournamentResult) => r.totalEventDuration.toFixed(1) + "h" },
                  { label: "Cost/Game", current: "$" + result.costPerGame.toFixed(2), fn: (r: TournamentResult) => "$" + r.costPerGame.toFixed(2) },
                ].map((row) => (
                  <tr key={row.label}>
                    <td style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{row.label}</td>
                    <td style={{ fontWeight: 500 }}>{typeof row.current === "number" ? row.current : row.current}</td>
                    {saved.map((s) => (
                      <td key={s.id}>{row.fn(s.result)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Save Scenario</div>
            <input
              className="modal-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={defaultLabel}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
