"use client";

import { useState } from "react";
import type { Category } from "../lib/types";

export default function CategoryEditModal({
  category,
  courtLabels,
  onClose,
  onSave,
}: {
  category: Category;
  courtLabels: string[];
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [start, setStart] = useState(String(category.Start_Time ?? ""));
  const [end, setEnd] = useState(String(category.End_Time ?? ""));
  const [dur, setDur] = useState(String(category.Match_Duration_Minutes ?? ""));
  const [buf, setBuf] = useState(String(category.Buffer_Minutes ?? ""));
  const [pool, setPool] = useState(String(category.Pool_Size ?? ""));
  const [courts, setCourts] = useState<Set<string>>(
    () => new Set(parseWhitelist(category.Court_Whitelist, courtLabels)),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggleCourt(label: string) {
    setCourts((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const validTime = (v: string) => v.trim() === "" || /^\d{1,2}:\d{2}$/.test(v.trim());
  const validNum = (v: string) => v.trim() === "" || /^\d+$/.test(v.trim());

  async function save() {
    setErr("");
    if (!validTime(start) || !validTime(end)) {
      setErr("Times must be in HH:MM format.");
      return;
    }
    if (!validNum(dur) || !validNum(buf) || !validNum(pool)) {
      setErr("Match length, buffer and pool size must be whole numbers.");
      return;
    }
    const allSelected = courtLabels.length > 0 && courtLabels.every((c) => courts.has(c));
    const whitelist = allSelected ? "" : courtLabels.filter((c) => courts.has(c)).join(",");
    const patch: Record<string, unknown> = {
      Start_Time: start.trim(),
      End_Time: end.trim(),
      Court_Whitelist: whitelist,
      Match_Duration_Minutes: dur.trim(),
      Buffer_Minutes: buf.trim(),
      Pool_Size: pool.trim(),
    };
    setBusy(true);
    const res = await onSave(patch);
    setBusy(false);
    if (res.ok) onClose();
    else setErr(res.message || "Couldn’t save the category.");
  }

  return (
    <div className="tlite-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="tlite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tlite-modal-head">
          <h3 className="tlite-modal-title">{category.Category_Name || category.Category_ID}</h3>
          <button className="tlite-modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="tlite-modal-body">
          <div className="tlite-field-row">
            <label className="tlite-field">
              <span className="tlite-field-label">Start</span>
              <input className="tlite-input" placeholder="HH:MM" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="tlite-field">
              <span className="tlite-field-label">End</span>
              <input className="tlite-input" placeholder="HH:MM" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>

          <div className="tlite-field-row">
            <label className="tlite-field">
              <span className="tlite-field-label">Match (min)</span>
              <input className="tlite-input" inputMode="numeric" value={dur} onChange={(e) => setDur(e.target.value.replace(/[^0-9]/g, ""))} />
            </label>
            <label className="tlite-field">
              <span className="tlite-field-label">Buffer (min)</span>
              <input className="tlite-input" inputMode="numeric" value={buf} onChange={(e) => setBuf(e.target.value.replace(/[^0-9]/g, ""))} />
            </label>
            <label className="tlite-field">
              <span className="tlite-field-label">Pool size</span>
              <input className="tlite-input" inputMode="numeric" value={pool} onChange={(e) => setPool(e.target.value.replace(/[^0-9]/g, ""))} />
            </label>
          </div>

          <div className="tlite-field">
            <span className="tlite-field-label">Courts</span>
            <div className="tlite-court-chips">
              {courtLabels.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`tlite-court-chip${courts.has(c) ? " tlite-court-chip-on" : ""}`}
                  onClick={() => toggleCourt(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="tlite-field-hint">Nothing selected = all courts.</span>
          </div>

          {err && <div className="tlite-msg tlite-msg-error">{err}</div>}
        </div>

        <div className="tlite-modal-actions">
          <button className="tlite-btn tlite-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="tlite-btn tlite-btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pre-select chips from an existing whitelist (labels or 1-based numbers). Blank = all.
function parseWhitelist(whitelist: string | undefined, courtLabels: string[]): string[] {
  if (!whitelist || String(whitelist).trim() === "") return courtLabels.slice();
  const tokens = String(whitelist)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return courtLabels.filter((label, i) =>
    tokens.some((t) => t.toLowerCase() === label.toLowerCase() || t === String(i + 1)),
  );
}
