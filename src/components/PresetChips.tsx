import {
  allInc,
  allSc,
  copyRow,
  standardDec,
  standardInc,
  type PresetResult,
} from '../domain/presets';
import type { Row } from '../domain/types';

interface Props {
  prevOut: number;
  prevRow?: Row;
  crownIncrement: number;
  onApply: (p: PresetResult) => void;
}

export default function PresetChips({
  prevOut,
  prevRow,
  crownIncrement,
  onApply,
}: Props) {
  const chips: { label: string; make: () => PresetResult | null }[] = [
    { label: '全目増し目', make: () => allInc(prevOut) },
    { label: '標準の増し段', make: () => standardInc(prevOut, crownIncrement) },
    { label: '全目細編み', make: () => allSc(prevOut) },
    {
      label: '標準の減らし段',
      make: () => standardDec(prevOut, crownIncrement),
    },
    {
      label: '前段をコピー',
      make: () => {
        if (!prevRow) return null;
        const c = copyRow(prevRow);
        return { units: c.units, repeat: c.repeat };
      },
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const result = chip.make();
        return (
          <button
            key={chip.label}
            type="button"
            disabled={!result}
            onClick={() => result && onApply(result)}
            className="min-h-11 rounded-full border border-slate-300 bg-white px-3 text-sm disabled:opacity-35"
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
