import { useEffect } from 'react';
import type { RowComputed } from '../domain/types';
import RowCard from './RowCard';

interface Props {
  rows: RowComputed[];
  selectedRowId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export default function RowCardList({
  rows,
  selectedRowId,
  onSelect,
  onEdit,
  onRemove,
  onAdd,
}: Props) {
  // チャートでリングをタップしたとき、対応するカードを表示位置まで運ぶ
  useEffect(() => {
    if (!selectedRowId) return;
    document
      .getElementById(`row-card-${selectedRowId}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedRowId]);

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">
          まだ段がありません。下のボタンから追加してください。
        </p>
      )}
      {rows.map((r) => (
        <RowCard
          key={r.rowId}
          row={r}
          selected={r.rowId === selectedRowId}
          onSelect={() => onSelect(r.rowId)}
          onEdit={() => onEdit(r.rowId)}
          onRemove={() => onRemove(r.rowId)}
        />
      ))}
      <button
        type="button"
        className="min-h-11 w-full rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-600"
        onClick={onAdd}
      >
        ＋ 段を追加
      </button>
    </div>
  );
}
