"use client";

import { DateRange } from "@/lib/fb-ads/types";
import { addDaysLocal, formatDateLocal, parseDateLocal } from "@/lib/fb-ads/date-utils";

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  minDate?: string | null;
  maxDate?: string | null;
}

function getPresetRange(days: number, referenceEnd: string): DateRange {
  const endDate = parseDateLocal(referenceEnd);
  const end = formatDateLocal(endDate);

  if (days > 0) {
    return { start: formatDateLocal(addDaysLocal(endDate, -days + 1)), end };
  }

  if (days === 0) {
    // This month
    const start = new Date(endDate.getFullYear(), endDate.getMonth(), 1, 12);
    return { start: formatDateLocal(start), end };
  }

  // Last month
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1, 12);
  const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 12);
  return {
    start: formatDateLocal(lastMonth),
    end: formatDateLocal(lastMonthEnd),
  };
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "This month", days: 0 },
  { label: "Last month", days: -1 },
];

export default function DateRangePicker({ dateRange, onDateRangeChange, minDate, maxDate }: Props) {
  const presetEnd = maxDate || dateRange.end || formatDateLocal(new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="date-range-row">
        <input
          type="date"
          className="date-input"
          value={dateRange.start}
          min={minDate || undefined}
          max={dateRange.end || maxDate || undefined}
          onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })}
        />
        <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>to</span>
        <input
          type="date"
          className="date-input"
          value={dateRange.end}
          min={dateRange.start || minDate || undefined}
          max={maxDate || undefined}
          onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value })}
        />
      </div>
      <div className="date-presets">
        {presets.map(p => (
          <button
            key={p.label}
            className="date-preset-btn"
            onClick={() => onDateRangeChange(getPresetRange(p.days, presetEnd))}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
