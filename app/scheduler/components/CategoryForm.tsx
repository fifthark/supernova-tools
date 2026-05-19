"use client";

import { useEffect, useRef, useState } from "react";
import { KNOWN_EVENT_CODES } from "../lib/colors";
import type { Category } from "../types";

interface Props {
  open: boolean;
  initial: Category | null;
  onSave: (category: Category) => void;
  onClose: () => void;
}

type FormState = Omit<Category, "id">;

function emptyForm(): FormState {
  return {
    name: "",
    sourceCategoryId: "",
    eventCode: "MS",
    matchCount: 0,
    defaultMatchDurationMinutes: 20,
    defaultBufferMinutes: 0,
    defaultStartTime: "",
    notes: "",
  };
}

function toForm(c: Category): FormState {
  return {
    name: c.name,
    sourceCategoryId: c.sourceCategoryId ?? "",
    eventCode: c.eventCode,
    matchCount: c.matchCount,
    defaultMatchDurationMinutes: c.defaultMatchDurationMinutes,
    defaultBufferMinutes: c.defaultBufferMinutes,
    defaultStartTime: c.defaultStartTime ?? "",
    notes: c.notes ?? "",
  };
}

export default function CategoryForm({ open, initial, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (open) {
      setForm(initial ? toForm(initial) : emptyForm());
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      sourceCategoryId: form.sourceCategoryId?.trim() || undefined,
      eventCode: form.eventCode.trim() || "Other",
      matchCount: Math.max(0, Math.floor(form.matchCount)),
      defaultMatchDurationMinutes: Math.max(0, Math.floor(form.defaultMatchDurationMinutes)),
      defaultBufferMinutes: Math.max(0, Math.floor(form.defaultBufferMinutes)),
      defaultStartTime: form.defaultStartTime?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="scheduler-dialog"
      onClose={onClose}
      onCancel={onClose}
    >
      <form onSubmit={handleSubmit} className="scheduler-form">
        <h2 className="scheduler-form-title">
          {initial ? "Edit category" : "New category"}
        </h2>

        <label className="scheduler-field">
          <span className="scheduler-field-label">Name</span>
          <input
            type="text"
            className="scheduler-input"
            value={form.name}
            onChange={e => update("name", e.target.value)}
            autoFocus
            required
          />
        </label>

        <label className="scheduler-field">
          <span className="scheduler-field-label">Event code</span>
          <input
            type="text"
            className="scheduler-input"
            list="scheduler-event-codes"
            value={form.eventCode}
            onChange={e => update("eventCode", e.target.value)}
          />
          <datalist id="scheduler-event-codes">
            {KNOWN_EVENT_CODES.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <span className="scheduler-field-hint">
            Free text. Known codes colour-coded; anything else falls back to grey.
          </span>
        </label>

        <div className="scheduler-field-row">
          <label className="scheduler-field">
            <span className="scheduler-field-label">Match count</span>
            <input
              type="number"
              className="scheduler-input"
              min={0}
              value={form.matchCount}
              onChange={e => update("matchCount", Number(e.target.value))}
            />
          </label>
          <label className="scheduler-field">
            <span className="scheduler-field-label">Default duration (min)</span>
            <input
              type="number"
              className="scheduler-input"
              min={0}
              value={form.defaultMatchDurationMinutes}
              onChange={e => update("defaultMatchDurationMinutes", Number(e.target.value))}
            />
          </label>
          <label className="scheduler-field">
            <span className="scheduler-field-label">Default buffer (min)</span>
            <input
              type="number"
              className="scheduler-input"
              min={0}
              value={form.defaultBufferMinutes}
              onChange={e => update("defaultBufferMinutes", Number(e.target.value))}
            />
          </label>
          <label className="scheduler-field">
            <span className="scheduler-field-label">Default start time (HH:MM)</span>
            <input
              type="time"
              className="scheduler-input"
              value={form.defaultStartTime ?? ""}
              onChange={e => update("defaultStartTime", e.target.value)}
            />
            <span className="scheduler-field-hint">
              Optional. New blocks selecting this category pre-fill their start time.
            </span>
          </label>
        </div>

        <label className="scheduler-field">
          <span className="scheduler-field-label">Source category ID (optional)</span>
          <input
            type="text"
            className="scheduler-input"
            placeholder="e.g. T004|Adults|MS|Grade2"
            value={form.sourceCategoryId ?? ""}
            onChange={e => update("sourceCategoryId", e.target.value)}
          />
        </label>

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
            {initial ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
