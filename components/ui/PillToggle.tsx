"use client";

interface PillToggleProps<T extends string> {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: PillToggleProps<T>) {
  return (
    <div className="pill-toggle">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`pill-option ${value === opt ? "active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
