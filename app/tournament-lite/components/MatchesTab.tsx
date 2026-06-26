"use client";

import { useState } from "react";
import type { TournamentState, Match, LeaderRow } from "../lib/types";
import { isTrueish, num, groupBy, poolLetter, humanError, categoryStats } from "../lib/utils";
import { submitScore } from "../lib/api";
import { Message, CategoryNav, CategoryStats } from "./ui";

type ScoredFn = (matchId: string, result: { match?: Match; leaderboard?: LeaderRow[] }) => void;
type HoldFn = (on: boolean) => void;

export default function MatchesTab({
  state,
  categories,
  selected,
  onSelect,
  onScored,
  onHold,
}: {
  state: TournamentState;
  categories: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onScored: ScoredFn;
  onHold: HoldFn;
}) {
  const matches = (state.matches ?? []).filter((m) => String(m.Category_ID) === selected);
  const stats = categoryStats(state, selected);
  const byPool = groupBy(matches, (m) => String(m.Pool_ID));

  return (
    <div className="tlite-stack">
      <CategoryNav categories={categories} selected={selected} onSelect={onSelect} />
      <CategoryStats items={stats.items} timeWindow={stats.window} />

      {matches.length === 0 ? (
        <div className="tlite-empty">No matches in this category yet. Generate fixtures from the Setup tab.</div>
      ) : (
        [...byPool.keys()].sort().map((poolId) => {
          const pms = [...(byPool.get(poolId) ?? [])].sort(
            (a, b) => num(a.Round_No) - num(b.Round_No) || num(a.Match_No) - num(b.Match_No),
          );
          return (
            <div key={poolId} className="tlite-pool">
              <div className="tlite-pool-label">Pool {poolLetter(poolId)}</div>
              <div className="tlite-matches">
                {pms.map((m) => (
                  <MatchCard key={String(m.Match_ID)} match={m} onScored={onScored} onHold={onHold} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MatchCard({ match, onScored, onHold }: { match: Match; onScored: ScoredFn; onHold: HoldFn }) {
  const isBye = isTrueish(match.Is_Bye) || String(match.Status) === "Bye";
  const isOverflow = !isBye && String(match.Court ?? "").trim() === "";
  const completed = String(match.Status) === "Completed";

  const init = (v: unknown) => (v === "" || v == null ? "" : String(v));
  const [s1, setS1] = useState(init(match.Score1));
  const [s2, setS2] = useState(init(match.Score2));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const win1 = completed && String(match.Winner_Entry_ID) === String(match.Entry1_ID);
  const win2 = completed && String(match.Winner_Entry_ID) === String(match.Entry2_ID);

  async function save() {
    setMsg(null);
    if (s1.trim() === "" || s2.trim() === "") {
      setMsg({ type: "error", text: "Enter both scores." });
      return;
    }
    const n1 = Number(s1);
    const n2 = Number(s2);
    if (!Number.isInteger(n1) || !Number.isInteger(n2) || n1 < 0 || n2 < 0) {
      setMsg({ type: "error", text: "Scores must be whole numbers, 0 or more." });
      return;
    }
    if (n1 === n2) {
      setMsg({ type: "error", text: "Scores can’t be equal — there are no draws." });
      return;
    }
    setBusy(true);
    onHold(true);
    try {
      const res = await submitScore(String(match.Match_ID), n1, n2);
      if (res.ok) {
        setMsg({ type: "success", text: "Saved" });
        onScored(String(match.Match_ID), { match: res.match, leaderboard: res.leaderboard });
      } else {
        setMsg({ type: "error", text: humanError(res.reason, res.message) });
      }
    } finally {
      setBusy(false);
      onHold(false);
    }
  }

  const cls = [
    "tlite-card tlite-match",
    completed ? "tlite-match-done" : "",
    isBye ? "tlite-match-bye" : "",
    isOverflow ? "tlite-match-overflow" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <div className="tlite-match-meta">
        <span className="tlite-match-round">R{match.Round_No}</span>
        {isBye ? (
          <span className="tlite-badge tlite-badge-bye">Bye</span>
        ) : isOverflow ? (
          <span className="tlite-badge tlite-badge-overflow">Unscheduled</span>
        ) : (
          <span className="tlite-match-where">
            {match.Court}
            {match.Start_Time ? ` · ${match.Start_Time}` : ""}
          </span>
        )}
        <span className="tlite-match-flex" />
        {completed ? (
          <span className="tlite-badge tlite-badge-completed">Completed</span>
        ) : isBye ? null : (
          <span className="tlite-badge tlite-badge-scheduled">Scheduled</span>
        )}
      </div>

      <div className="tlite-match-teams">
        <span className={`tlite-team${win1 ? " tlite-team-win" : ""}`}>{match.Entry1_Name || match.Entry1_ID}</span>
        <span className="tlite-vs">vs</span>
        <span className={`tlite-team${win2 ? " tlite-team-win" : ""}`}>{match.Entry2_Name || match.Entry2_ID}</span>
      </div>

      {!isBye && (
        <div className="tlite-match-score">
          <input
            className="tlite-score-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={s1}
            onChange={(e) => setS1(e.target.value.replace(/[^0-9]/g, ""))}
            aria-label={`Score for ${match.Entry1_Name || "entry 1"}`}
            disabled={busy}
          />
          <span className="tlite-score-sep">–</span>
          <input
            className="tlite-score-input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={s2}
            onChange={(e) => setS2(e.target.value.replace(/[^0-9]/g, ""))}
            aria-label={`Score for ${match.Entry2_Name || "entry 2"}`}
            disabled={busy}
          />
          <button className="tlite-btn tlite-btn-sm tlite-btn-primary" onClick={save} disabled={busy}>
            {busy ? "…" : completed ? "Update" : "Save"}
          </button>
        </div>
      )}

      {msg && <Message type={msg.type} text={msg.text} compact />}
    </div>
  );
}
