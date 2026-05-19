"use client";

import { useState } from "react";
import { MAX_NUM_COURTS, MIN_NUM_COURTS } from "../defaults";
import type { Plan } from "../types";

interface Props {
  plan: Plan;
  onUpdate: (patch: Partial<Plan>) => void;
  onReset: () => void;
}

export default function PlanSettingsPanel({ plan, onUpdate, onReset }: Props) {
  const [expanded, setExpanded] = useState(false);

  const handleReset = () => {
    if (
      window.confirm(
        "Reset to T004 defaults? This wipes all current categories and blocks.",
      )
    ) {
      onReset();
    }
  };

  const handleNumCourtsChange = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    const next = Math.min(MAX_NUM_COURTS, Math.max(MIN_NUM_COURTS, Math.floor(raw)));
    if (next === plan.numCourts) return;

    if (next < plan.numCourts) {
      const affected = plan.blocks.filter(b => b.courts.some(c => c > next));
      if (affected.length > 0) {
        const droppedCourtsAll = new Set<number>();
        for (const b of affected) {
          for (const c of b.courts) {
            if (c > next) droppedCourtsAll.add(c);
          }
        }
        const courtList = Array.from(droppedCourtsAll).sort((a, b) => a - b).join(", ");
        const blockList = affected.map(b => b.label).join(", ");
        const ok = window.confirm(
          `Reducing to ${next} courts will drop courts ${courtList} from blocks ${blockList}. Continue?`,
        );
        if (!ok) return;
        const strippedBlocks = plan.blocks.map(b =>
          b.courts.some(c => c > next)
            ? { ...b, courts: b.courts.filter(c => c <= next) }
            : b,
        );
        onUpdate({ numCourts: next, blocks: strippedBlocks });
        return;
      }
    }

    onUpdate({ numCourts: next });
  };

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
            {plan.tournamentName} · {plan.tournamentDate} · {plan.numCourts} courts
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
            <label className="scheduler-field">
              <span className="scheduler-field-label">Number of courts</span>
              <input
                type="number"
                className="scheduler-input"
                min={MIN_NUM_COURTS}
                max={MAX_NUM_COURTS}
                value={plan.numCourts}
                onChange={e => handleNumCourtsChange(Number(e.target.value))}
              />
              <span className="scheduler-field-hint">
                Courts are numbered 1 to {plan.numCourts}. Min {MIN_NUM_COURTS}, max {MAX_NUM_COURTS}.
              </span>
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
