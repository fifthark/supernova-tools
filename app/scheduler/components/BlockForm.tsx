"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isUnevenDistribution,
  perCourtDistribution,
} from "../lib/calculations";
import type { Block, BlockMode, Category } from "../types";

interface Props {
  open: boolean;
  initial: Block | null;
  categories: Category[];
  courtNumbers: number[];
  onSave: (block: Block) => void;
  onClose: () => void;
}

type FormState = Omit<Block, "id">;

function emptyForm(): FormState {
  return {
    label: "",
    mode: "match-count",
    selectedCategoryIds: [],
    startTime: "09:00",
    courts: [],
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 0,
    afterBlockBufferMinutes: 0,
    matchCount: 0,
    fixedDurationMinutes: 60,
    colourOverride: undefined,
    notes: "",
  };
}

function toForm(b: Block): FormState {
  return {
    label: b.label,
    mode: b.mode,
    selectedCategoryIds: [...b.selectedCategoryIds],
    startTime: b.startTime,
    courts: [...b.courts],
    matchDurationMinutes: b.matchDurationMinutes,
    bufferMinutesBetweenMatches: b.bufferMinutesBetweenMatches,
    afterBlockBufferMinutes: b.afterBlockBufferMinutes,
    matchCount: b.matchCount,
    fixedDurationMinutes: b.fixedDurationMinutes,
    colourOverride: b.colourOverride,
    notes: b.notes ?? "",
  };
}

function sumCategoryMatchCount(ids: string[], categories: Category[]): number {
  return ids.reduce((sum, id) => {
    const c = categories.find(x => x.id === id);
    return sum + (c?.matchCount ?? 0);
  }, 0);
}

