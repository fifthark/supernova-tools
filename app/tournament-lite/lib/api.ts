// Tournament Lite — client-side calls to the FifthArk server proxy ONLY.
// The proxy injects the admin secret server-side; nothing here knows it.

import type { TournamentState, ActionResult, PublicBoard } from "./types";

async function call(path: string, body?: unknown): Promise<ActionResult & Record<string, unknown>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await res.json()) as ActionResult & Record<string, unknown>;
  } catch {
    return { ok: false, reason: "network_error", message: "Network error — check your connection and try again." };
  }
}

export function fetchState(): Promise<TournamentState> {
  return call("/api/tournament-lite/state") as Promise<TournamentState>;
}

export function generateFixtures(opts?: { categoryId?: string; force?: boolean }): Promise<ActionResult> {
  const body: Record<string, unknown> = { force: opts?.force !== false };
  if (opts?.categoryId) body.categoryId = opts.categoryId;
  return call("/api/tournament-lite/generate", body);
}

export function resetFixtures(categoryId?: string): Promise<ActionResult> {
  return call("/api/tournament-lite/reset", categoryId ? { categoryId } : {});
}

export function saveCategory(payload: Record<string, unknown>): Promise<ActionResult> {
  return call("/api/tournament-lite/category", payload);
}

export function submitScore(matchId: string, score1: number, score2: number): Promise<ActionResult> {
  return call("/api/tournament-lite/score", { matchId, score1, score2 });
}

export function recalcLeaderboard(): Promise<ActionResult> {
  return call("/api/tournament-lite/recalc", {});
}

// Public, read-only board (no admin secret). GET via the FifthArk proxy.
export async function fetchPublicBoard(token: string, categoryId?: string): Promise<PublicBoard> {
  const qs = new URLSearchParams({ token });
  if (categoryId) qs.set("categoryId", categoryId);
  try {
    const res = await fetch(`/api/tournament-lite/public?${qs.toString()}`, { method: "GET" });
    return (await res.json()) as PublicBoard;
  } catch {
    return { ok: false, reason: "network_error", message: "Network error — check your connection and try again." };
  }
}
