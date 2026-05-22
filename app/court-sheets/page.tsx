"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type FieldKey = "match" | "time" | "court" | "category" | "teams";

type Mapping = Record<FieldKey, string | null>;

type PersistedState = {
  mapping: Mapping;
  tournamentName: string;
  date: string;
};

type Row = {
  match: string;
  time: string;
  court: string;
  category: string;
  teams: string;
};

type Page = {
  court: string;
  category: string;
  rows: Row[];
  earliestSortKey: number;
};

type RowError = {
  rowIndex: number;
  matchNumber: string;
  missingCourt: boolean;
  missingTime: boolean;
};

type Clash = {
  time: string;
  entityId: string;
  matches: { matchNumber: string; court: string }[];
};

type IdColumns = { a: string | null; b: string | null };

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = "fifthark_courtsheets_mapping_v1";

const FIELD_LABELS: Record<FieldKey, string> = {
  match: "Match #",
  time: "Time",
  court: "Court",
  category: "Category",
  teams: "Teams",
};

const FIELDS: FieldKey[] = ["match", "time", "court", "category", "teams"];

// Known league export headers (exact match, but case-insensitive + trimmed)
const KNOWN_HEADERS: Record<FieldKey, string[]> = {
  match: ["basic/match_order", "match", "match no", "match number", "match #", "#"],
  time: ["schedule/format_time", "time", "start", "start time"],
  court: ["schedule/lkp_courtname", "court", "court name"],
  category: ["cat/display", "category", "cat"],
  teams: ["display/vs", "teams", "match", "vs"],
};

const EMPTY_MAPPING: Mapping = {
  match: null,
  time: null,
  court: null,
  category: null,
  teams: null,
};

// Optional ID columns for clash detection (not part of the user-facing mapping).
const ENTITY_A_CANDIDATES = ["entitya_id", "entity_a_id", "entitya id", "entity a id"];
const ENTITY_B_CANDIDATES = ["entityb_id", "entity_b_id", "entityb id", "entity b id"];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function autoDetectMapping(headers: string[]): Mapping {
  const normalized = headers.map(normalizeHeader);
  const result: Mapping = { ...EMPTY_MAPPING };

  for (const field of FIELDS) {
    const candidates = KNOWN_HEADERS[field];
    for (const candidate of candidates) {
      const idx = normalized.indexOf(candidate);
      if (idx !== -1) {
        result[field] = headers[idx];
        break;
      }
    }
  }

  return result;
}

// Parse time strings like "9:00 AM", "9:00", "09:00" into minutes since midnight.
// Returns null if unparseable.
function parseTimeToMinutes(value: string): number | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  // Try "H:MM AM/PM" or "HH:MM AM/PM"
  const ampmMatch = v.match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const isPm = ampmMatch[3].toLowerCase() === "p";
    if (h === 12) h = isPm ? 12 : 0;
    else if (isPm) h += 12;
    return h * 60 + m;
  }

  // Try plain "HH:MM" or "H:MM"
  const plainMatch = v.match(/^(\d{1,2}):(\d{2})$/);
  if (plainMatch) {
    const h = parseInt(plainMatch[1], 10);
    const m = parseInt(plainMatch[2], 10);
    return h * 60 + m;
  }

  return null;
}

// Natural sort for court names: "Court 2" < "Court 11" < "Show Court"
function naturalCompare(a: string, b: string): number {
  const aParts = a.match(/(\d+|\D+)/g) ?? [a];
  const bParts = b.match(/(\d+|\D+)/g) ?? [b];
  const len = Math.min(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ap = aParts[i];
    const bp = bParts[i];
    const aNum = /^\d+$/.test(ap);
    const bNum = /^\d+$/.test(bp);
    if (aNum && bNum) {
      const diff = parseInt(ap, 10) - parseInt(bp, 10);
      if (diff !== 0) return diff;
    } else {
      const diff = ap.localeCompare(bp, undefined, { sensitivity: "base" });
      if (diff !== 0) return diff;
    }
  }
  return aParts.length - bParts.length;
}

function formatCategory(raw: string): string {
  if (!raw) return "";
  return raw.split("|").map(s => s.trim()).filter(Boolean).join(" · ");
}

