"use client";

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <div className="input-row">
      <span className="label">{label}</span>
      <button
        type="button"
        className={`toggle-switch ${value ? "active" : ""}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      />
    </div>
  );
}
