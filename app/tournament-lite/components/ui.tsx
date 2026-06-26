"use client";

// Small shared presentational primitives for Tournament Lite.

export function Message({
  type,
  text,
  compact,
}: {
  type: "success" | "error" | "info";
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`tlite-msg tlite-msg-${type}${compact ? " tlite-msg-compact" : ""}`}
      role={type === "error" ? "alert" : "status"}
    >
      {text}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="tlite-state">
      <div className="tlite-spinner" aria-hidden="true" />
      <p className="tlite-state-text">Loading your event…</p>
    </div>
  );
}

export function CategoryNav({
  categories,
  selected,
  onSelect,
}: {
  categories: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <div className="tlite-catnav" role="tablist" aria-label="Category">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={selected === c.id}
          className={`tlite-catnav-tab${selected === c.id ? " tlite-catnav-tab-active" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function CategoryStats({
  items,
  timeWindow,
}: {
  items: { label: string; value: string | number; warn?: boolean }[];
  timeWindow?: string;
}) {
  return (
    <div className="tlite-catsummary">
      {timeWindow ? <div className="tlite-catwindow">{timeWindow}</div> : null}
      <div className="tlite-catstats">
        {items.map((s) => (
          <div key={s.label} className={`tlite-catstat${s.warn ? " tlite-catstat-warn" : ""}`}>
            <span className="tlite-catstat-value">{s.value}</span>
            <span className="tlite-catstat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="tlite-state">
      <p className="tlite-state-title">We couldn’t load the event</p>
      <p className="tlite-state-text">{message}</p>
      <button className="tlite-btn tlite-btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
