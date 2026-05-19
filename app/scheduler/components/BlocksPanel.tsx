"use client";

import { useState } from "react";
import {
  blockEndMinutes,
  formatTime,
  isUnevenDistribution,
  perCourtDistribution,
  startMinutes,
} from "../lib/calculations";
import { blockHasClash, type Clash } from "../lib/clashDetection";
import { blockEventCode, eventCodeClass } from "../lib/colors";
import type { Block, Category } from "../types";
import BlockForm from "./BlockForm";

interface Props {
  blocks: Block[];
  categories: Category[];
  courtNumbers: number[];
  clashes: Clash[];
  onAdd: (b: Block) => void;
  onUpdate: (b: Block) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function BlocksPanel({
  blocks,
  categories,
  courtNumbers,
  clashes,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
}: Props) {
  const [editing, setEditing] = useState<Block | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (b: Block) => {
    setEditing(b);
    setFormOpen(true);
  };

  const handleSave = (b: Block) => {
    if (editing) onUpdate(b);
    else onAdd(b);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = (b: Block) => {
    if (window.confirm(`Delete block "${b.label}"?`)) {
      onDelete(b.id);
    }
  };

  const sortedBlocks = [...blocks].sort((a, b) => startMinutes(a) - startMinutes(b));

  return (
    <section className="scheduler-panel">
      <header className="scheduler-panel-header">
        <h2 className="section-header">Blocks</h2>
        <button className="btn-primary btn-small" onClick={openNew}>
          + Add block
        </button>
      </header>

      <div className="scheduler-list">
        {sortedBlocks.length === 0 ? (
          <p className="annotation scheduler-empty">No blocks yet.</p>
        ) : (
          sortedBlocks.map(b => {
            const code = blockEventCode(b, categories);
            const distribution = perCourtDistribution(b);
            const uneven = isUnevenDistribution(b);
            const hasClash = blockHasClash(b.id, clashes);
            const noCourts = b.courts.length === 0;
            const start = formatTime(startMinutes(b));
            const end = formatTime(blockEndMinutes(b));
            return (
              <div
                key={b.id}
                className={`scheduler-card ${hasClash ? "scheduler-card-clash" : ""} ${
                  noCourts ? "scheduler-card-no-courts" : ""
                }`}
              >
                <div className="scheduler-card-head">
                  <div className="scheduler-card-title-row">
                    <span className={`scheduler-event-chip ${eventCodeClass(code)}`}>
                      {code}
                    </span>
                    <span className="scheduler-card-title">{b.label}</span>
                    {hasClash && <span className="scheduler-clash-badge">clash</span>}
                    {noCourts && (
                      <span className="scheduler-no-courts-badge">no courts assigned</span>
                    )}
                  </div>
                  <div className="scheduler-card-actions">
                    <button
                      className="scheduler-icon-btn"
                      onClick={() => openEdit(b)}
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      className="scheduler-icon-btn"
                      onClick={() => onDuplicate(b.id)}
                      title="Duplicate"
                    >
                      Duplicate
                    </button>
                    <button
                      className="scheduler-icon-btn scheduler-icon-btn-danger"
                      onClick={() => handleDelete(b)}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="scheduler-card-meta">
                  <span className="annotation">
                    {start} – {end} · Courts{" "}
                    {b.courts.length === 0 ? "—" : b.courts.join(", ")} ·{" "}
                    {b.mode === "match-count"
                      ? `${b.matchCount} matches`
                      : `${b.fixedDurationMinutes}m fixed`}
                  </span>
                </div>

                {b.mode === "match-count" && uneven && (
                  <div className="scheduler-uneven-banner">
                    <span className="scheduler-uneven-tag">Uneven split</span>
                    <span className="annotation">
                      {b.courts
                        .map((c, i) => `C${c}: ${distribution[i]}`)
                        .join(" · ")}
                    </span>
                  </div>
                )}

                {b.mode === "match-count" && !uneven && b.courts.length > 0 && (
                  <details className="scheduler-card-details">
                    <summary className="annotation">Per-court breakdown</summary>
                    <div className="scheduler-distribution-grid">
                      {b.courts.map((c, i) => (
                        <span key={c} className="scheduler-distribution-cell">
                          Court {c}: <strong>{distribution[i]}</strong>
                        </span>
                      ))}
                    </div>
                  </details>
                )}

                {b.notes && <p className="annotation scheduler-card-notes">{b.notes}</p>}
              </div>
            );
          })
        )}
      </div>

      <BlockForm
        open={formOpen}
        initial={editing}
        categories={categories}
        courtNumbers={courtNumbers}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </section>
  );
}
