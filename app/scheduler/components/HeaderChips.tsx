"use client";

import type { Block } from "../types";
import {
  earliestStartMinutes,
  formatTime,
  latestEndMinutes,
  totalMatches,
} from "../lib/calculations";

interface Props {
  blocks: Block[];
  clashCount: number;
}

export default function HeaderChips({ blocks, clashCount }: Props) {
  const matches = totalMatches(blocks);
  const earliest = earliestStartMinutes(blocks);
  const latest = latestEndMinutes(blocks);

  return (
    <div className="scheduler-chips">
      <div className="scheduler-chip">
        <span className="scheduler-chip-label">Total matches</span>
        <span className="scheduler-chip-value">{matches}</span>
      </div>
      <div className="scheduler-chip">
        <span className="scheduler-chip-label">Earliest start</span>
        <span className="scheduler-chip-value">
          {earliest != null ? formatTime(earliest) : "—"}
        </span>
      </div>
      <div className="scheduler-chip">
        <span className="scheduler-chip-label">Latest finish</span>
        <span className="scheduler-chip-value">
          {latest != null ? formatTime(latest) : "—"}
        </span>
      </div>
      <div
        className={`scheduler-chip ${clashCount > 0 ? "scheduler-chip-danger" : ""}`}
      >
        <span className="scheduler-chip-label">Clashes</span>
        <span className="scheduler-chip-value">{clashCount}</span>
      </div>
    </div>
  );
}
