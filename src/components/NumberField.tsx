import { useState } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}

export default function NumberField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: Props) {
  const [text, setText] = useState<string | null>(null);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0">{label}</span>
      <input
        inputMode="decimal"
        className="min-h-11 w-24 rounded-lg border border-slate-300 px-2 text-base"
        value={text ?? String(value)}
        onFocus={(e) => {
          setText(String(value));
          e.target.select();
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.]/g, '');
          setText(t);
          const n = parseFloat(t);
          if (Number.isFinite(n)) {
            onChange(Math.max(min, Math.min(max, Math.round(n * 10) / 10)));
          }
        }}
        onBlur={() => setText(null)}
      />
      {unit && <span>{unit}</span>}
    </label>
  );
}
