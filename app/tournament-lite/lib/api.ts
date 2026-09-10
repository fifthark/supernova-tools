"use client";
import { createContext, useContext, useMemo } from "react";
import type { TournamentState, ActionResult, PublicBoard } from "./types";
export const TournamentContext = createContext("legacy");
export async function adminCall(path: string, body: Record<string, unknown> = {}): Promise<ActionResult> {
  try {
    const res = await fetch(`/api/tournament-lite/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 401) return { ok: false, reason: "unauthorized", message: "Your session expired. Sign in again." };
    return await res.json();
  } catch { return { ok: false, reason: "network_error", message: "Connection interrupted. Refresh to check whether your change saved before retrying." }; }
}
export function useTournamentApi() {
  const tournamentId = useContext(TournamentContext);
  return useMemo(() => {
    const call = (path: string, body: Record<string, unknown> = {}) => adminCall(path, { ...body, tournamentId });
    return {
      fetchState: () => call("state") as Promise<TournamentState>,
      generateFixtures: (opts: { categoryId?: string; force?: boolean; preview?: boolean; confirm?: boolean; previewToken?: string; requireSafeSchedule?: boolean; acceptUnscheduled?: boolean } = {}) => call("generate", opts),
      resetFixtures: (categoryId?: string) => call("reset", categoryId ? { categoryId } : {}),
      saveCategory: (body: Record<string, unknown>) => call("category", body),
      saveSettings: (body: Record<string, unknown>) => call("settings", body),
      saveEntry: (body: Record<string, unknown>) => call("entries", body),
      submitScore: (matchId: string, score1: number, score2: number) => call("score", { matchId, score1, score2 }),
      recalcLeaderboard: () => call("recalc"),
    };
  }, [tournamentId]);
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
