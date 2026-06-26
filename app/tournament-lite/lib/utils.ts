// Tournament Lite — small pure helpers shared across the UI.

import type { TournamentState, Entry } from "./types";

export function settingValue(state: TournamentState, key: string): string {
  const row = (state.settings ?? []).find((s) => s.Key === key);
  return row && row.Value != null ? String(row.Value) : "";
}

export function isActiveStatus(status?: string | null): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return s !== "withdrawn" && s !== "archived";
}

export function isTrueish(v: unknown): boolean {
  if (v === true) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function entryLabel(e: Entry): string {
  return (
    (e.Entry_Display_Name && String(e.Entry_Display_Name).trim()) ||
    (e.Entry_Name && String(e.Entry_Name).trim()) ||
    String(e.Entry_ID)
  );
}

export function members(e: Entry): string {
  return [e.Member_1, e.Member_2, e.Member_3, e.Member_4]
    .map((m) => (m == null ? "" : String(m).trim()))
    .filter(Boolean)
    .join(" · ");
}

export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = map.get(k);
    if (arr) arr.push(it);
    else map.set(k, [it]);
  }
  return map;
}

// Event court labels: Court_Names (CSV) if set, else "Court 1".."Court N".
export function eventCourtLabels(state: TournamentState): string[] {
  const names = settingValue(state, "Court_Names");
  if (names.trim() !== "") {
    const labels = names.split(",").map((s) => s.trim()).filter(Boolean);
    if (labels.length > 0) return labels;
  }
  const n = num(settingValue(state, "Num_Courts"));
  const out: string[] = [];
  for (let i = 1; i <= n; i += 1) out.push(`Court ${i}`);
  return out;
}

// Pool_ID like "POOL-MD-A" -> "A".
export function poolLetter(poolId: string): string {
  const parts = String(poolId).split("-");
  return parts[parts.length - 1] || String(poolId);
}

// ISO "2026-06-27T09:00:00+10:00" -> "27/06/2026 09:00" (uses the embedded local time).
export function formatTimestamp(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : String(iso);
}

export function humanError(reason?: string, message?: string): string {
  switch (reason) {
    case "tie_not_allowed":
      return "Scores can’t be equal — there are no draws.";
    case "invalid_score":
      return "Scores must be whole numbers, 0 or more.";
    case "not_scorable":
      return "This match can’t be scored.";
    case "match_not_found":
      return "That match no longer exists — refresh and try again.";
    case "unauthorized":
      return "The backend rejected the request. Refresh and try again.";
    case "completed_matches_exist":
      return message || "Some matches already have scores.";
    case "timeout":
      return "The backend took too long. Try again in a moment.";
    case "network_error":
      return "Network error — check your connection and try again.";
    case "config_error":
      return "The backend isn’t configured. Check the server environment.";
    default:
      return message || "Something went wrong. Please try again.";
  }
}

export interface CategoryStat {
  label: string;
  value: string | number;
  warn?: boolean;
}

// Compact per-category figures for the Matches / Leaderboard stat cards.
export function categoryStats(
  state: TournamentState,
  catId: string,
): { items: CategoryStat[]; window: string; total: number; completed: number } {
  const cat = (state.categories ?? []).find((c) => String(c.Category_ID) === catId);
  const entries = (state.entries ?? []).filter(
    (e) => String(e.Category_ID) === catId && isActiveStatus(e.Status),
  ).length;
  const matches = (state.matches ?? []).filter((m) => String(m.Category_ID) === catId);
  const total = matches.length;
  const completed = matches.filter((m) => String(m.Status) === "Completed").length;
  const overflow = matches.filter(
    (m) => !isTrueish(m.Is_Bye) && String(m.Court ?? "").trim() === "",
  ).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const items: CategoryStat[] = [
    { label: "Entries", value: entries },
    { label: "Matches", value: total },
    { label: "Completed", value: completed },
    { label: "% Complete", value: `${pct}%` },
  ];
  if (overflow > 0) items.push({ label: "Overflow", value: overflow, warn: true });

  const start = cat?.Start_Time ? String(cat.Start_Time) : "";
  const end = cat?.End_Time ? String(cat.End_Time) : "";
  const window = start || end ? `${start || "—"}–${end || "—"}` : "";
  return { items, window, total, completed };
}

// Local wall-clock HH:MM (24h) — used for "Last synced".
export function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
