import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export type Snap = 'min' | 'half' | 'full'

export const SNAP_ORDER: Snap[] = ['min', 'half', 'full']
export const MIN_PX = 64 // 最小のときの高さ（つまみ＋タイトルの帯）
export const HALF_RATIO = 0.52 // 半分のときの高さ（画面に対する割合）
const FLICK = 0.5 // これより速い動きは「はじき」（px/ms）
const TAP_SLOP = 6 // これ未満の動きは、タップ扱い（px）

/** 各状態の高さ(px)。vh は画面の高さ */
export function snapHeights(vh: number): Record<Snap, number> {
  return { min: MIN_PX, half: HALF_RATIO * vh, full: vh }
}

/**
 * 指を離したときに、どの状態に止めるか。
 * h: そのときの高さ, vy: 速度（px/ms。上向きが負）, from: 動かし始めの状態
 */
export function pickSnap(h: number, vy: number, from: Snap, vh: number): Snap {
  if (Math.abs(vy) > FLICK) {
    // はじいたときは、1段階だけ動かす
    const i = SNAP_ORDER.indexOf(from) + (vy < 0 ? 1 : -1)
    return SNAP_ORDER[Math.max(0, Math.min(SNAP_ORDER.length - 1, i))]
  }
  // ゆっくりのときは、いちばん近い状態
  const hs = snapHeights(vh)
  return SNAP_ORDER.reduce<Snap>(
    (best, s) => (Math.abs(h - hs[s]) < Math.abs(h - hs[best]) ? s : best),
    'min',
  )
}

/** タップしたときの切り替え: 半分→全面、全面・最小→半分 */
export function tapSnap(s: Snap): Snap {
  return s === 'half' ? 'full' : 'half'
}

// 次に編集を開いたときも、半分か全面の好みを引き継ぐ（最小は引き継がない）
let remembered: Snap = 'half'

interface DragState {
  y: number
  h: number
  from: Snap
  moved: boolean
  ly: number
  lt: number
  vy: number
}

export function useSheetSnap() {
  const [snap, setSnapState] = useState<Snap>(remembered)
  const [dragH, setDragH] = useState<number | null>(null) // ドラッグ中の高さ(px)
  const ref = useRef<HTMLDivElement>(null)
  const st = useRef<DragState | null>(null)

  const setSnap = useCallback((s: Snap) => {
    if (s !== 'min') remembered = s
    setSnapState(s)
  }, [])

  const onPointerDown = (e: ReactPointerEvent) => {
    const el = ref.current
    if (!el) return
    e.currentTarget.setPointerCapture(e.pointerId)
    st.current = {
      y: e.clientY,
      h: el.getBoundingClientRect().height,
      from: snap,
      moved: false,
      ly: e.clientY,
      lt: performance.now(),
      vy: 0,
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const s = st.current
    if (!s) return
    const dy = e.clientY - s.y
    if (!s.moved && Math.abs(dy) < TAP_SLOP) return
    s.moved = true
    const now = performance.now()
    s.vy = (e.clientY - s.ly) / Math.max(1, now - s.lt)
    s.ly = e.clientY
    s.lt = now
    setDragH(Math.max(MIN_PX, Math.min(window.innerHeight, s.h - dy)))
  }

  const finish = (e: ReactPointerEvent, cancel: boolean) => {
    const s = st.current
    st.current = null
    if (!s) return
    if (!s.moved) {
      setDragH(null)
      if (!cancel) setSnap(tapSnap(s.from))
      return
    }
    const vh = window.innerHeight
    const h = Math.max(MIN_PX, Math.min(vh, s.h - (e.clientY - s.y)))
    setSnap(cancel ? s.from : pickSnap(h, s.vy, s.from, vh))
    setDragH(null)
  }

  const height =
    dragH !== null
      ? `${dragH}px`
      : snap === 'min'
        ? `calc(${MIN_PX}px + env(safe-area-inset-bottom))`
        : snap === 'half'
          ? `${HALF_RATIO * 100}dvh`
          : 'calc(100dvh - env(safe-area-inset-top))'

  return {
    ref,
    snap,
    setSnap,
    dragging: dragH !== null,
    height,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent) => finish(e, false),
      onPointerCancel: (e: ReactPointerEvent) => finish(e, true),
    },
  }
}