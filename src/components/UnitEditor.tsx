import { KIND_LABEL } from '../domain/stitchTable';
import type { StitchKind, Unit } from '../domain/types';
import Stepper from './Stepper';

const KINDS: StitchKind[] = [
  'sc',
  'inc',
  'hdc',
  'hdc_inc',
  'dc',
  'dc_inc',
  'dec',
  'slst',
  'ch',
];

interface Props {
  unit: Unit;
  canRemove: boolean;
  onChange: (u: Unit) => void;
  onRemove: () => void;
}

export default function UnitEditor({
  unit,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="アクション"
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base"
        value={unit.kind}
        onChange={(e) =>
          onChange({ ...unit, kind: e.target.value as StitchKind })
        }
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_LABEL[k]}
          </option>
        ))}
      </select>
      <Stepper
        label="目数"
        value={unit.count}
        min={1}
        max={99}
        onChange={(count) => onChange({ ...unit, count })}
      />
      <button
        type="button"
        aria-label="このアクションを削除"
        disabled={!canRemove}
        className="h-11 w-11 shrink-0 rounded-lg bg-slate-100 disabled:opacity-30"
        onClick={onRemove}
      >
        🗑
      </button>
    </div>
  );
}
