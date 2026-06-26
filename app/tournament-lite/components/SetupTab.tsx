"use client";

import { useState } from "react";
import type { TournamentState, Category } from "../lib/types";
import { isActiveStatus, isTrueish, num, humanError, eventCourtLabels, settingValue, formatCourtList } from "../lib/utils";
import { generateFixtures, resetFixtures, saveCategory } from "../lib/api";
import { Message } from "./ui";
import CategoryEditModal from "./CategoryEditModal";
import PlayerLinkCard from "./PlayerLinkCard";

type Msg = { type: "success" | "error"; text: string } | null;

export default function SetupTab({
  state,
  onRefresh,
}: {
  state: TournamentState;
  onRefresh: () => Promise<void>;
}) {
  const categories = [...(state.categories ?? [])].sort((a, b) => num(a.Display_Order) - num(b.Display_Order));
  const courtLabels = eventCourtLabels(state);
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div className="tlite-stack">
      <GlobalFixtureCard state={state} onRefresh={onRefresh} />

      <PlayerLinkCard token={settingValue(state, "Share_Token")} />

      <section className="tlite-section">
        <div className="tlite-section-label">Categories</div>
        <div className="tlite-cards tlite-cards-wide">
          {categories.map((c) => (
            <CategoryControlCard key={String(c.Category_ID)} category={c} state={state} onEdit={setEditing} onRefresh={onRefresh} />
          ))}
        </div>
      </section>

      {editing && (
        <CategoryEditModal
          category={editing}
          courtLabels={courtLabels}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const res = await saveCategory({ categoryId: String(editing.Category_ID), ...patch });
            if (res.ok) await onRefresh();
            return { ok: res.ok, message: res.ok ? "" : humanError(res.reason, res.message) };
          }}
        />
      )}
    </div>
  );
}

function GlobalFixtureCard({ state, onRefresh }: { state: TournamentState; onRefresh: () => Promise<void> }) {
  const matches = state.matches ?? [];
  const [confirm, setConfirm] = useState<null | "generate" | "reset">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function run(kind: "generate" | "reset") {
    setBusy(true);
    setMsg(null);
    const res = kind === "generate" ? await generateFixtures({ force: true }) : await resetFixtures();
    setBusy(false);
    setConfirm(null);
    if (res.ok) {
      setMsg({
        type: "success",
        text: kind === "generate" ? `Generated ${res.counts?.matches ?? 0} matches.` : "All fixtures cleared.",
      });
      await onRefresh();
    } else {
      setMsg({ type: "error", text: humanError(res.reason, res.message) });
    }
  }

  return (
    <section className="tlite-card tlite-generate">
      <div className="tlite-generate-head">
        <div>
          <h3 className="tlite-card-title">Fixtures</h3>
          <p className="tlite-muted">
            {matches.length > 0 ? `${matches.length} matches generated across all categories.` : "No fixtures generated yet."}
          </p>
        </div>
        {!confirm && (
          <div className="tlite-cat-actions">
            <button className="tlite-btn tlite-btn-primary" onClick={() => { setMsg(null); setConfirm("generate"); }} disabled={busy}>
              Generate all
            </button>
            <button className="tlite-btn tlite-btn-danger" onClick={() => { setMsg(null); setConfirm("reset"); }} disabled={busy}>
              Reset all
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <div className="tlite-confirm">
          <p className="tlite-warn">
            Regenerating fixtures overwrites generated matches for the selected scope. Use before scoring starts.
          </p>
          <div className="tlite-confirm-actions">
            <button className="tlite-btn tlite-btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className={`tlite-btn ${confirm === "reset" ? "tlite-btn-danger" : "tlite-btn-primary"}`}
              onClick={() => run(confirm)}
              disabled={busy}
            >
              {busy ? "Working…" : confirm === "generate" ? "Generate all" : "Reset all"}
            </button>
          </div>
        </div>
      )}

      {msg && <Message type={msg.type} text={msg.text} />}
    </section>
  );
}

