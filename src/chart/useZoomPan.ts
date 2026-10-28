import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  INITIAL_VIEW,
  pinchView,
  zoomAt,
  type Pt,
  type ViewState,
} from './viewMath';

const MOVE_THRESHOLD = 8; // これ未満の移動はタップ扱い(px)
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 30;

export function useZoomPan() {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, Pt>());
  const dragged = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const g = useRef({
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    prevMid: { x: 0, y: 0 },
    prevDist: 1,
  });

  const apply = useCallback((next: ViewState) => {
    viewRef.current = next;
    setView(next);
  }, []);
  const reset = useCallback(() => apply(INITIAL_VIEW), [apply]);
  /** 直前の操作がドラッグ／ピンチだったか（リングのタップ判定の抑止用） */
  const wasDrag = useCallback(() => dragged.current, []);

  /** 画面座標 → コンテナ中心基準の座標 */
  const toLocal = useCallback((clientX: number, clientY: number): Pt => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: clientX - r.left - r.width / 2,
      y: clientY - r.top - r.height / 2,
    };
  }, []);

  // コンテナのサイズ監視（詳細度の計算に使う）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ホイール／トラックパッド: カーソル中心でズーム
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      apply(
        zoomAt(
          v,
          toLocal(e.clientX, e.clientY),
          v.scale * Math.exp(-e.deltaY * 0.0015)
        )
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [apply, toLocal]);

  const twoPoints = () => {
    const [a, b] = [...pointers.current.values()];
    return {
      mid: toLocal((a.x + b.x) / 2, (a.y + b.y) / 2),
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = g.current;
    if (pointers.current.size === 1) {
      s.moved = false;
      dragged.current = false;
      s.startX = s.lastX = e.clientX;
      s.startY = s.lastY = e.clientY;
    } else if (pointers.current.size === 2) {
      s.moved = true;
      dragged.current = true;
      const t = twoPoints();
      s.prevMid = t.mid;
      s.prevDist = t.dist;
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = g.current;

    if (pointers.current.size === 1) {
      if (!s.moved) {
        const d = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);
        if (d < MOVE_THRESHOLD) return;
        s.moved = true;
        dragged.current = true;
        if (e.pointerType === 'mouse')
          e.currentTarget.setPointerCapture(e.pointerId);
      }
      const v = viewRef.current;
      apply({
        ...v,
        tx: v.tx + e.clientX - s.lastX,
        ty: v.ty + e.clientY - s.lastY,
      });
      s.lastX = e.clientX;
      s.lastY = e.clientY;
    } else if (pointers.current.size === 2) {
      const t = twoPoints();
      apply(pinchView(viewRef.current, s.prevMid, s.prevDist, t.mid, t.dist));
      s.prevMid = t.mid;
      s.prevDist = t.dist;
    }
  };

  const endPointer = (e: ReactPointerEvent, isCancel: boolean) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const s = g.current;

    if (pointers.current.size === 0) {
      if (!isCancel && !s.moved) {
        // ダブルタップでリセット
        const now = Date.now();
        const prev = lastTap.current;
        if (
          prev &&
          now - prev.t < DOUBLE_TAP_MS &&
          Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_DIST
        ) {
          reset();
          lastTap.current = null;
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    } else if (pointers.current.size === 1) {
      // 2本→1本になったとき、残った指の位置から続けてパンできるようにする
      const [p] = [...pointers.current.values()];
      s.lastX = p.x;
      s.lastY = p.y;
    }
  };

  return {
    ref,
    view,
    size,
    reset,
    wasDrag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent) => endPointer(e, false),
      onPointerCancel: (e: ReactPointerEvent) => endPointer(e, true),
    },
  };
}
