import { describe, expect, test } from 'vitest';
import { createFoundationRow } from '../domain/presets';
import type { Row, StitchKind } from '../domain/types';
import { buildGeometry } from './geometry';
import { legendKinds } from '../pdf/patternInfo';

let seq = 0;
const unit = (kind: StitchKind, count = 1) => ({
  id: `u${seq++}`,
  kind,
  count,
});
const row = (
  kind: Row['kind'],
  units: Row['units'],
  repeat = 1,
  extra: Partial<Row> = {}
): Row => ({
  id: `r${seq++}`,
  kind,
  section: 'crown',
  units,
  repeat,
  rowSpan: 1,
  ...extra,
});
const ring = () => row('magic_ring', [unit('sc', 6)]);

describe('立ち上がりの鎖と引き抜き編み（通常の段）', () => {
  test('数えない立ち上がり1目＋引き抜き: ●が出発点、目1つぶん空けて○', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc')], 6, { turning: { chains: 1, join: true } }),
    ]);
    const t = g.turnings[0];
    const R1 = g.rings[1].radius;
    const P = 2 * Math.PI * R1;
    // ●は段の出発点（12時）
    expect(t.join![0]).toBeCloseTo(0, 5);
    expect(t.join![1]).toBeCloseTo(-R1, 5);
    // ○は、空き（目1つぶん = P/7）だけ進んだ位置
    const th = -Math.PI / 2 - P / 7 / R1;
    expect(t.points).toHaveLength(1);
    expect(t.points[0][0]).toBeCloseTo(R1 * Math.cos(th), 5);
    expect(t.points[0][1]).toBeCloseTo(R1 * Math.sin(th), 5);
    // ○と●は重ならない
    expect(
      Math.hypot(t.points[0][0] - t.join![0], t.points[0][1] - t.join![1])
    ).toBeGreaterThan(5);
  });

  test('反時計回りに読む: 最後の目（右）→ ●（12時）→ ○・最初の目（左）', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3, join: true } }),
    ]);
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1);
    const j = g.turnings[0].join!;
    expect(ring1[0].x).toBeLessThan(j[0]); // 最初の目（○）は、●の左
    expect(ring1[ring1.length - 1].x).toBeGreaterThan(j[0]); // 最後の目は、●の右
  });

  test('数えない立ち上がり3目: 前段から次の段へ向かって、等間隔に3つ積む', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc')], 6, { turning: { chains: 3, counted: false } }),
    ]);
    const t = g.turnings[0];
    const R0 = g.rings[0].radius;
    const R1 = g.rings[1].radius;
    expect(t.points).toHaveLength(3);
    t.points.forEach((p, i) => {
      expect(p[1]).toBeCloseTo(-R0 + (-R1 + R0) * ((i + 1) / 3), 5);
    });
    expect(t.join).toBeNull();
  });

  test('1目に数える立ち上がり3目: 最初の目が○で、手前に2つ積む', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3 } }),
    ]);
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0);
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1);
    expect(ring1[0].kind).toBe('ch');
    const t = g.turnings[0];
    expect(t.points).toHaveLength(2);
    const base: [number, number] = [ring0[0].x, ring0[0].y];
    const top: [number, number] = [ring1[0].x, ring1[0].y];
    t.points.forEach((p, i) => {
      const f = (i + 1) / 3;
      expect(p[0]).toBeCloseTo(base[0] + (top[0] - base[0]) * f, 5);
      expect(p[1]).toBeCloseTo(base[1] + (top[1] - base[1]) * f, 5);
    });
  });

  test('1目に数える立ち上がり1目: 鎖は最初の目だけ（積む○なし）。引き抜きだけ出る', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc', 5)], 1, {
        turning: { chains: 1, counted: true, join: true },
      }),
    ]);
    expect(g.turnings[0].points).toHaveLength(0);
    expect(g.turnings[0].join).not.toBeNull();
  });

  test('立ち上がりが無ければ何も出ない／rowSpan ごとに出る', () => {
    expect(
      buildGeometry([ring(), row('round', [unit('sc')], 6)]).turnings
    ).toHaveLength(0);
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc')], 6, {
        turning: { chains: 1, join: true },
        rowSpan: 2,
      }),
    ]);
    expect(g.turnings.map((t) => t.rowIndex)).toEqual([1, 2]);
  });
  test('数える立ち上がり＋引き抜き: ●は、最後の目と最初の目(○)のちょうど真ん中', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3, join: true } }),
    ]);
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1);
    const j = g.turnings[0].join!;
    const last = ring1[ring1.length - 1];
    const firstNode = ring1[0];
    const dLast = Math.hypot(j[0] - last.x, j[1] - last.y);
    const dFirst = Math.hypot(j[0] - firstNode.x, j[1] - firstNode.y);
    expect(dLast).toBeCloseTo(dFirst, 5);
    expect(dLast).toBeGreaterThan(5);
    // 積んだ○とも重ならない
    for (const p of g.turnings[0].points) {
      expect(Math.hypot(j[0] - p[0], j[1] - p[1])).toBeGreaterThan(5);
    }
  });
});

