import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { computeRow, computeUnit } from '../domain/compute'
import type { EditContext } from '../domain/draft'
import { FOUNDATION_LIMITS } from '../domain/foundation'
import { standardTurning, type PresetResult } from '../domain/presets'
import { KIND_LABEL, isTurningCounted } from '../domain/stitchTable'
import { suggestedRepeat } from '../domain/turning'
import type {
  Foundation,
  Row,
  RowKind,
  Section,
  StitchKind,
  Turning,
  Unit,
} from '../domain/types'
import PresetChips from './PresetChips'
import Stepper from './Stepper'
import TurningEditor from './TurningEditor'
import UnitEditor from './UnitEditor'

const SECTION_LABEL: Record<Section, string> = {
  crown: '頭頂',
  body: '本体',
  brim: '縁',
  free: 'その他',
}

const FOUNDATION_KINDS: StitchKind[] = ['sc', 'hdc', 'dc']
const DEFAULT_FOUNDATION: Foundation = { chains: 10, endStitches: 3 }

interface Props {
  title: string
  initial: Row
  context: EditContext
  crownIncrement: number
  onSave: (row: Row) => void
  onCancel: () => void
  onDraftChange?: (row: Row) => void
}

export default function RowEditorSheet({
  title,
  initial,
  context,
  crownIncrement,
  onSave,
  onCancel,
  onDraftChange,
}: Props) {
  const [draft, setDraft] = useState<Row>(initial)
  const [ignore, setIgnore] = useState(false)
  useEffect(() => {
    onDraftChange?.(draft)
  }, [draft, onDraftChange])

  const c = computeRow(draft, context.prevOut, context.startNo, context.isFirst)
  const isFoundation = draft.kind === 'chain_foundation'
  const F = FOUNDATION_LIMITS

  const patch = (p: Partial<Row>) => setDraft((d) => ({ ...d, ...p }))
  const patchFoundation = (p: Partial<Foundation>) =>
    setDraft((d) => ({
      ...d,
      foundation: { ...(d.foundation ?? DEFAULT_FOUNDATION), ...p },
    }))
  const setUnit = (i: number, u: Unit) =>
    setDraft((d) => ({
      ...d,
      units: d.units.map((x, j) => (j === i ? u : x)),
    }))
  const removeUnit = (i: number) =>
    setDraft((d) => ({ ...d, units: d.units.filter((_, j) => j !== i) }))
  const addUnit = () =>
    setDraft((d) => ({
      ...d,
      units: [...d.units, { id: nanoid(), kind: 'sc', count: 1 }],
    }))
  const applyPreset = (p: PresetResult) =>
    patch({ kind: 'round', units: p.units, repeat: p.repeat })

  /** 段の種類を切り替える（鎖の作り目は、周回の設定を専用の形にそろえる） */
  const switchKind = (kind: RowKind) => {
    if (kind === draft.kind) return
    if (kind === 'chain_foundation') {
      const first = draft.units[0]?.kind
      const k = first && FOUNDATION_KINDS.includes(first) ? first : 'sc'
      patch({
        kind,
        foundation: draft.foundation ?? DEFAULT_FOUNDATION,
        units: [{ id: nanoid(), kind: k, count: 1 }],
        repeat: 1,
        rowSpan: 1,
      })
    } else if (kind === 'magic_ring') {
      patch({ kind, foundation: undefined })
    } else {
      patch({ kind, foundation: undefined })
    }
  }

  // 立ち上がり: 数えても、アクションや目数は変わらない（最初の1目が立ち上がりに置き換わるだけ）
  const turning = draft.turning
  const counted = turning !== undefined && isTurningCounted(turning)
  const setTurning = (t: Turning | undefined) => patch({ turning: t })

  const turningHint = isFoundation
    ? counted
      ? '1目に数える場合、1周目の編み始め（作り目の右端）の1目が、この立ち上がりになります（1周目の目数は変わりません）。'
      : '数えない場合は、鎖が増えるだけで、1周目の目数は変わりません。'
    : counted
      ? '1目に数える場合、段の最初の1目が立ち上がりに置き換わります（目数は変わりません）。'
      : '数えない場合、鎖は目数に入りません（目数は変わりません）。'

  const turningEditor = (
    <TurningEditor
      turning={turning}
      counted={counted}
      standard={standardTurning(draft)}
      hint={turningHint}
      onChange={setTurning}
    />
  )

  // 「自動」: 前段の目数 ÷ 1サイクルの消費目数
  const cycleIn = draft.units.reduce((a, u) => a + computeUnit(u).in, 0)
  const canAuto = draft.kind === 'round' && cycleIn > 0 && context.prevOut > 0
  const suggested = suggestedRepeat(draft, context.prevOut)

  const tab = (active: boolean) =>
    `min-h-11 flex-1 rounded-lg text-sm ${
      active ? 'bg-pink-500 text-white' : 'bg-slate-100'
    }`

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
      <div
        role="dialog"
        aria-label={title}
        className="pointer-events-auto flex max-h-[52dvh] flex-col rounded-t-2xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.18)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="閉じる"
            className="h-11 w-11 text-xl"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div className="text-sm text-slate-600">前段: {context.prevOut}目</div>

          <div className="flex gap-2">
            <button
              type="button"
              className={tab(draft.kind === 'round')}
              onClick={() => switchKind('round')}
            >
              通常の段
            </button>
            <button
              type="button"
              className={tab(draft.kind === 'magic_ring')}
              onClick={() => switchKind('magic_ring')}
            >
              輪の作り目
            </button>
            {(context.isFirst || isFoundation) && (
              <button
                type="button"
                className={tab(isFoundation)}
                onClick={() => switchKind('chain_foundation')}
              >
                鎖の作り目
              </button>
            )}
          </div>

          {isFoundation && (
            <>
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">
                  楕円スタート（鎖を作ってから、まわりを一周する）
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-sm">作り目の鎖</span>
                  <Stepper
                    label="作り目の鎖"
                    value={draft.foundation?.chains ?? DEFAULT_FOUNDATION.chains}
                    min={F.chainsMin}
                    max={F.chainsMax}
                    onChange={(chains) => patchFoundation({ chains })}
                  />
                  <span className="text-sm">目</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-sm">端に編み入れる</span>
                  <Stepper
                    label="端に編み入れる目数"
                    value={draft.foundation?.endStitches ?? DEFAULT_FOUNDATION.endStitches}
                    min={F.endMin}
                    max={F.endMax}
                    onChange={(endStitches) => patchFoundation({ endStitches })}
                  />
                  <span className="text-sm">目ずつ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-sm">編み目</span>
                  <select
                    aria-label="編み目の種類"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base"
                    value={draft.units[0]?.kind ?? 'sc'}
                    onChange={(e) =>
                      patch({
                        units: [
                          {
                            ...(draft.units[0] ?? { id: nanoid(), count: 1 }),
                            kind: e.target.value as StitchKind,
                          },
                        ],
                      })
                    }
                  >
                    {FOUNDATION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-slate-500">
                  1周目は {c.stitchesOut}目（2×(鎖−2)＋2×端）。鎖の片側に
                  {(draft.foundation?.chains ?? 0) - 2}目、両端に
                  {draft.foundation?.endStitches ?? 0}目ずつ編み入れます。
                </div>
              </div>
              {turningEditor}
            </>
          )}

          {!isFoundation && (
            <>
              <div>
                <div className="mb-1 text-xs text-slate-500">プリセット</div>
                <PresetChips
                  prevOut={context.prevOut}
                  prevRow={context.prevRow}
                  crownIncrement={crownIncrement}
                  onApply={applyPreset}
                />
              </div>

              {(draft.kind === 'round' || draft.kind === 'magic_ring') && turningEditor}

              <div className="space-y-2">
                <div className="text-xs text-slate-500">1サイクルの内容</div>
                {draft.units.map((u, i) => (
                  <UnitEditor
                    key={u.id}
                    unit={u}
                    canRemove={draft.units.length > 1}
                    onChange={(nu) => setUnit(i, nu)}
                    onRemove={() => removeUnit(i)}
                  />
                ))}
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg border border-dashed border-slate-300 text-sm"
                  onClick={addUnit}
                >
                  ＋ アクションを追加
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-28 text-sm">繰り返し回数</span>
                  <Stepper
                    label="繰り返し回数"
                    value={draft.repeat}
                    min={1}
                    max={99}
                    onChange={(repeat) => patch({ repeat })}
                  />
                  <button
                    type="button"
                    disabled={suggested === null}
                    className="min-h-11 rounded-lg bg-slate-100 px-3 text-sm disabled:opacity-35"
                    onClick={() => suggested !== null && patch({ repeat: suggested })}
                  >
                    自動
                  </button>
                </div>
                {canAuto && suggested === null && (
                  <div className="text-xs text-red-600">
                    前段の目数({context.prevOut})は1サイクルの消費目数({cycleIn}
                    )で割り切れません
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="w-28 text-sm">同じ段を続ける</span>
                <Stepper
                  label="続ける段数"
                  value={draft.rowSpan}
                  min={1}
                  max={99}
                  onChange={(rowSpan) => patch({ rowSpan })}
                />
                <span className="text-sm">段</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="w-28 text-sm">区分</span>
            <select
              aria-label="区分"
              className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base"
              value={draft.section}
              onChange={(e) => patch({ section: e.target.value as Section })}
            >
              {(Object.keys(SECTION_LABEL) as Section[]).map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="mb-1 text-xs text-slate-500">プレビュー</div>
            <div>{c.text}</div>
            {c.errors.map((e) => (
              <div key={e} className="mt-1 text-xs text-red-600">
                ⚠ {e}
              </div>
            ))}
            {c.valid && (
              <div className="mt-1 text-xs text-green-700">✔ 問題ありません</div>
            )}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 px-4 py-3">
          {!c.valid && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={ignore}
                onChange={(e) => setIgnore(e.target.checked)}
              />
              警告を無視して保存
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-lg bg-slate-100 text-sm"
              onClick={onCancel}
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={!c.valid && !ignore}
              className="min-h-11 flex-1 rounded-lg bg-pink-500 text-sm text-white disabled:opacity-40"
              onClick={() => onSave(draft)}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}