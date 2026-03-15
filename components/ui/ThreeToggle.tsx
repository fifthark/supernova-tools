"use client";

interface ThreeToggleProps<T extends string> {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}

export function ThreeToggle<T extends string>({
  options,
  value,
  onChange,
}: ThreeToggleProps<T>) {
  return (
    <div className="three-toggle">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`three-toggle-option ${value === opt ? "active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