function CategoryControlCard({
  category,
  state,
  onEdit,
  onRefresh,
}: {
  category: Category;
  state: TournamentState;
  onEdit: (c: Category) => void;
  onRefresh: () => Promise<void>;
}) {
  const catId = String(category.Category_ID);
  const name = category.Category_Name || catId;
  const entries = (state.entries ?? []).filter((e) => String(e.Category_ID) === catId && isActiveStatus(e.Status)).length;
  const catMatches = (state.matches ?? []).filter((m) => String(m.Category_ID) === catId);
  const overflow = catMatches.filter((m) => !isTrueish(m.Is_Bye) && String(m.Court ?? "").trim() === "").length;

  const [confirm, setConfirm] = useState<null | "generate" | "reset">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function run(kind: "generate" | "reset") {
    setBusy(true);
    setMsg(null);
    const res = kind === "generate" ? await generateFixtures({ categoryId: catId, force: true }) : await resetFixtures(catId);
    setBusy(false);
    setConfirm(null);
    if (res.ok) {
      setMsg({
        type: "success",
        text: kind === "generate" ? `Generated ${res.counts?.matches ?? 0} matches.` : "Fixtures cleared.",
      });
      await onRefresh();
    } else {
      setMsg({ type: "error", text: humanError(res.reason, res.message) });
    }
  }

  return (
    <div className="tlite-card tlite-cat">
      <div className="tlite-cat-head">
        <h4 className="tlite-cat-name">{name}</h4>
        {category.Event_Code && <span className="tlite-badge tlite-badge-code">{category.Event_Code}</span>}
      </div>

      <div className="tlite-cat-grid">
        <div><span className="tlite-cat-k">Time</span><span className="tlite-cat-v">{category.Start_Time || "—"}–{category.End_Time || "—"}</span></div>
        <div><span className="tlite-cat-k">Courts</span><span className="tlite-cat-v">{formatCourtList(category.Court_Whitelist)}</span></div>
        <div><span className="tlite-cat-k">Match</span><span className="tlite-cat-v">{category.Match_Duration_Minutes ? `${category.Match_Duration_Minutes} min` : "—"}</span></div>
        <div><span className="tlite-cat-k">Buffer</span><span className="tlite-cat-v">{category.Buffer_Minutes === "" || category.Buffer_Minutes == null ? "—" : `${category.Buffer_Minutes} min`}</span></div>
        <div><span className="tlite-cat-k">Pool size</span><span className="tlite-cat-v">{category.Pool_Size || "Auto"}</span></div>
      </div>

      <div className="tlite-cat-stats">
        <span><b>{entries}</b> entries</span>
        <span><b>{catMatches.length}</b> matches</span>
        {overflow > 0 && <span className="tlite-cat-overflow"><b>{overflow}</b> overflow</span>}
      </div>

      {confirm ? (
        <div className="tlite-confirm">
          <p className="tlite-warn">
            {confirm === "generate"
              ? `Regenerate ${name} fixtures? This overwrites its generated matches.`
              : `Reset ${name}? This clears its pools, matches and standings.`}
          </p>
          <div className="tlite-confirm-actions">
            <button className="tlite-btn tlite-btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className={`tlite-btn ${confirm === "reset" ? "tlite-btn-danger" : "tlite-btn-primary"}`}
              onClick={() => run(confirm)}
              disabled={busy}
            >
              {busy ? "Working…" : confirm === "generate" ? "Regenerate" : "Reset"}
            </button>
          </div>
        </div>
      ) : (
        <div className="tlite-cat-actions">
          <button className="tlite-btn tlite-btn-sm" onClick={() => onEdit(category)} disabled={busy}>
            Edit
          </button>
          <button className="tlite-btn tlite-btn-sm tlite-btn-primary" onClick={() => { setMsg(null); setConfirm("generate"); }} disabled={busy}>
            Generate
          </button>
          <button className="tlite-btn tlite-btn-sm tlite-btn-danger" onClick={() => { setMsg(null); setConfirm("reset"); }} disabled={busy}>
            Reset
          </button>
        </div>
      )}

      {msg && <Message type={msg.type} text={msg.text} compact />}
    </div>
  );
}
