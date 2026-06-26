"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkspaceTabs, { type WorkspaceTab } from "./WorkspaceTabs";
import EventSummary from "./EventSummary";
import SetupTab from "./SetupTab";
import EntriesTab from "./EntriesTab";
import MatchesTab from "./MatchesTab";
import LeaderboardTab from "./LeaderboardTab";
import { LoadingState, ErrorState } from "./ui";
import { fetchState } from "../lib/api";
import { humanError, isActiveStatus, num, formatClock } from "../lib/utils";
import type { TournamentState, Match, LeaderRow } from "../lib/types";

type Status = "loading" | "error" | "ready";

const AUTO_REFRESH_MS = 25000; // admin: 20–30s

export default function EventWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("setup");
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [state, setState] = useState<TournamentState | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Pause auto-refresh while the user is mid-action (score save, repair, modal).
  const holdRef = useRef(0);
  const setHold = useCallback((on: boolean) => {
    holdRef.current = Math.max(0, holdRef.current + (on ? 1 : -1));
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetchState();
    if (res.ok) {
      setState(res);
      setLastSynced(new Date());
      setStatus("ready");
    } else {
      setErrorMsg(humanError(res.reason, res.message));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Soft refresh — keeps the current tab + selected category while re-fetching.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await fetchState();
    if (res.ok) {
      setState(res);
      setLastSynced(new Date());
    }
    setRefreshing(false);
  }, []);

  // Instant local merge after a score save (no full refetch needed).
  const applyScore = useCallback((matchId: string, result: { match?: Match; leaderboard?: LeaderRow[] }) => {
    setState((prev) => {
      if (!prev) return prev;
      const matches = (prev.matches ?? []).map((m) =>
        String(m.Match_ID) === matchId && result.match ? { ...m, ...result.match } : m,
      );
      let leaderboard = prev.leaderboard ?? [];
      if (result.leaderboard && result.leaderboard.length > 0) {
        const poolId = String(result.leaderboard[0].Pool_ID);
        leaderboard = leaderboard.filter((r) => String(r.Pool_ID) !== poolId).concat(result.leaderboard);
      }
      return { ...prev, matches, leaderboard };
    });
    setLastSynced(new Date());
  }, []);

  // Active categories for the category nav.
  const activeCategories = useMemo(
    () =>
      [...(state?.categories ?? [])]
        .filter((c) => isActiveStatus(c.Status))
        .sort((a, b) => num(a.Display_Order) - num(b.Display_Order))
        .map((c) => ({ id: String(c.Category_ID), name: c.Category_Name || String(c.Category_ID) })),
    [state],
  );

  // Default to the first active category; fall back if the selection disappears.
  useEffect(() => {
    if (activeCategories.length === 0) return;
    if (!selectedCat || !activeCategories.some((c) => c.id === selectedCat)) {
      setSelectedCat(activeCategories[0].id);
    }
  }, [activeCategories, selectedCat]);

  // Auto-refresh on the live tabs only, paused while interacting / typing / busy.
  useEffect(() => {
    if (status !== "ready") return;
    if (activeTab !== "matches" && activeTab !== "leaderboard") return;
    const id = setInterval(() => {
      if (holdRef.current > 0 || refreshing) return;
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT")) return;
      void refresh();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [status, activeTab, refreshing, refresh]);

  return (
    <main className="tlite-shell">
      <header className="tlite-topbar">
        <div className="tlite-topbar-id">
          <h1 className="tlite-title">Tournament Lite</h1>
          <p className="tlite-subtitle">Round-robin control surface</p>
        </div>
        {status === "ready" && (
          <div className="tlite-sync">
            <span className="tlite-synced">
              {lastSynced ? `Last synced ${formatClock(lastSynced)}` : "—"}
              {(activeTab === "matches" || activeTab === "leaderboard") && (
                <span className="tlite-auto"> · Auto-refresh on</span>
              )}
            </span>
            <button
              className="tlite-btn tlite-btn-sm tlite-btn-ghost"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              className="tlite-btn tlite-btn-sm tlite-btn-ghost"
              onClick={async () => {
                await fetch("/api/tournament-lite/admin-logout", { method: "POST" });
                window.location.href = "/tournaments/login";
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState message={errorMsg} onRetry={() => void load()} />}

      {status === "ready" && state && (
        <>
          <EventSummary state={state} />

          <div className="tlite-tabbar">
            <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />
            {refreshing && <span className="tlite-refreshing">Updating…</span>}
          </div>

          <section className="tlite-tabpanel" role="tabpanel">
            {activeTab === "setup" && <SetupTab state={state} onRefresh={refresh} />}
            {activeTab === "entries" && <EntriesTab state={state} />}
            {activeTab === "matches" && (
              <MatchesTab
                state={state}
                categories={activeCategories}
                selected={selectedCat}
                onSelect={setSelectedCat}
                onScored={applyScore}
                onHold={setHold}
              />
            )}
            {activeTab === "leaderboard" && (
              <LeaderboardTab
                state={state}
                categories={activeCategories}
                selected={selectedCat}
                onSelect={setSelectedCat}
                onRecalc={refresh}
                onHold={setHold}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