describe('鎖の作り目の1段目の立ち上がり', () => {
  const W = 14;
  const rightEnd = (9 / 2) * W; // 鎖10目の右端
  const core = 8 * W;

  test('数えない2目: 鎖の右端から、1周目の出発点（右端の上）へ向かって2つ積む', () => {
    const g = buildGeometry([
      { ...createFoundationRow(10, 3), turning: { chains: 2, counted: false } },
    ]);
    const R0 = g.rings[0].radius;
    const t = g.turnings[0];
    expect(t.points).toHaveLength(2);
    expect(t.points[1][0]).toBeCloseTo(-core / 2, 5);
    expect(t.points[1][1]).toBeCloseTo(-R0, 5);
    expect(t.points[0][0]).toBeCloseTo(-(rightEnd + core / 2) / 2, 5);
    expect(t.points[0][1]).toBeCloseTo(-R0 / 2, 5);
  });

  test('1目に数える2目: 最初の目が○（鎖）になり、手前に1つ積む。目数は変わらない', () => {
    const g = buildGeometry([
      { ...createFoundationRow(10, 3, 'hdc'), turning: { chains: 2 } },
    ]);
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0);
    expect(ring0).toHaveLength(22);
    expect(ring0[0].kind).toBe('ch');
    expect(ring0[1].kind).toBe('hdc');
    expect(g.turnings[0].points).toHaveLength(1);
  });

  test('引き抜き編み: 1周目の出発点（鎖の右端の上）。立ち上がりの○とは目1つぶん空ける', () => {
    const g = buildGeometry([
      { ...createFoundationRow(10, 3), turning: { chains: 1, join: true } },
    ]);
    const R0 = g.rings[0].radius;
    const t = g.turnings[0];
    expect(t.join![0]).toBeCloseTo(-core / 2, 5);
    expect(t.join![1]).toBeCloseTo(-R0, 5);
    expect(t.points).toHaveLength(1);
    expect(
      Math.hypot(t.points[0][0] - t.join![0], t.points[0][1] - t.join![1])
    ).toBeGreaterThan(10);
  });
});

describe('凡例', () => {
  test('立ち上がり＋引き抜きがあれば、鎖編みと引き抜き編みが入る', () => {
    const plain = legendKinds(
      buildGeometry([ring(), row('round', [unit('dc')], 6)])
    );
    expect(plain).toEqual(['sc', 'dc']);

    const g = buildGeometry([
      ring(),
      row('round', [unit('dc')], 6, {
        turning: { chains: 3, counted: false, join: true },
      }),
    ]);
    const kinds = legendKinds(g);
    expect(kinds).toContain('ch');
    expect(kinds).toContain('slst');
  });

  test('鎖の作り目があれば鎖編みが入る', () => {
    expect(legendKinds(buildGeometry([createFoundationRow(10, 3)]))).toContain(
      'ch'
    );
  });
});
