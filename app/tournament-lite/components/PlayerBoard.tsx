"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPublicBoard } from "../lib/api";
import { num, isTrueish, groupBy, poolLetter, formatClock, formatEventDate } from "../lib/utils";
import { CategoryNav, CategoryStats, LoadingState } from "./ui";
import type { PublicBoard, PublicCategory, Match, LeaderRow } from "../lib/types";

const AUTO_REFRESH_MS = 12000; // player board: 10–15s

function boardError(reason?: string, message?: string): string {
  switch (reason) {
    case "not_published":
      return "This board isn’t published yet. Check back soon.";
    case "invalid_token":
      return "This board link isn’t valid.";
    case "bad_request":
      return "This board link is missing its token.";
    case "network_error":
    case "timeout":
      return "Can’t reach the board right now — check your connection.";
    default:
      return message || "The board is unavailable right now.";
  }
}

function isCompleted(m: Match): boolean {
  return String(m.Status) === "Completed";
}
function isPlayableBye(m: Match): boolean {
  return isTrueish(m.Is_Bye) || String(m.Status) === "Bye";
}

export default function PlayerBoard({ token }: { token: string }) {
  const [board, setBoard] = useState<PublicBoard | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [view, setView] = useState<"matches" | "leaderboard">("matches");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    if (firstLoad.current) setStatus("loading");
    else setRefreshing(true);
    const res = await fetchPublicBoard(token);
    if (res.ok) {
      setBoard(res);
      setLastUpdated(new Date());
      setStatus("ready");
    } else if (firstLoad.current) {
      setErrorMsg(boardError(res.reason, res.message));
      setStatus("error");
    }
    firstLoad.current = false;
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-refresh — preserves the selected category and view.
  useEffect(() => {
    if (status !== "ready") return;
    const id = setInterval(() => {
      void load();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [status, load]);

  const categories = useMemo<PublicCategory[]>(() => board?.categories ?? [], [board]);

  // Default to first category; fall back if the selection disappears.
  useEffect(() => {
    if (categories.length === 0) return;
    if (!selectedCat || !categories.some((c) => c.id === selectedCat)) {
      const hinted = board?.selectedCategoryId;
      setSelectedCat(hinted && categories.some((c) => c.id === hinted) ? hinted : categories[0].id);
    }
  }, [categories, selectedCat, board]);

  if (status === "loading") {
    return (
      <main className="tlite-shell tlite-board">
        <LoadingState />
      </main>
    );
  }
  if (status === "error") {
    return (
      <main className="tlite-shell tlite-board">
        <div className="tlite-state">
          <p className="tlite-state-title">Board unavailable</p>
          <p className="tlite-state-text">{errorMsg}</p>
          <button
            className="tlite-btn tlite-btn-primary"
            onClick={() => {
              firstLoad.current = true;
              void load();
            }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const event = board?.event ?? {};
  const meta = [formatEventDate(event.date), event.venue].filter(Boolean).join(" · ");
  const cat = categories.find((c) => c.id === selectedCat);
  const matches = (board?.matches ?? []).filter((m) => String(m.Category_ID) === selectedCat);
  const leaderboard = (board?.leaderboard ?? []).filter((r) => String(r.Category_ID) === selectedCat);

  const completedCount = matches.filter(isCompleted).length;
  const upcomingCount = matches.filter((m) => !isCompleted(m) && !isPlayableBye(m)).length;

  const statItems = cat
    ? [
        { label: "Entries", value: cat.entries },
        { label: "Matches", value: matches.length },
        { label: "Final", value: completedCount },
        { label: "Upcoming", value: upcomingCount },
        { label: "% Complete", value: `${cat.pct}%` },
        ...(cat.overflow > 0 ? [{ label: "Overflow", value: cat.overflow, warn: true }] : []),
      ]
    : [];
  const timeWindow = cat && (cat.startTime || cat.endTime) ? `${cat.startTime || "—"}–${cat.endTime || "—"}` : "";

  return (
    <main className="tlite-shell tlite-board">
      <header className="tlite-board-header">
        <div className="tlite-board-id">
          <h1 className="tlite-board-name">{event.name || "Tournament"}</h1>
          {meta && <p className="tlite-board-meta">{meta}</p>}
        </div>
        <div className="tlite-board-sync">
          <div className="tlite-live">
            <span className="tlite-live-top">
              <span className="tlite-live-dot" aria-hidden="true" />
              Live results
            </span>
            <span className="tlite-live-sub">
              Updates automatically{lastUpdated ? ` · Last updated ${formatClock(lastUpdated)}` : ""}
            </span>
          </div>
          <button
            className="tlite-btn tlite-btn-sm tlite-btn-ghost tlite-refresh-icon"
            onClick={() => void load()}
            disabled={refreshing}
            aria-label="Refresh now"
            title="Refresh now"
          >
            {refreshing ? "…" : "↻"}
          </button>
        </div>
      </header>

      <CategoryNav
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        selected={selectedCat}
        onSelect={setSelectedCat}
      />
      <CategoryStats items={statItems} timeWindow={timeWindow} />

      <div className="tlite-board-toggle" role="tablist" aria-label="View">
        <button
          role="tab"
          aria-selected={view === "matches"}
          className={`tlite-toggle-tab${view === "matches" ? " tlite-toggle-tab-active" : ""}`}
          onClick={() => setView("matches")}
        >
          Matches
        </button>
        <button
          role="tab"
          aria-selected={view === "leaderboard"}
          className={`tlite-toggle-tab${view === "leaderboard" ? " tlite-toggle-tab-active" : ""}`}
          onClick={() => setView("leaderboard")}
        >
          Leaderboard
        </button>
      </div>

      {view === "matches" ? <BoardMatchesView matches={matches} /> : <BoardLeaderboard rows={leaderboard} />}
    </main>
  );
}

function hasTime(m: Match): boolean {
  return /^\d{2}:\d{2}$/.test(String(m.Start_Time ?? ""));
}

function BoardMatchesView({ matches }: { matches: Match[] }) {
  const [matchTab, setMatchTab] = useState<"upcoming" | "results">("upcoming");
  const [query, setQuery] = useState("");

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => !isCompleted(m) && !isPlayableBye(m))
        .sort((a, b) => {
          const ta = hasTime(a) ? String(a.Start_Time) : "99:99";
          const tb = hasTime(b) ? String(b.Start_Time) : "99:99";
          return ta.localeCompare(tb) || num(a.Round_No) - num(b.Round_No) || num(a.Match_No) - num(b.Match_No);
        }),
    [matches],
  );
  const results = useMemo(
    () =>
      matches
        .filter(isCompleted)
        .sort((a, b) => num(a.Round_No) - num(b.Round_No) || num(a.Match_No) - num(b.Match_No)),
    [matches],
  );

  const base = matchTab === "upcoming" ? upcoming : results;
  const q = query.trim().toLowerCase();
  const list = q
    ? base.filter(
        (m) =>
          String(m.Entry1_Name ?? "").toLowerCase().includes(q) ||
          String(m.Entry2_Name ?? "").toLowerCase().includes(q),
      )
    : base;

  const nextUp = upcoming.find(hasTime);
  const nextLabel = nextUp ? `${nextUp.Court ? `${nextUp.Court} · ` : ""}${nextUp.Start_Time}` : "";

  return (
    <div className="tlite-stack">
      <div className="tlite-subtoggle" role="tablist" aria-label="Match status">
        <button
          role="tab"
          aria-selected={matchTab === "upcoming"}
          className={`tlite-subtoggle-tab${matchTab === "upcoming" ? " tlite-subtoggle-tab-active" : ""}`}
          onClick={() => setMatchTab("upcoming")}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          role="tab"
          aria-selected={matchTab === "results"}
          className={`tlite-subtoggle-tab${matchTab === "results" ? " tlite-subtoggle-tab-active" : ""}`}
          onClick={() => setMatchTab("results")}
        >
          Results ({results.length})
        </button>
      </div>

      {matchTab === "upcoming" && nextLabel && (
        <div className="tlite-board-next">
          <span className="tlite-next-label">Next up</span>
          <span className="tlite-next-val">{nextLabel}</span>
        </div>
      )}

      <input
        className="tlite-board-search"
        type="text"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search player name"
        aria-label="Search player name"
      />
      {q && list.length > 0 && (
        <div className="tlite-search-count">
          {list.length} match{list.length === 1 ? "" : "es"} found
        </div>
      )}

      {list.length === 0 ? (
        <div className="tlite-empty">
          {q
            ? `No matches for “${query.trim()}”.`
            : matchTab === "upcoming"
              ? "No upcoming matches in this category."
              : "No results yet in this category."}
        </div>
      ) : (
        <div className="tlite-board-matches">
          {list.map((m) => (
            <PlayerMatchCard key={String(m.Match_ID)} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerMatchCard({ match }: { match: Match }) {
  const completed = isCompleted(match);
  const isBye = isPlayableBye(match);
  const isOverflow = !isBye && String(match.Court ?? "").trim() === "";
  const win1 = completed && String(match.Winner_Entry_ID) === String(match.Entry1_ID);
  const win2 = completed && String(match.Winner_Entry_ID) === String(match.Entry2_ID);

  return (
    <div className={`tlite-card tlite-pmatch${completed ? " tlite-pmatch-done" : ""}`}>
      <div className="tlite-pmatch-meta">
        <span className="tlite-match-round">R{match.Round_No}</span>
        {!isBye && !isOverflow && match.Court && <span className="tlite-badge tlite-badge-court">{match.Court}</span>}
        {!isBye && match.Start_Time ? <span className="tlite-pmatch-time">{match.Start_Time}</span> : null}
        {isOverflow && <span className="tlite-badge tlite-badge-overflow">Unscheduled</span>}
        <span className="tlite-match-flex" />
        {completed ? (
          <span className="tlite-badge tlite-badge-completed">Final</span>
        ) : isBye ? (
          <span className="tlite-badge tlite-badge-bye">Bye</span>
        ) : (
          <span className="tlite-badge tlite-badge-scheduled">Scheduled</span>
        )}
      </div>

      {completed ? (
        <div className="tlite-pmatch-rows">
          <div className={`tlite-pmatch-row${win1 ? " tlite-pmatch-win" : " tlite-pmatch-lose"}`}>
            <span className="tlite-pmatch-team">
              {win1 && <span className="tlite-win-tick" aria-hidden="true">✓</span>}
              {match.Entry1_Name || match.Entry1_ID}
            </span>
            <span className="tlite-pmatch-score">{num(match.Score1)}</span>
          </div>
          <div className={`tlite-pmatch-row${win2 ? " tlite-pmatch-win" : " tlite-pmatch-lose"}`}>
            <span className="tlite-pmatch-team">
              {win2 && <span className="tlite-win-tick" aria-hidden="true">✓</span>}
              {match.Entry2_Name || match.Entry2_ID}
            </span>
            <span className="tlite-pmatch-score">{num(match.Score2)}</span>
          </div>
        </div>
      ) : (
        <div className="tlite-pmatch-rows">
          <div className="tlite-pmatch-row">
            <span className="tlite-pmatch-team">{match.Entry1_Name || match.Entry1_ID}</span>
          </div>
          <div className="tlite-pmatch-row">
            <span className="tlite-pmatch-team">{match.Entry2_Name || match.Entry2_ID}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardLeaderboard({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) return <div className="tlite-empty">No standings in this category yet.</div>;
  const byPool = groupBy(rows, (r) => String(r.Pool_ID));
  return (
    <div className="tlite-stack">
      {[...byPool.keys()].sort().map((poolId) => {
        const pr = [...(byPool.get(poolId) ?? [])].sort((a, b) => num(a.Rank) - num(b.Rank));
        return (
          <div key={poolId} className="tlite-pool">
            <div className="tlite-pool-label">Pool {poolLetter(poolId)}</div>
            <div className="tlite-lb-scroll">
              <table className="tlite-lb">
                <thead>
                  <tr>
                    <th className="tlite-lb-th-rank">#</th>
                    <th>Entry</th>
                    <th className="tlite-lb-th-num">P</th>
                    <th className="tlite-lb-th-num">W</th>
                    <th className="tlite-lb-th-num">L</th>
                    <th className="tlite-lb-th-num tlite-lb-th-pts">Pts</th>
                    <th className="tlite-lb-th-num">PD</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.map((r, i) => {
                    const pd = num(r.Point_Diff);
                    return (
                      <tr key={i}>
                        <td className="tlite-lb-rank">{num(r.Rank)}</td>
                        <td className="tlite-lb-name">{r.Entry_Name}</td>
                        <td className="tlite-lb-num">{num(r.Played)}</td>
                        <td className="tlite-lb-num">{num(r.Wins)}</td>
                        <td className="tlite-lb-num">{num(r.Losses)}</td>
                        <td className="tlite-lb-num tlite-lb-pts">{num(r.Points)}</td>
                        <td className={`tlite-lb-num${pd > 0 ? " tlite-pd-pos" : pd < 0 ? " tlite-pd-neg" : ""}`}>
                          {pd > 0 ? `+${pd}` : pd}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
