"use client";

export type WorkspaceTab = "setup" | "entries" | "matches" | "leaderboard";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "entries", label: "Entries" },
  { id: "matches", label: "Matches" },
  { id: "leaderboard", label: "Leaderboard" },
];

export default function WorkspaceTabs({
  activeTab,
  onChange,
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="tlite-tabs" role="tablist" aria-label="Event workspace">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tlite-tab ${activeTab === tab.id ? "tlite-tab-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
