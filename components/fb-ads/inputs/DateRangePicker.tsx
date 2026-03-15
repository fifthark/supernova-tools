"use client";

import { DateRange } from "@/lib/fb-ads/types";

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

function getPresetRange(days: number): DateRange {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);

  if (days > 0) {
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start: start.toISOString().slice(0, 10), end };
  }

  if (days === 0) {
    // This month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: start.toISOString().slice(0, 10), end };
  }

  // Last month
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: lastMonth.toISOString().slice(0, 10),
    end: lastMonthEnd.toISOString().slice(0, 10),
  };
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "This month", days: 0 },
  { label: "Last month", days: -1 },
];

export default function DateRangePicker({ dateRange, onDateRangeChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="date-range-row">
        <input
          type="date"
          className="date-input"
          value={dateRange.start}
          onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })}
        />
        <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>to</span>
        <input
          type="date"
          className="date-input"
          value={dateRange.end}
          onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value })}
        />
      </div>
      <div className="date-presets">
        {presets.map(p => (
          <button
            key={p.label}
            className="date-preset-btn"
            onClick={() => onDateRangeChange(getPresetRange(p.days))}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
