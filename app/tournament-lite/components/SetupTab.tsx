"use client";
import { useState } from "react";
import type { TournamentState, Category, ActionResult } from "../lib/types";
import { useTournamentApi } from "../lib/api";
import { settingValue, eventCourtLabels, formatCourtList } from "../lib/utils";
import CategoryEditModal from "./CategoryEditModal";
import PlayerLinkCard from "./PlayerLinkCard";

export default function SetupTab({ state, onRefresh }: { state: TournamentState; onRefresh: () => Promise<void> }) {
  const { saveCategory } = useTournamentApi();
  const [editing, setEditing] = useState<Category | null>(null);
  return <div className="tlite-stack">
    <EventSettings key={JSON.stringify(state.settings)} state={state} onRefresh={onRefresh} />
    <PlayerLinkCard token={settingValue(state, "Share_Token")} />
    <FixtureControls state={state} onRefresh={onRefresh} />
    <section className="tlite-section">
      <div className="tlite-cat-head"><h3>Categories</h3><button className="tlite-btn tlite-btn-primary" onClick={() => setEditing({ Category_ID: `C-${crypto.randomUUID()}`, Category_Name: "", Fixture_Mode: "InterClub", Match_Duration_Minutes: 20, Buffer_Minutes: 5 })}>Add category</button></div>
      <div className="tlite-cards tlite-cards-wide">{(state.categories ?? []).map(c => <article className="tlite-card" key={c.Category_ID}>
        <h3>{c.Category_Name}</h3><p>{c.Fixture_Mode === "InterClub" ? `${c.Club_A} vs ${c.Club_B}` : "Round robin"}</p>
        <p className="tlite-muted">{c.Start_Time || "Event start"} – {c.End_Time || "Event end"} · {formatCourtList(c.Court_Whitelist)}</p>
        <button className="tlite-btn" onClick={() => setEditing(c)}>Edit category</button>
        <FixtureControls state={state} categoryId={String(c.Category_ID)} onRefresh={onRefresh} />
      </article>)}</div>
    </section>
    {editing && <CategoryEditModal category={editing} courtLabels={eventCourtLabels(state)} onClose={() => setEditing(null)} onSave={async patch => {
      const r = await saveCategory({ categoryId: editing.Category_ID, ...patch });
      if (r.ok) await onRefresh();
      return { ok: r.ok, message: r.message };
    }} />}
  </div>;
}

