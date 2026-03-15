"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="input-group">
      <div className="collapsible-header" onClick={() => setOpen(!open)}>
        <span className="section-header" style={{ marginBottom: 0 }}>
          {title}
        </span>
        <span className={`chevron ${open ? "open" : ""}`}>▾</span>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
