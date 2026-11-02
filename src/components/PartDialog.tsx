import { nanoid } from 'nanoid'
import { useMemo, useState } from 'react'
import { computeProject } from '../domain/compute'
import type { Attachment, Part, Project } from '../domain/types'
import Sheet from './Sheet'
import Stepper from './Stepper'

interface Props {
  project: Project
  part: Part
  onSave: (patch: {
    name: string
    quantity: number
    note: string
    attachments: Attachment[]
  }) => void
  onDelete: () => void
  onClose: () => void
}

const input = 'min-h-11 w-full rounded-lg border border-slate-300 px-2 text-base'

export default function PartDialog({ project, part, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(part.name)
  const [quantity, setQuantity] = useState(part.quantity)
  const [note, setNote] = useState(part.note ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>(part.attachments)

  const bodyRows = useMemo(() => computeProject(project.rows).rows, [project.rows])
  const rowOf = (id: string) => bodyRows.find((r) => r.rowId === id)

  const patchAttachment = (id: string, p: Partial<Attachment>) =>
    setAttachments((list) => list.map((a) => (a.id === id ? { ...a, ...p } : a)))
  const removeAttachment = (id: string) =>
    setAttachments((list) => list.filter((a) => a.id !== id))
  const addAttachment = () => {
    const last = bodyRows[bodyRows.length - 1]
    if (!last) return
    setAttachments((list) => [...list, { id: nanoid(), rowId: last.rowId, position: 1 }])
  }

  return (
    <Sheet
      title={`パーツの設定（${part.name}）`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-slate-100 px-3 text-sm text-red-600"
            onClick={onDelete}
          >
            削除
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-lg bg-slate-100 text-sm"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-lg bg-pink-500 text-sm text-white"
            onClick={() =>
              onSave({
                name: name.trim() || '無題のパーツ',
                quantity,
                note: note.trim(),
                attachments,
              })
            }
          >
            保存
          </button>
        </div>
      }
    >
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-500">パーツの名前（耳・ツバ・リボンなど）</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="flex items-center gap-2 text-sm">
        <span className="w-28 shrink-0">作る個数</span>
        <Stepper label="作る個数" value={quantity} min={1} max={99} onChange={setQuantity} />
        <span>個</span>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">
          本体への接続位置（本体のチャートに、番号つきの印が出ます）
        </div>
        {attachments.map((a) => {
          const row = rowOf(a.rowId)
          const over = row ? a.position > row.stitchesOut : false
          return (
            <div key={a.id} className="space-y-2 rounded-lg border border-slate-200 p-2">
              <div className="flex items-center gap-2">
                <select
                  aria-label="接続先の段"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base"
                  value={a.rowId}
                  onChange={(e) => patchAttachment(a.id, { rowId: e.target.value })}
                >
                  {!row && <option value={a.rowId}>（段が見つかりません）</option>}
                  {bodyRows.map((r) => (
                    <option key={r.rowId} value={r.rowId}>
                      {r.label}（{r.stitchesOut}目）
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="この接続位置を削除"
                  className="h-11 w-11 shrink-0 rounded-lg bg-slate-100"
                  onClick={() => removeAttachment(a.id)}
                >
                  🗑
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0">位置</span>
                <Stepper
                  label="その段の何目め"
                  value={a.position}
                  min={1}
                  max={99}
                  onChange={(position) => patchAttachment(a.id, { position })}
                />
                <span>目め</span>
              </div>
              {over && row && (
                <div className="text-xs text-red-600">
                  この段は{row.stitchesOut}目です。位置を直してください。
                </div>
              )}
            </div>
          )
        })}
        <button
          type="button"
          disabled={bodyRows.length === 0}
          className="min-h-11 w-full rounded-lg border border-dashed border-slate-300 text-sm disabled:opacity-40"
          onClick={addAttachment}
        >
          ＋ 接続位置を追加
        </button>
        {bodyRows.length === 0 && (
          <div className="text-xs text-slate-500">先に、本体の段を作ってください。</div>
        )}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-500">メモ（縫い付け方など）</span>
        <textarea
          className={`${input} min-h-20 py-2`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Sheet>
  )
}