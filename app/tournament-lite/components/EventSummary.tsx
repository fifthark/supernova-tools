"use client";

import type { TournamentState } from "../lib/types";
import { settingValue, isActiveStatus, isTrueish, formatTimestamp } from "../lib/utils";

export default function EventSummary({ state }: { state: TournamentState }) {
  const categories = state.categories ?? [];
  const entries = (state.entries ?? []).filter((e) => isActiveStatus(e.Status));
  const matches = state.matches ?? [];
  const completed = matches.filter((m) => String(m.Status) === "Completed").length;
  const overflow = matches.filter(
    (m) => !isTrueish(m.Is_Bye) && String(m.Status) !== "Bye" && String(m.Court ?? "").trim() === "",
  ).length;

  const name = settingValue(state, "Event_Name") || "Untitled event";
  const meta = [
    settingValue(state, "Event_Date"),
    settingValue(state, "Venue"),
    settingValue(state, "Cost_Note"),
    settingValue(state, "PayID"),
  ].filter(Boolean);

  const fixturesReady = isTrueish(settingValue(state, "Fixtures_Generated"));
  const generatedAt = settingValue(state, "Generated_At");
  const eventStatus = settingValue(state, "Status");

  const stats = [
    { label: "Categories", value: categories.length },
    { label: "Entries", value: entries.length },
    { label: "Matches", value: matches.length },
    { label: "Completed", value: completed },
    { label: "Overflow", value: overflow, warn: overflow > 0 },
  ];

  return (
    <section className="tlite-event">
      <div className="tlite-event-head">
        <div className="tlite-event-id">
          <h2 className="tlite-event-name">{name}</h2>
          {meta.length > 0 && (
            <p className="tlite-event-meta">
              {meta.map((m, i) => (
                <span key={i}>
                  {i > 0 && <span className="tlite-dot">·</span>}
                  {m}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="tlite-event-flags">
          {eventStatus && <span className="tlite-badge tlite-badge-muted">{eventStatus}</span>}
          <span className={`tlite-badge ${fixturesReady ? "tlite-badge-completed" : "tlite-badge-scheduled"}`}>
            {fixturesReady ? "Fixtures ready" : "Not generated"}
          </span>
        </div>
      </div>

      {fixturesReady && generatedAt && (
        <p className="tlite-event-sub">Last generated {formatTimestamp(generatedAt)}</p>
      )}

      <div className="tlite-stats">
        {stats.map((s) => (
          <div key={s.label} className={`tlite-stat${s.warn ? " tlite-stat-warn" : ""}`}>
            <span className="tlite-stat-value">{s.value}</span>
            <span className="tlite-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
