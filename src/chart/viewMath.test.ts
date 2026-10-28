import { describe, expect, test } from 'vitest';
import {
  INITIAL_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  detailLevel,
  effectiveScale,
  pinchView,
  zoomAt,
} from './viewMath';

describe('clampScale', () => {
  test('0.5〜8 に収める', () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(100)).toBe(MAX_SCALE);
    expect(clampScale(2)).toBe(2);
  });
});

describe('zoomAt', () => {
  test('指定した点の下のコンテンツが動かない', () => {
    const v = { scale: 1, tx: 10, ty: -5 };
    const p = { x: 40, y: 30 };
    const next = zoomAt(v, p, 2);
    expect(next.scale).toBe(2);
    expect((p.x - next.tx) / next.scale).toBeCloseTo((p.x - v.tx) / v.scale, 6);
    expect((p.y - next.ty) / next.scale).toBeCloseTo((p.y - v.ty) / v.scale, 6);
  });
  test('上限・下限で止まる', () => {
    expect(zoomAt(INITIAL_VIEW, { x: 0, y: 0 }, 99).scale).toBe(MAX_SCALE);
    expect(zoomAt(INITIAL_VIEW, { x: 0, y: 0 }, 0.01).scale).toBe(MIN_SCALE);
  });
});

describe('pinchView', () => {
  test('距離が1.5倍で倍率も1.5倍、中点の下のコンテンツが追従する', () => {
    const v = { scale: 2, tx: 20, ty: -10 };
    const next = pinchView(v, { x: 50, y: 40 }, 100, { x: 60, y: 30 }, 150);
    expect(next.scale).toBeCloseTo(3, 6);
    expect(next.tx).toBeCloseTo(15, 6);
    expect(next.ty).toBeCloseTo(-45, 6);
  });
  test('距離が同じなら移動だけ', () => {
    const v = { scale: 1.5, tx: 0, ty: 0 };
    const next = pinchView(v, { x: 10, y: 10 }, 80, { x: 20, y: 15 }, 80);
    expect(next.scale).toBeCloseTo(1.5, 6);
    expect(next.tx).toBeCloseTo(10, 6);
    expect(next.ty).toBeCloseTo(5, 6);
  });
  test('上限を超えない', () => {
    const next = pinchView(
      { scale: MAX_SCALE, tx: 0, ty: 0 },
      { x: 0, y: 0 },
      100,
      { x: 0, y: 0 },
      300
    );
    expect(next.scale).toBe(MAX_SCALE);
  });
});

describe('詳細度', () => {
  test('effectiveScale は短辺÷(2×bounds)×倍率', () => {
    expect(effectiveScale(1, 300, 400, 150)).toBeCloseTo(1, 6);
    expect(effectiveScale(2, 300, 400, 150)).toBeCloseTo(2, 6);
    expect(effectiveScale(1.5, 0, 0, 150)).toBe(1.5); // サイズ未取得
  });
  test('しきい値で切り替わる', () => {
    expect(detailLevel(1)).toEqual({ showSymbols: true, showLabels: true });
    expect(detailLevel(0.7)).toEqual({ showSymbols: false, showLabels: true });
    expect(detailLevel(0.3)).toEqual({ showSymbols: false, showLabels: false });
  });
});