function EventSettings({ state, onRefresh }: { state: TournamentState; onRefresh: () => Promise<void> }) {
  const { saveSettings } = useTournamentApi();
  const defaults: Record<string, string> = { Num_Courts: "4", Day_Start_Time: "09:00", Day_End_Time: "17:00", Default_Match_Duration_Minutes: "20", Default_Buffer_Minutes: "5" };
  const fields = [["Event_Name", "Tournament name", "text"], ["Event_Date", "Date", "date"], ["Venue", "Venue", "text"], ["Day_Start_Time", "Tournament start", "time"], ["Day_End_Time", "Tournament end", "time"], ["Num_Courts", "Number of courts", "number"], ["Court_Names", "Court names (comma-separated, optional)", "text"], ["Default_Match_Duration_Minutes", "Match duration (minutes)", "number"], ["Default_Buffer_Minutes", "Break between matches (minutes)", "number"], ["Share_Token", "Player board link code", "text"]];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(([k]) => [k, settingValue(state, k) || defaults[k] || ""])));
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    if (values.Day_End_Time <= values.Day_Start_Time) { setMessage("End time must be after start time on the same day."); return; }
    const courts = values.Court_Names.split(",").map(s => s.trim()).filter(Boolean);
    if (courts.length && (courts.length !== Number(values.Num_Courts) || new Set(courts.map(c => c.toLowerCase())).size !== courts.length)) { setMessage("Enter one distinct court name for each court, or leave court names blank."); return; }
    if (values.Share_Token && !/^[A-Za-z0-9_-]+$/.test(values.Share_Token)) { setMessage("Use letters, numbers and hyphens for the player link code."); return; }
    setBusy(true); const r = await saveSettings(values); setBusy(false);
    if (r.ok) await onRefresh(); else setMessage(r.message || "Could not save settings.");
  }
  return <form className="tlite-card tlite-stack" onSubmit={save}><h3 className="tlite-card-title">Tournament settings</h3>
    <div className="tlite-settings-grid">{fields.map(([k, label, type]) => <label className="tlite-field" key={k}><span>{label}</span><input className="tlite-input" type={type} value={values[k]} min={k === "Default_Buffer_Minutes" ? 0 : 1} step={type === "number" ? 1 : undefined} required={!!defaults[k] || k === "Event_Name"} onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))} disabled={busy} /></label>)}</div>
    <p className="tlite-muted">Category times can override the tournament window. Changing settings does not move existing fixtures; preview and regenerate them before scoring starts.</p>
    <div className="tlite-cat-actions"><button className="tlite-btn tlite-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save tournament settings"}</button><button type="button" className="tlite-btn" disabled={busy || !!values.Share_Token} onClick={() => setValues(v => ({ ...v, Share_Token: `tournament-${crypto.randomUUID()}` }))}>Create player link code</button></div>
    {message && <p role="alert" className="tlite-msg tlite-msg-error">{message}</p>}
  </form>;
}
function FixtureControls({ state, categoryId, onRefresh }: { state: TournamentState; categoryId?: string; onRefresh: () => Promise<void> }) {
  const { generateFixtures, resetFixtures } = useTournamentApi();
  const [acceptUnscheduled, setAcceptUnscheduled] = useState(false);
  const [preview, setPreview] = useState<ActionResult | null>(null);
  const generationSchedule = preview?.generationSchedule ?? preview?.schedule;
  const [reset, setReset] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const matches = (state.matches ?? []).filter(m => !categoryId || String(m.Category_ID) === categoryId);
  const protectedScores = matches.some(m => m.Status === "Completed" || m.Status === "InProgress" || (m.Score1 !== "" && m.Score1 != null) || (m.Score2 !== "" && m.Score2 != null));
  async function run(kind: "preview" | "generate" | "reset") {
    setBusy(true); setMessage("");
    const r = kind === "reset" ? await resetFixtures(categoryId) : await generateFixtures({ categoryId, preview: kind === "preview", confirm: kind === "generate", requireSafeSchedule: true, acceptUnscheduled, previewToken: kind === "generate" ? preview?.previewToken : undefined });
    setBusy(false);
    if (!r.ok) { setMessage(r.message || "Could not complete the action."); return; }
    if (kind === "preview") { setPreview(r); setAcceptUnscheduled(false); }
    else { setPreview(null); setReset(false); setMessage(kind === "generate" ? `Created ${r.counts?.matches ?? 0} matches.` : "Fixtures cleared for this selection."); await onRefresh(); }
  }
  return <section className="tlite-card tlite-stack"><h3 className="tlite-card-title">{categoryId ? "Category fixtures" : "All tournament fixtures"}</h3>
    <p className="tlite-muted">{matches.length} existing matches. Court assignments are generated from the available courts and time window.</p>
    <div className="tlite-cat-actions"><button className="tlite-btn tlite-btn-primary" disabled={busy || protectedScores} onClick={() => { setReset(false); void run("preview"); }}>{busy ? "Working…" : "Preview matches"}</button><button className="tlite-btn tlite-btn-danger" disabled={busy || !matches.length} onClick={() => { setReset(true); setPreview(null); }}>Reset fixtures</button></div>
    {protectedScores && <p className="tlite-warn">Scores have been entered. Generation is blocked to preserve results.</p>}
    {reset && <div className="tlite-confirm"><p className="tlite-warn">Clear {matches.length} matches and their scores for {categoryId ? "this category" : "this tournament"}? This cannot be undone.</p><button className="tlite-btn" disabled={busy} onClick={() => setReset(false)}>Cancel</button> <button className="tlite-btn tlite-btn-danger" disabled={busy} onClick={() => void run("reset")}>Confirm reset</button></div>}
    {preview && <div className="tlite-stack"><strong>{preview.counts?.matches ?? 0} matches · {preview.counts?.overflowMatches ?? 0} unscheduled</strong>
      {!!((generationSchedule?.conflicts.length ?? 0) + (generationSchedule?.invalidMatchIds.length ?? 0)) && <p className="tlite-warn">Resolve {generationSchedule?.conflicts.length ?? 0} conflicts and {generationSchedule?.invalidMatchIds.length ?? 0} invalid times before creating matches.</p>}
      {!!generationSchedule?.unscheduledMatchIds.length && <label className="tlite-field"><span><input type="checkbox" checked={acceptUnscheduled} onChange={e => setAcceptUnscheduled(e.target.checked)} /> Create fixtures with {generationSchedule.unscheduledMatchIds.length} matches still unscheduled. These matches will have no court or start time until scheduling is resolved.</span></label>}
      <p className="tlite-muted">The preview is checked again on confirmation. If teams, settings or scores change, you will need a fresh preview.</p>
      {(preview.warnings ?? []).map((w, i) => <p className="tlite-warn" key={i}>{typeof w === "object" && w && "message" in w ? String(w.message) : String(w)}</p>)}
      <div className="tlite-preview"><table className="tlite-lb"><thead><tr><th>Match</th><th>Court</th><th>Start</th><th>End</th></tr></thead><tbody>{preview.matches?.map(m => <tr key={m.Match_ID}><td>{m.Entry1_Name} vs {m.Entry2_Name}</td><td>{m.Court || "Unscheduled"}</td><td>{m.Start_Time}</td><td>{m.End_Time}</td></tr>)}</tbody></table></div>
      <button className="tlite-btn tlite-btn-primary" disabled={busy || !generationSchedule || !!generationSchedule.conflicts.length || !!generationSchedule.invalidMatchIds.length || (!!generationSchedule.unscheduledMatchIds.length && !acceptUnscheduled) || protectedScores} onClick={() => void run("generate")}>Confirm and create matches</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
