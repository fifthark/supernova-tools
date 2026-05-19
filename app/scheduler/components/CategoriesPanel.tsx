"use client";

import { useState } from "react";
import { eventCodeClass, normalizeEventCode } from "../lib/colors";
import type { Category } from "../types";
import CategoryForm from "./CategoryForm";

interface Props {
  categories: Category[];
  onAdd: (c: Category) => void;
  onUpdate: (c: Category) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function CategoriesPanel({
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
}: Props) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleSave = (c: Category) => {
    if (editing) onUpdate(c);
    else onAdd(c);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = (c: Category) => {
    if (window.confirm(`Delete category "${c.name}"?`)) {
      onDelete(c.id);
    }
  };

  return (
    <section className="scheduler-panel">
      <header className="scheduler-panel-header">
        <h2 className="section-header">Categories</h2>
        <button className="btn-primary btn-small" onClick={openNew}>
          + Add category
        </button>
      </header>

      <div className="scheduler-list">
        {categories.length === 0 ? (
          <p className="annotation scheduler-empty">No categories yet.</p>
        ) : (
          categories.map(c => {
            const code = normalizeEventCode(c.eventCode);
            return (
              <div key={c.id} className="scheduler-card">
                <div className="scheduler-card-head">
                  <div className="scheduler-card-title-row">
                    <span className={`scheduler-event-chip ${eventCodeClass(code)}`}>
                      {c.eventCode || "Other"}
                    </span>
                    <span className="scheduler-card-title">{c.name}</span>
                  </div>
                  <div className="scheduler-card-actions">
                    <button
                      className="scheduler-icon-btn"
                      onClick={() => openEdit(c)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      className="scheduler-icon-btn"
                      onClick={() => onDuplicate(c.id)}
                      aria-label="Duplicate"
                      title="Duplicate"
                    >
                      Duplicate
                    </button>
                    <button
                      className="scheduler-icon-btn scheduler-icon-btn-danger"
                      onClick={() => handleDelete(c)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="scheduler-card-meta">
                  <span className="annotation">
                    {c.matchCount} matches · {c.defaultMatchDurationMinutes}m duration ·{" "}
                    {c.defaultBufferMinutes}m buffer
                  </span>
                  {c.sourceCategoryId && (
                    <span className="annotation scheduler-card-source">
                      {c.sourceCategoryId}
                    </span>
                  )}
                </div>
                {c.notes && <p className="annotation scheduler-card-notes">{c.notes}</p>}
              </div>
            );
          })
        )}
      </div>

      <CategoryForm
        open={formOpen}
        initial={editing}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </section>
  );
}