export default function BlockForm({
  open,
  initial,
  categories,
  courtNumbers,
  onSave,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [matchCountTouched, setMatchCountTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? toForm(initial) : emptyForm());
      setMatchCountTouched(!!initial);
      const dlg = dialogRef.current;
      if (dlg && !dlg.open) dlg.showModal();
    } else {
      const dlg = dialogRef.current;
      if (dlg && dlg.open) dlg.close();
    }
  }, [open, initial]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const toggleCategory = (id: string) => {
    setForm(f => {
      const has = f.selectedCategoryIds.includes(id);
      const next = has
        ? f.selectedCategoryIds.filter(x => x !== id)
        : [...f.selectedCategoryIds, id];

      let nextMatchCount = f.matchCount;
      if (!matchCountTouched && f.mode === "match-count") {
        nextMatchCount = sumCategoryMatchCount(next, categories);
      }
      return { ...f, selectedCategoryIds: next, matchCount: nextMatchCount };
    });
  };

  const toggleCourt = (n: number) => {
    setForm(f => {
      const has = f.courts.includes(n);
      const next = has ? f.courts.filter(x => x !== n) : [...f.courts, n].sort((a, b) => a - b);
      return { ...f, courts: next };
    });
  };

  const recalculateMatchCount = () => {
    const sum = sumCategoryMatchCount(form.selectedCategoryIds, categories);
    update("matchCount", sum);
    setMatchCountTouched(false);
  };

  const previewBlock: Block = useMemo(
    () => ({
      ...form,
      id: initial?.id ?? "preview",
    }),
    [form, initial],
  );

  const distribution = perCourtDistribution(previewBlock);
  const uneven = isUnevenDistribution(previewBlock);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label: form.label.trim(),
      mode: form.mode,
      selectedCategoryIds: form.selectedCategoryIds,
      startTime: form.startTime,
      courts: form.courts,
      matchDurationMinutes: Math.max(0, Math.floor(form.matchDurationMinutes)),
      bufferMinutesBetweenMatches: Math.max(0, Math.floor(form.bufferMinutesBetweenMatches)),
      afterBlockBufferMinutes: Math.max(0, Math.floor(form.afterBlockBufferMinutes)),
      matchCount: Math.max(0, Math.floor(form.matchCount)),
      fixedDurationMinutes: Math.max(0, Math.floor(form.fixedDurationMinutes)),
      colourOverride: form.colourOverride || undefined,
      notes: form.notes?.trim() || undefined,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="scheduler-dialog scheduler-dialog-wide"
      onClose={onClose}
      onCancel={onClose}
    >
      <form onSubmit={handleSubmit} className="scheduler-form">
        <h2 className="scheduler-form-title">
          {initial ? "Edit block" : "New block"}
        </h2>

        <label className="scheduler-field">
          <span className="scheduler-field-label">Label</span>
          <input
            type="text"
            className="scheduler-input"
            value={form.label}
            onChange={e => update("label", e.target.value)}
            autoFocus
            required
          />
        </label>

        <div className="scheduler-field">
          <span className="scheduler-field-label">Mode</span>
          <div className="scheduler-mode-toggle">
            {(["match-count", "fixed-duration"] as BlockMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                className={`scheduler-mode-option ${form.mode === mode ? "active" : ""}`}
                onClick={() => update("mode", mode)}
              >
                {mode === "match-count" ? "Match count" : "Fixed duration"}
              </button>
            ))}
          </div>
        </div>

        <div className="scheduler-field">
          <span className="scheduler-field-label">
            Categories ({form.selectedCategoryIds.length} selected)
          </span>
          {categories.length === 0 ? (
            <span className="scheduler-field-hint">
              No categories yet. Create one first, or leave empty for an admin/lunch block.
            </span>
          ) : (
            <div className="scheduler-multi-select">
              {categories.map(c => (
                <label key={c.id} className="scheduler-multi-option">
                  <input
                    type="checkbox"
                    checked={form.selectedCategoryIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span>{c.name}</span>
                  <span className="scheduler-multi-hint">
                    {c.eventCode} · {c.matchCount} matches
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="scheduler-field-row">
          <label className="scheduler-field">
            <span className="scheduler-field-label">Start time (HH:MM)</span>
            <input
              type="time"
              className="scheduler-input"
              value={form.startTime}
              onChange={e => update("startTime", e.target.value)}
              required
            />
          </label>

          <div className="scheduler-field">
            <span className="scheduler-field-label">Courts ({form.courts.length})</span>
            <div className="scheduler-court-picker">
              {courtNumbers.map(n => (
                <button
                  type="button"
                  key={n}
                  className={`scheduler-court-chip ${form.courts.includes(n) ? "active" : ""}`}
                  onClick={() => toggleCourt(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {form.mode === "match-count" ? (
          <>
            <div className="scheduler-field-row">
              <label className="scheduler-field">
                <span className="scheduler-field-label">Match count</span>
                <input
                  type="number"
                  className="scheduler-input"
                  min={0}
                  value={form.matchCount}
                  onChange={e => {
                    setMatchCountTouched(true);
                    update("matchCount", Number(e.target.value));
                  }}
                />
              </label>
              <label className="scheduler-field">
                <span className="scheduler-field-label">Match duration (min)</span>
                <input
                  type="number"
                  className="scheduler-input"
                  min={0}
                  value={form.matchDurationMinutes}
                  onChange={e => update("matchDurationMinutes", Number(e.target.value))}
                />
              </label>
              <label className="scheduler-field">
                <span className="scheduler-field-label">Buffer between (min)</span>
                <input
                  type="number"
                  className="scheduler-input"
                  min={0}
                  value={form.bufferMinutesBetweenMatches}
                  onChange={e =>
                    update("bufferMinutesBetweenMatches", Number(e.target.value))
                  }
                />
              </label>
              <label className="scheduler-field">
                <span className="scheduler-field-label">After-block buffer (min)</span>
                <input
                  type="number"
                  className="scheduler-input"
                  min={0}
                  value={form.afterBlockBufferMinutes}
                  onChange={e =>
                    update("afterBlockBufferMinutes", Number(e.target.value))
                  }
                />
              </label>
            </div>

            <div className="scheduler-recalc-row">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={recalculateMatchCount}
                disabled={form.selectedCategoryIds.length === 0}
              >
                Recalculate matchCount from categories
              </button>
              <span className="scheduler-field-hint">
                Sums match counts from selected categories. Duration and buffer stay as-is.
              </span>
            </div>

            {form.courts.length > 0 && form.matchCount > 0 && (
              <div className={`scheduler-distribution ${uneven ? "uneven" : ""}`}>
                <span className="scheduler-field-label">Per-court distribution</span>
                <div className="scheduler-distribution-grid">
                  {form.courts.map((c, i) => (
                    <span key={c} className="scheduler-distribution-cell">
                      Court {c}: <strong>{distribution[i]}</strong>
                    </span>
                  ))}
                </div>
                {uneven && (
                  <span className="scheduler-distribution-warning">
                    Uneven split — first {form.matchCount % form.courts.length} court
                    {form.matchCount % form.courts.length === 1 ? "" : "s"} gets one extra match.
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="scheduler-field-row">
            <label className="scheduler-field">
              <span className="scheduler-field-label">Fixed duration (min)</span>
              <input
                type="number"
                className="scheduler-input"
                min={0}
                value={form.fixedDurationMinutes}
                onChange={e => update("fixedDurationMinutes", Number(e.target.value))}
              />
            </label>
          </div>
        )}

        <div className="scheduler-field-row">
          <label className="scheduler-field">
            <span className="scheduler-field-label">Colour override (optional)</span>
            <input
              type="text"
              className="scheduler-input"
              placeholder="#RRGGBB"
              value={form.colourOverride ?? ""}
              onChange={e => update("colourOverride", e.target.value || undefined)}
            />
          </label>
        </div>

        <label className="scheduler-field">
          <span className="scheduler-field-label">Notes</span>
          <textarea
            className="scheduler-input scheduler-textarea"
            rows={2}
            value={form.notes ?? ""}
            onChange={e => update("notes", e.target.value)}
          />
        </label>

        <div className="scheduler-form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {initial ? "Save changes" : "Create block"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