function buildPages(rows: Row[]): Page[] {
  if (rows.length === 0) return [];

  // Caller is expected to filter out rows with blank Court/Time first
  // (those become blocking errors). Blank category falls back to "(Uncategorised)".
  const byCourt = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const courtKey = row.court;
    const catKey = row.category || "(Uncategorised)";
    let courtMap = byCourt.get(courtKey);
    if (!courtMap) {
      courtMap = new Map();
      byCourt.set(courtKey, courtMap);
    }
    let list = courtMap.get(catKey);
    if (!list) {
      list = [];
      courtMap.set(catKey, list);
    }
    list.push(row);
  }

  const pages: Page[] = [];
  const courtNames = Array.from(byCourt.keys()).sort(naturalCompare);

  for (const court of courtNames) {
    const courtMap = byCourt.get(court)!;
    // Build category pages within this court, sorted by earliest match time
    const catPages: Page[] = [];
    for (const [category, catRows] of courtMap.entries()) {
      const sorted = [...catRows].sort((a, b) => {
        const aMin = parseTimeToMinutes(a.time);
        const bMin = parseTimeToMinutes(b.time);
        if (aMin !== null && bMin !== null && aMin !== bMin) return aMin - bMin;
        if (aMin !== null && bMin === null) return -1;
        if (aMin === null && bMin !== null) return 1;
        // Tie-break by Match # (numeric if possible)
        const aNum = parseInt(a.match, 10);
        const bNum = parseInt(b.match, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
        return (a.match || "").localeCompare(b.match || "");
      });
      const earliest = sorted
        .map(r => parseTimeToMinutes(r.time))
        .filter((n): n is number => n !== null);
      const earliestSortKey = earliest.length > 0 ? Math.min(...earliest) : Number.MAX_SAFE_INTEGER;
      catPages.push({ court, category, rows: sorted, earliestSortKey });
    }
    catPages.sort((a, b) => {
      if (a.earliestSortKey !== b.earliestSortKey) return a.earliestSortKey - b.earliestSortKey;
      return a.category.localeCompare(b.category);
    });
    pages.push(...catPages);
  }

  return pages;
}

function findIdColumns(headers: string[]): IdColumns {
  const normalized = headers.map(normalizeHeader);
  const find = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = normalized.indexOf(c);
      if (idx !== -1) return headers[idx];
    }
    return null;
  };
  return { a: find(ENTITY_A_CANDIDATES), b: find(ENTITY_B_CANDIDATES) };
}

function detectClashes(
  rows: Row[],
  idColA: string | null,
  idColB: string | null,
  rawRows: Record<string, string>[],
): Clash[] {
  if (!idColA && !idColB) return [];
  type Entry = { matchNumber: string; court: string; entityId: string; time: string };
  const entries: Entry[] = [];
  rows.forEach((row, i) => {
    const ids: string[] = [];
    if (idColA) {
      const v = (rawRows[i]?.[idColA] ?? "").toString().trim();
      if (v) ids.push(v);
    }
    if (idColB) {
      const v = (rawRows[i]?.[idColB] ?? "").toString().trim();
      if (v) ids.push(v);
    }
    for (const id of ids) {
      entries.push({
        matchNumber: row.match,
        court: row.court,
        entityId: id,
        time: row.time,
      });
    }
  });

  const byKey = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!e.time || !e.entityId) continue;
    const k = `${e.time}::${e.entityId}`;
    let list = byKey.get(k);
    if (!list) {
      list = [];
      byKey.set(k, list);
    }
    list.push(e);
  }

  const clashes: Clash[] = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const courts = new Set(list.map(e => e.court));
    if (courts.size < 2) continue; // same court = same match, not a clash
    clashes.push({
      time: list[0].time,
      entityId: list[0].entityId,
      matches: list.map(e => ({ matchNumber: e.matchNumber, court: e.court })),
    });
  }

  clashes.sort((a, b) => {
    const at = parseTimeToMinutes(a.time) ?? Number.MAX_SAFE_INTEGER;
    const bt = parseTimeToMinutes(b.time) ?? Number.MAX_SAFE_INTEGER;
    if (at !== bt) return at - bt;
    return a.entityId.localeCompare(b.entityId);
  });

  return clashes;
}

function loadPersisted(): PersistedState {
  if (typeof window === "undefined") {
    return { mapping: { ...EMPTY_MAPPING }, tournamentName: "", date: "" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mapping: { ...EMPTY_MAPPING }, tournamentName: "", date: "" };
    const parsed = JSON.parse(raw);
    return {
      mapping: { ...EMPTY_MAPPING, ...(parsed.mapping ?? {}) },
      tournamentName: parsed.tournamentName ?? "",
      date: parsed.date ?? "",
    };
  } catch {
    return { mapping: { ...EMPTY_MAPPING }, tournamentName: "", date: "" };
  }
}

