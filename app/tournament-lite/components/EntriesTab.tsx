"use client";
import { useState } from "react";
import type { TournamentState } from "../lib/types";
import { useTournamentApi } from "../lib/api";
import { entryLabel, isActiveStatus } from "../lib/utils";

export default function EntriesTab({ state, onRefresh }: { state: TournamentState; onRefresh: () => Promise<void> }) {
  const { saveEntry } = useTournamentApi();
  const cats = (state.categories ?? []).filter(c => isActiveStatus(c.Status));
  const [categoryId, setCategoryId] = useState(String(cats[0]?.Category_ID || ""));
  const category = cats.find(c => String(c.Category_ID) === categoryId);
  const [club, setClub] = useState("");
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const locked = (state.matches ?? []).some(m => String(m.Category_ID) === categoryId);
  const inter = category?.Fixture_Mode === "InterClub";
  const selectedClub = club || category?.Club_A || "";
  // Keep generated IDs across retries, including uncertain network outcomes.
  const [ids] = useState(() => new Map<string, string>());
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError(false);
    const rows = names.split(/\r?\n/).map(n => n.trim()).filter(Boolean);
    if (new Set(rows.map(n => n.toLowerCase())).size !== rows.length) { setMessage("Use a distinct name for each team in this list."); setError(true); setBusy(false); return; }
    let saved = 0;
    for (const name of rows) {
      const key = `${categoryId}:${inter ? selectedClub : club}:${name}`;
      if (!ids.has(key)) ids.set(key, `E-${crypto.randomUUID()}`);
      const r = await saveEntry({ Entry_ID: ids.get(key), Category_ID: categoryId, Entry_Name: name, Club_Name: inter ? selectedClub : club, Status: "Active" });
      if (!r.ok) { setError(true); setMessage(`${saved} saved. ${r.message || "Could not save team."} Retry keeps the same team IDs.`); setBusy(false); await onRefresh(); return; }
      saved++;
    }
    setNames(""); setMessage(`${saved} teams saved.`); setBusy(false); await onRefresh();
  }
  return <div className="tlite-stack">
    <form className="tlite-card tlite-stack" onSubmit={add}>
      <h3 className="tlite-card-title">Add teams</h3>
      {!cats.length ? <p>Create a category in Setup first.</p> : <>
        <label className="tlite-field">Category<select className="tlite-input" value={categoryId} disabled={busy} onChange={e => { setCategoryId(e.target.value); setClub(""); }}>{cats.map(c => <option key={c.Category_ID} value={c.Category_ID}>{c.Category_Name}</option>)}</select></label>
        <label className="tlite-field">Club{inter ? <select aria-label="Club" className="tlite-input" value={selectedClub} disabled={busy} onChange={e => setClub(e.target.value)}><option>{category?.Club_A}</option><option>{category?.Club_B}</option></select> : <input className="tlite-input" value={club} disabled={busy} onChange={e => setClub(e.target.value)} placeholder="Optional club name" />}</label>
        <label className="tlite-field">Team names — one per line<textarea className="tlite-input" rows={6} value={names} onChange={e => setNames(e.target.value)} required disabled={busy || locked} placeholder={"Team 1\nTeam 2\nTeam 3"} /></label>
        {locked && <p className="tlite-warn">This category already has fixtures. Reset its fixtures in Setup before changing the roster.</p>}
        <button className="tlite-btn tlite-btn-primary" disabled={busy || locked || !names.trim()}>{busy ? "Saving teams…" : "Add teams"}</button>
      </>}
      {message && <p className={`tlite-msg tlite-msg-${error ? "error" : "success"}`} role="status">{message}</p>}
    </form>
    {cats.map(c => <section key={c.Category_ID} className="tlite-section"><h3>{c.Category_Name}</h3><div className="tlite-cards">{(state.entries ?? []).filter(e => String(e.Category_ID) === String(c.Category_ID)).map(e => <div key={e.Entry_ID} className="tlite-card"><strong>{entryLabel(e)}</strong><p className="tlite-muted">{e.Club_Name || "No club"}{!isActiveStatus(e.Status) ? " · Withdrawn" : ""}</p></div>)}</div></section>)}
  </div>;
}
