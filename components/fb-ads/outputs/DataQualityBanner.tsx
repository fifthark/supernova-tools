"use client";

import { useState } from "react";
import { DataQualityWarning } from "@/lib/fb-ads/types";

interface Props {
  warnings: DataQualityWarning[];
}

export default function DataQualityBanner({ warnings }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (warnings.length === 0) return null;

  const visible = warnings.filter(w => !dismissed.has(w.type));
  if (visible.length === 0) return null;

  // Group by severity
  const errors = visible.filter(w => w.severity === "error");
  const warns = visible.filter(w => w.severity === "warning");
  const infos = visible.filter(w => w.severity === "info");

  const dismiss = (type: string) => {
    setDismissed(prev => new Set([...prev, type]));
  };

  const dismissAll = () => {
    setDismissed(new Set(warnings.map(w => w.type)));
  };

  const renderGroup = (items: DataQualityWarning[], severity: string) => {
    if (items.length === 0) return null;
    const icon = severity === "error" ? "🔴" : severity === "warning" ? "🟡" : "🔵";
    return (
      <div className={`data-quality-banner severity-${severity}`} key={severity}>
        {items.map(w => (
          <div className="data-quality-item" key={w.type}>
            <span className="data-quality-icon">{icon}</span>
            <span>{w.message}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {renderGroup(errors, "error")}
      {renderGroup(warns, "warning")}
      {renderGroup(infos, "info")}
      <button className="data-quality-dismiss" onClick={dismissAll}>
        Dismiss all warnings
      </button>
    </div>
  );
}
