import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}

export default function Stepper({ value, min, max, onChange, label }: Props) {
  const [text, setText] = useState<string | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const stop = () => window.clearTimeout(timer.current);
  const step = (d: number, delay: number) => {
    const next = clamp(valueRef.current + d);
    if (next === valueRef.current) return;
    valueRef.current = next;
    onChangeRef.current(next);
    timer.current = window.setTimeout(() => step(d, 80), delay);
  };
  const start = (d: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    stop();
    step(d, 400);
  };

  const btn =
    'h-11 w-11 shrink-0 rounded-lg bg-slate-100 text-lg active:bg-slate-200 select-none';
  const common = {
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
    style: { touchAction: 'manipulation' as const },
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`${label}を減らす`}
        className={btn}
        onPointerDown={start(-1)}
        {...common}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        className="h-11 w-12 rounded-lg border border-slate-300 text-center text-base"
        value={text ?? String(value)}
        onFocus={(e) => {
          setText(String(value));
          e.target.select();
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
          setText(t);
          if (t !== '') onChange(clamp(Number(t)));
        }}
        onBlur={() => setText(null)}
      />
      <button
        type="button"
        aria-label={`${label}を増やす`}
        className={btn}
        onPointerDown={start(1)}
        {...common}
      >
        ＋
      </button>
    </div>
  );
}
