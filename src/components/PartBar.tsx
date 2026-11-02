import { MAIN_PART } from '../domain/parts'
import type { Part } from '../domain/types'

interface Props {
  parts: Part[]
  activeId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: () => void // 選択中のパーツの設定（本体では出さない）
}

export default function PartBar({ parts, activeId, onSelect, onAdd, onEdit }: Props) {
  const tab = (active: boolean) =>
    `min-h-10 shrink-0 rounded-full px-3 text-sm ${
      active ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-700'
    }`
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <button
          type="button"
          className={tab(activeId === MAIN_PART)}
          onClick={() => onSelect(MAIN_PART)}
        >
          本体
        </button>
        {parts.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={tab(activeId === p.id)}
            onClick={() => onSelect(p.id)}
          >
            {i + 1} {p.name}
            {p.quantity > 1 ? ` ×${p.quantity}` : ''}
          </button>
        ))}
        <button
          type="button"
          className="min-h-10 shrink-0 rounded-full border border-dashed border-slate-300 px-3 text-sm text-slate-600"
          onClick={onAdd}
        >
          ＋ パーツ
        </button>
      </div>
      {activeId !== MAIN_PART && (
        <button
          type="button"
          className="min-h-10 shrink-0 px-2 text-xs text-slate-500 underline"
          onClick={onEdit}
        >
          設定
        </button>
      )}
    </div>
  )
}