function persist(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function CourtSheetsPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>(EMPTY_MAPPING);
  const [tournamentName, setTournamentName] = useState("");
  const [date, setDate] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const persisted = loadPersisted();
    setMapping(persisted.mapping);
    setTournamentName(persisted.tournamentName);
    setDate(persisted.date);
    setHydrated(true);
  }, []);

  // Persist on change (after hydration so we don't clobber on first render)
  useEffect(() => {
    if (!hydrated) return;
    persist({ mapping, tournamentName, date });
  }, [mapping, tournamentName, date, hydrated]);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data || [];
        const fields = results.meta.fields ?? [];
        setHeaders(fields);
        setRawRows(data);

        // Auto-detect only fields not already mapped to a present header
        const detected = autoDetectMapping(fields);
        setMapping(prev => {
          const next: Mapping = { ...prev };
          for (const f of FIELDS) {
            const existing = prev[f];
            const stillValid = existing && fields.includes(existing);
            if (!stillValid) next[f] = detected[f];
          }
          return next;
        });
      },
      error: (err) => {
        setParseError(err.message || "Failed to parse CSV");
      },
    });
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const unmappedFields = useMemo(
    () => FIELDS.filter(f => !mapping[f] || !headers.includes(mapping[f]!)),
    [mapping, headers],
  );

  const rows: Row[] = useMemo(() => {
    if (rawRows.length === 0 || unmappedFields.length > 0) return [];
    return rawRows.map(r => ({
      match: (r[mapping.match!] ?? "").toString().trim(),
      time: (r[mapping.time!] ?? "").toString().trim(),
      court: (r[mapping.court!] ?? "").toString().trim(),
      category: (r[mapping.category!] ?? "").toString().trim(),
      teams: (r[mapping.teams!] ?? "").toString().trim(),
    }));
  }, [rawRows, mapping, unmappedFields]);

  const errors: RowError[] = useMemo(() => {
    if (rows.length === 0) return [];
    return rows
      .map((row, i) => ({
        rowIndex: i + 1,
        matchNumber: row.match,
        missingCourt: !row.court,
        missingTime: !row.time,
      }))
      .filter(e => e.missingCourt || e.missingTime);
  }, [rows]);

  const idColumns = useMemo(() => findIdColumns(headers), [headers]);

  const clashes: Clash[] = useMemo(() => {
    if (errors.length > 0) return [];
    return detectClashes(rows, idColumns.a, idColumns.b, rawRows);
  }, [rows, errors, idColumns, rawRows]);

  const pages = useMemo(() => {
    if (errors.length > 0) return [];
    return buildPages(rows);
  }, [rows, errors]);

  const resetMapping = () => {
    setMapping(headers.length > 0 ? autoDetectMapping(headers) : { ...EMPTY_MAPPING });
  };

  const clearFile = () => {
    setFileName(null);
    setHeaders([]);
    setRawRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePrint = () => {
    window.print();
  };

  const hasFile = rawRows.length > 0;
  const hasPages = pages.length > 0;
  const showEmpty = hasFile && rows.length === 0 && unmappedFields.length === 0;

  return (
    <main className="courtsheets-shell">
      {/* ─── Controls (hidden in print) ─── */}
      <section className="courtsheets-controls">
        <header className="courtsheets-header">
          <h1 className="courtsheets-title">Court Sheets</h1>
          <p className="courtsheets-subtitle">
            Upload a tournament fixtures CSV to produce printable per-court schedule sheets.
          </p>
        </header>

        {/* Upload zone */}
        <div
          className={`courtsheets-dropzone ${dragOver ? "courtsheets-dropzone-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileInputChange}
            style={{ display: "none" }}
          />
          {fileName ? (
            <div className="courtsheets-file-info">
              <span className="courtsheets-file-name">{fileName}</span>
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <div className="courtsheets-dropzone-title">Drop CSV here or click to choose</div>
              <div className="courtsheets-dropzone-hint">.csv files only</div>
            </>
          )}
        </div>

        {parseError && (
          <div className="courtsheets-error">CSV parse error: {parseError}</div>
        )}

        {/* Column mapping */}
        {headers.length > 0 && (
          <div className="courtsheets-mapping">
            <div className="courtsheets-mapping-header">
              <span className="section-header">Column mapping</span>
              <button
                type="button"
                className="courtsheets-link-button"
                onClick={resetMapping}
              >
                Reset mapping
              </button>
            </div>
            <div className="courtsheets-mapping-grid">
              {FIELDS.map(field => {
                const value = mapping[field];
                const isAuto = !!value && headers.includes(value);
                return (
                  <label key={field} className="courtsheets-mapping-row">
                    <span className="courtsheets-mapping-label">
                      {FIELD_LABELS[field]}
                      {isAuto && <span className="courtsheets-auto-tag">auto</span>}
                    </span>
                    <select
                      className="select-input"
                      value={value ?? ""}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        [field]: e.target.value || null,
                      }))}
                    >
                      <option value="">— select column —</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            {unmappedFields.length > 0 && (
              <div className="courtsheets-warning">
                Unmapped: {unmappedFields.map(f => FIELD_LABELS[f]).join(", ")}. Preview is blocked until all fields are mapped.
              </div>
            )}
          </div>
        )}

        {/* Tournament name / date */}
        {hasFile && (
          <div className="courtsheets-meta-inputs">
            <label className="courtsheets-meta-row">
              <span className="courtsheets-mapping-label">Tournament name</span>
              <input
                type="text"
                className="courtsheets-text-input"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. SuperNova Open 2026"
              />
            </label>
            <label className="courtsheets-meta-row">
              <span className="courtsheets-mapping-label">Date</span>
              <input
                type="text"
                className="courtsheets-text-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 22 May 2026"
              />
            </label>
          </div>
        )}

        {/* Blocking errors */}
        {errors.length > 0 && (
          <div className="courtsheets-errors-panel">
            <div className="courtsheets-errors-title">
              Cannot generate sheets — {errors.length} {errors.length === 1 ? "row is" : "rows are"} missing required values
            </div>
            <ul className="courtsheets-errors-list">
              {errors.map(err => {
                const missing = [
                  err.missingCourt ? "Court" : null,
                  err.missingTime ? "Time" : null,
                ].filter(Boolean).join(" and ");
                const label = err.matchNumber
                  ? `Match ${err.matchNumber} (row ${err.rowIndex})`
                  : `Row ${err.rowIndex}`;
                return (
                  <li key={err.rowIndex}>{label}: missing {missing}</li>
                );
              })}
            </ul>
            <div className="courtsheets-errors-hint">
              Fix these in your source CSV and re-upload.
            </div>
          </div>
        )}

        {/* Clash detection */}
        {hasFile && errors.length === 0 && unmappedFields.length === 0 && (
          !idColumns.a && !idColumns.b ? (
            <div className="courtsheets-clash-noids">
              Entity IDs not found — clash detection unavailable. Add EntityA_ID and EntityB_ID columns to enable.
            </div>
          ) : clashes.length > 0 ? (
            <div className="courtsheets-clash-panel">
              <div className="courtsheets-clash-title">
                Same-team double-bookings ({clashes.length})
              </div>
              <ul className="courtsheets-clash-list">
                {clashes.map((c, i) => (
                  <li key={i}>
                    {c.time} · Entity {c.entityId} →{" "}
                    {c.matches.map(m => `Match ${m.matchNumber} (${m.court})`).join(" vs ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="courtsheets-clash-clean">
              No double-bookings found.
            </div>
          )
        )}

        {/* Print button */}
        {hasPages && (
          <div className="courtsheets-actions">
            <button type="button" className="btn-primary" onClick={handlePrint}>
              Print / Save as PDF
            </button>
            <span className="annotation">
              {pages.length} {pages.length === 1 ? "page" : "pages"} · {rows.length} matches
            </span>
          </div>
        )}

        {showEmpty && (
          <div className="courtsheets-empty">No matches found in this file.</div>
        )}
      </section>

      {/* ─── Print preview ─── */}
      {hasPages && (
        <section className="courtsheets-pages">
          {pages.map((page, idx) => (
            <article key={`${page.court}::${page.category}::${idx}`} className="courtsheets-page">
              <header className="courtsheets-page-header">
                <h2 className="courtsheets-page-court">{page.court}</h2>
                <div className="courtsheets-page-category">
                  {formatCategory(page.category)}
                </div>
                {(tournamentName || date) && (
                  <div className="courtsheets-page-meta">
                    {tournamentName}
                    {tournamentName && date ? " · " : ""}
                    {date}
                  </div>
                )}
                <div className="courtsheets-page-count">
                  ({page.rows.length} {page.rows.length === 1 ? "match" : "matches"})
                </div>
              </header>
              <table className="courtsheets-table">
                <thead>
                  <tr>
                    <th className="courtsheets-col-match">Match #</th>
                    <th className="courtsheets-col-time">Time</th>
                    <th className="courtsheets-col-teams">Teams</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="courtsheets-col-match">{row.match || "TBD"}</td>
                      <td className="courtsheets-col-time">{row.time || "TBD"}</td>
                      <td className="courtsheets-col-teams">{row.teams || "TBD"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
