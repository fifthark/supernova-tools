"use client";

import { useState } from "react";
import PlaceholderPanel from "./PlaceholderPanel";
import WorkspaceTabs, { type WorkspaceTab } from "./WorkspaceTabs";

const TAB_PLACEHOLDERS: Record<WorkspaceTab, { title: string; description: string }> = {
  setup: {
    title: "Setup",
    description: "Event name, dates, courts, and categories will live here.",
  },
  entries: {
    title: "Entries",
    description: "Paste or add entries, then auto-pool oversized categories.",
  },
  matches: {
    title: "Matches",
    description: "Round-robin fixtures, court/time scheduling, and score entry.",
  },
  leaderboard: {
    title: "Leaderboard",
    description: "Points-for / points-against and point-difference standings.",
  },
};

export default function EventWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("setup");
  const panel = TAB_PLACEHOLDERS[activeTab];

  return (
    <main className="tlite-shell">
      <header className="tlite-header">
        <h1 className="tlite-title">Tournament Lite</h1>
        <p className="tlite-subtitle">Lightweight ad-hoc round-robin events</p>
      </header>

      <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

      <section className="tlite-panel" role="tabpanel">
        <PlaceholderPanel title={panel.title} description={panel.description} />
      </section>
    </main>
  );
}
