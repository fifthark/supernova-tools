"use client";

import { useState } from "react";
import type { CourtIdMap, Plan } from "../types";

interface Props {
  plan: Plan;
  onUpdate: (patch: Partial<Plan>) => void;
  onReset: () => void;
}

export default function PlanSettingsPanel({ plan, onUpdate, onReset }: Props) {
  const [expanded, setExpanded] = useState(false);

  const handleCourtIdChange = (courtNumber: number, value: string) => {
    const next: CourtIdMap = { ...plan.courtIdMap, [courtNumber]: value };
    onUpdate({ courtIdMap: next });
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Reset to T004 defaults? This wipes all current categories and blocks.",
      )
    ) {
      onReset();
    }
  };

  const courtNumbers = Object.keys(plan.courtIdMap)
    .map(n => parseInt(n, 10))
    .filter(n => !Number.isNaN(n))
    .sort((a, b) => a - b);

  return (
    <section className="scheduler-settings">
      <header className="scheduler-settings-header">
        <button
          type="button"
          className="scheduler-settings-toggle"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          <span className="section-header">Plan settings</span>
          <span className="scheduler-settings-summary">
            {plan.tournamentName} · {plan.tournamentDate} · {courtNumbers.length} courts
          </span>
          <span className="scheduler-settings-caret">{expanded ? "▾" : "▸"}</span>
        </button>
        <button className="btn-secondary btn-small" onClick={handleReset}>
          Reset to T004 defaults
        </button>
      </header>

      {expanded && (
        <div className="scheduler-settings-body">
          <div className="scheduler-field-row">
            <label className="scheduler-field">
              <span className="scheduler-field-label">Tournament name</span>
              <input
                type="text"
                className="scheduler-input"
                value={plan.tournamentName}
                onChange={e => onUpdate({ tournamentName: e.target.value })}
              />
            </label>
            <label className="scheduler-field">
              <span className="scheduler-field-label">Date</span>
              <input
                type="date"
                className="scheduler-input"
                value={plan.tournamentDate}
                onChange={e => onUpdate({ tournamentDate: e.target.value })}
              />
            </label>
          </div>

          <div className="scheduler-field">
            <span className="scheduler-field-label">Court ID map (export only)</span>
            <div className="scheduler-court-id-grid">
              {courtNumbers.map(n => (
                <label key={n} className="scheduler-court-id-field">
                  <span className="annotation">Court {n}</span>
                  <input
                    type="text"
                    className="scheduler-input"
                    value={plan.courtIdMap[n] ?? ""}
                    onChange={e => handleCourtIdChange(n, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
