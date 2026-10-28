import type { RowComputed } from '../domain/types';

interface Props {
  row: RowComputed;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

const deltaText = (d: number) =>
  d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '±0';

const deltaClass = (d: number) =>
  d > 0
    ? 'bg-pink-100 text-pink-700'
    : d < 0
    ? 'bg-sky-100 text-sky-700'
    : 'bg-slate-100 text-slate-600';

export default function RowCard({
  row,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: Props) {
  return (
    <div
      id={`row-card-${row.rowId}`}
      onClick={onSelect}
      className={`rounded-lg border bg-white p-3 text-sm ${
        selected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{row.text}</div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-white">
            {row.stitchesOut}目
          </span>
          <span className={`rounded-full px-2 py-0.5 ${deltaClass(row.delta)}`}>
            {deltaText(row.delta)}
          </span>
        </div>
      </div>

      {row.errors.map((e) => (
        <div key={e} className="mt-1 text-xs text-red-600">
          ⚠ {e}
        </div>
      ))}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-lg bg-slate-100"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          編集
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-lg bg-slate-100 text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          削除
        </button>
      </div>
    </div>
  );
}
