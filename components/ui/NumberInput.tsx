"use client";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  annotation?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  annotation,
}: NumberInputProps) {
  return (
    <div className="input-row">
      <div>
        <span className="label">{label}</span>
        {annotation && <div className="annotation">{annotation}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number"
          className="number-input"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
              const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
              onChange(clamped);
            }
          }}
          min={min}
          max={max}
          step={step}
        />
        {suffix && <span className="annotation">{suffix}</span>}
      </div>
    </div>
  );
}
