import { describe, expect, test } from 'vitest';
import { createFoundationRow } from '../domain/presets';
import type { Row, StitchKind } from '../domain/types';
import { DEFAULT_GEOMETRY_OPTIONS, buildGeometry } from './geometry';

const { W, DR_MIN, MARGIN } = DEFAULT_GEOMETRY_OPTIONS;
const L = 10;
const E = 3;
const core = (L - 2) * W; // 中心の線分の長さ = 112

let seq = 0;
const unit = (kind: StitchKind, count = 1) => ({
  id: `u${seq++}`,
  kind,
  count,
});
const round = (units: Row['units'], repeat = 1): Row => ({
  id: `r${seq++}`,
  kind: 'round',
  section: 'crown',
  units,
  repeat,
  rowSpan: 1,
});
const oval = () =>
  buildGeometry([
    createFoundationRow(L, E),
    round([unit('inc', 3), unit('sc', 8)], 2),
  ]);
const distToCore = (x: number, y: number) =>
  Math.hypot(x - Math.max(-core / 2, Math.min(core / 2, x)), y);

describe('楕円（鎖の作り目スタート）', () => {
  test('リングは中心の線分の半分の長さを持ち、1周目の半径は 端×W÷π', () => {
    const g = oval();
    expect(g.rings.every((r) => r.halfLength === core / 2)).toBe(true);
    expect(g.rings[0].radius).toBeCloseTo((E * W) / Math.PI, 5);
  });

  test('1周目の目は、中心の線分から半径ぶん離れた位置に並ぶ', () => {
    const g = oval();
    const r0 = g.rings[0].radius;
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0);
    expect(ring0).toHaveLength(22);
    for (const n of ring0) expect(distToCore(n.x, n.y)).toBeCloseTo(r0, 5);
    // 左右に長く、上下に短い
    const maxX = Math.max(...ring0.map((n) => Math.abs(n.x)));
    const maxY = Math.max(...ring0.map((n) => Math.abs(n.y)));
    expect(maxX).toBeGreaterThan(core / 2);
    expect(maxY).toBeLessThanOrEqual(r0 + 1e-6);
  });

  test('鎖は中央に一直線（間隔W、左右対称）', () => {
    const g = oval();
    const pts = g.chain!.points;
    expect(pts).toHaveLength(L);
    expect(pts.every((p) => p[1] === 0)).toBe(true);
    expect(pts[0][0]).toBeCloseTo(-((L - 1) / 2) * W, 6);
    expect(pts[L - 1][0]).toBeCloseTo(((L - 1) / 2) * W, 6);
    for (let j = 1; j < L; j++)
      expect(pts[j][0] - pts[j - 1][0]).toBeCloseTo(W, 6);
  });

  test('1周目の目は、編み入れる鎖の目につながる（右端→上辺→左端→下辺→右端）', () => {
    const g = oval()
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    const links = g.chain!.links
    expect(links).toHaveLength(22)

    // 1目目: 作り目の右端の上（右端の円弧の上側）
    expect(ring0[0].x).toBeCloseTo(((L - 1) / 2) * W, 0)
    expect(ring0[0].y).toBeLessThan(0)
    expect(links[0].to[0]).toBeCloseTo(((L - 1) / 2) * W, 6)
    // 2目目: 上辺の最初（右から2つ目の鎖の真上）
    expect(ring0[1].x).toBeCloseTo(((L - 3) / 2) * W, 5)
    expect(ring0[1].y).toBeCloseTo(-g.rings[0].radius, 5)
    expect(links[1].to[0]).toBeCloseTo(((L - 3) / 2) * W, 6)
    // 左端（先端）
    expect(links[L - 1].to[0]).toBeCloseTo(-((L - 1) / 2) * W, 6)
    // 下辺の最初（左から）
    const bottomIndex = L - 2 + E + 1
    expect(ring0[bottomIndex].x).toBeCloseTo(-((L - 3) / 2) * W, 5)
    expect(ring0[bottomIndex].y).toBeCloseTo(g.rings[0].radius, 5)
    expect(links[bottomIndex].to[0]).toBeCloseTo(-((L - 3) / 2) * W, 6)
    // 右端（根元）の残りの目
    expect(links[2 * (L - 2) + E + 1].to[0]).toBeCloseTo(((L - 1) / 2) * W, 6)
  })

  test('2周目以降も同じ線分のまわりに広がる', () => {
    const g = oval();
    expect(g.rings[1].radius - g.rings[0].radius).toBeGreaterThanOrEqual(
      DR_MIN - 1e-9
    );
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1);
    for (const n of ring1)
      expect(distToCore(n.x, n.y)).toBeCloseTo(g.rings[1].radius, 5);
  });

  test('bounds は 線分の半分＋最大半径＋余白', () => {
    const g = oval();
    expect(g.bounds).toBeCloseTo(
      core / 2 + g.rings[g.rings.length - 1].radius + MARGIN + 5,
      5
    );
  });

  test('鎖の作り目が無ければ円で、鎖もない', () => {
    const g = buildGeometry([
      {
        id: 'a',
        kind: 'magic_ring',
        section: 'crown',
        units: [unit('sc', 6)],
        repeat: 1,
        rowSpan: 1,
      },
    ]);
    expect(g.chain).toBeNull();
    expect(g.rings[0].halfLength).toBe(0);
  });

  test('設定が不正（鎖が2目）なら円のまま壊れない', () => {
    const f = createFoundationRow(10, 3);
    const g = buildGeometry([
      { ...f, foundation: { chains: 2, endStitches: 3 } },
    ]);
    expect(g.chain).toBeNull();
    expect(g.rings[0].halfLength).toBe(0);
  });
});
