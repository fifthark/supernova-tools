"use client";

import type { TournamentState } from "../lib/types";
import { isActiveStatus, entryLabel, members, num, groupBy, poolLetter } from "../lib/utils";

export default function EntriesTab({ state }: { state: TournamentState }) {
  const categories = [...(state.categories ?? [])].sort((a, b) => num(a.Display_Order) - num(b.Display_Order));
  const entries = state.entries ?? [];
  const catName = new Map(categories.map((c) => [String(c.Category_ID), c.Category_Name || String(c.Category_ID)]));
  const byCat = groupBy(entries, (e) => String(e.Category_ID));

  const order = categories.map((c) => String(c.Category_ID));
  for (const k of byCat.keys()) if (!order.includes(k)) order.push(k);

  if (entries.length === 0) {
    return <div className="tlite-empty">No entries yet. Add them in the Sheet.</div>;
  }

  return (
    <div className="tlite-stack">
      {order.map((catId) => {
        const list = [...(byCat.get(catId) ?? [])].sort((a, b) => num(a.Display_Order) - num(b.Display_Order));
        if (list.length === 0) return null;
        const activeCount = list.filter((e) => isActiveStatus(e.Status)).length;
        return (
          <section key={catId} className="tlite-section">
            <div className="tlite-section-label">
              {catName.get(catId) ?? catId} <span className="tlite-count">{activeCount}</span>
            </div>
            <div className="tlite-cards">
              {list.map((e) => {
                const active = isActiveStatus(e.Status);
                const mem = members(e);
                return (
                  <div key={String(e.Entry_ID)} className={`tlite-card tlite-entry${active ? "" : " tlite-entry-out"}`}>
                    <div className="tlite-entry-row">
                      <span className="tlite-entry-name">{entryLabel(e)}</span>
                      {e.Pool_ID ? (
                        <span className="tlite-badge tlite-badge-muted">Pool {poolLetter(String(e.Pool_ID))}</span>
                      ) : null}
                      {!active && <span className="tlite-badge tlite-badge-overflow">Withdrawn</span>}
                    </div>
                    {mem && <div className="tlite-entry-members">{mem}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
