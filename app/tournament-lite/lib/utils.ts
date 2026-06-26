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

// Venues can have up to 15 courts, so the court bank always offers at least
// Court 1..15 — the admin must be able to pick any court up to a 15-court venue
// even before the global Settings court bank has been configured.
export const DEFAULT_COURT_COUNT = 15;

// Court bank used for per-category court selection. Always exposes the numbered
// bank Court 1..N (N = max(Num_Courts, 15)) so the admin can select ANY court up
// to a 15-court venue, then appends any custom (non "Court N") labels configured
// in Settings.Court_Names (e.g. "East", "Show Court"). When Court_Names is
// missing this is exactly Court 1..15 — never an old Court 1–6 / 6–14 limit.
export function eventCourtLabels(state: TournamentState): string[] {
  const n = Math.max(num(settingValue(state, "Num_Courts")), DEFAULT_COURT_COUNT);
  const numbered: string[] = [];
  for (let i = 1; i <= n; i += 1) numbered.push(`Court ${i}`);

  // Keep any custom court labels the venue configured without dropping the
  // standard numbered bank (so 1..15 are always selectable).
  const extras = settingValue(state, "Court_Names")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((label) => !numbered.some((c) => c.toLowerCase() === label.toLowerCase()));

  return [...numbered, ...extras];
}

// Display a category's Court_Whitelist cleanly with spaces:
// "Court 6,Court 7,Court 8" -> "Court 6, Court 7, Court 8".
// A blank whitelist means every court is available -> "All".
export function formatCourtList(csv: string | undefined | null): string {
  const labels = String(csv ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "All";
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

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Event date for the public board header. The Settings Event_Date arrives as a
// raw ISO/UTC instant (e.g. "2026-06-26T14:00:00.000Z"); show it as a clean
// Melbourne-local date "27 Jun 2026" instead of the raw string. Timezone-correct
// regardless of the viewer's device timezone; blank/unparseable values pass
// through unchanged so nothing crashes.
export function formatEventDate(value: string | undefined | null): string {
  const s = String(value ?? "").trim();
  if (s === "") return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = parseInt(get("day"), 10);
  const month = parseInt(get("month"), 10);
  const year = get("year");
  if (!day || !month || !year) return s;
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
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
