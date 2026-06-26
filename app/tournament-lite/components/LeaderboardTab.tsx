"use client";

import { useState } from "react";
import type { TournamentState } from "../lib/types";
import { num, groupBy, poolLetter, humanError, categoryStats } from "../lib/utils";
import { recalcLeaderboard } from "../lib/api";
import { Message, CategoryNav, CategoryStats } from "./ui";

type HoldFn = (on: boolean) => void;

export default function LeaderboardTab({
  state,
  categories,
  selected,
  onSelect,
  onRecalc,
  onHold,
}: {
  state: TournamentState;
  categories: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onRecalc: () => Promise<void>;
  onHold: HoldFn;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const rows = (state.leaderboard ?? []).filter((r) => String(r.Category_ID) === selected);
  const stats = categoryStats(state, selected);
  const byPool = groupBy(rows, (r) => String(r.Pool_ID));

  // Emergency-only: standings update automatically on every score save.
  async function repair() {
    setBusy(true);
    setMsg(null);
    onHold(true);
    try {
      const res = await recalcLeaderboard();
      if (res.ok) {
        setMsg({ type: "success", text: "Standings repaired." });
        await onRecalc();
      } else {
        setMsg({ type: "error", text: humanError(res.reason, res.message) });
      }
    } finally {
      setBusy(false);
      onHold(false);
    }
  }

  return (
    <div className="tlite-stack">
      <CategoryNav categories={categories} selected={selected} onSelect={onSelect} />
      <CategoryStats items={stats.items} timeWindow={stats.window} />

      {msg && <Message type={msg.type} text={msg.text} />}

      {rows.length === 0 ? (
        <div className="tlite-empty">No standings in this category yet. Enter scores in the Matches tab.</div>
      ) : (
        [...byPool.keys()].sort().map((poolId) => {
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
                      <th className="tlite-lb-th-num">PF</th>
                      <th className="tlite-lb-th-num">PA</th>
                      <th className="tlite-lb-th-num">PD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pr.map((r) => {
                      const pd = num(r.Point_Diff);
                      return (
                        <tr key={String(r.Entry_ID)}>
                          <td className="tlite-lb-rank">{num(r.Rank)}</td>
                          <td className="tlite-lb-name">{r.Entry_Name || r.Entry_ID}</td>
                          <td className="tlite-lb-num">{num(r.Played)}</td>
                          <td className="tlite-lb-num">{num(r.Wins)}</td>
                          <td className="tlite-lb-num">{num(r.Losses)}</td>
                          <td className="tlite-lb-num tlite-lb-pts">{num(r.Points)}</td>
                          <td className="tlite-lb-num">{num(r.Points_For)}</td>
                          <td className="tlite-lb-num">{num(r.Points_Against)}</td>
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
        })
      )}

      <div className="tlite-repair">
        <span className="tlite-repair-note">Standings update automatically as scores are saved.</span>
        <button className="tlite-btn tlite-btn-sm tlite-btn-ghost" onClick={repair} disabled={busy}>
          {busy ? "Repairing…" : "Repair standings"}
        </button>
      </div>
    </div>
  );
}
