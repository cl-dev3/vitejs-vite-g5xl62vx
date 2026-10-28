import { describe, expect, test } from 'vitest';
import { buildGeometry } from '../chart/geometry';
import { computeProject } from './compute';
import type { Row, StitchKind } from './types';

let seq = 0;
const unit = (kind: StitchKind, count = 1) => ({
  id: `u${seq++}`,
  kind,
  count,
});
const ring = (units: Row['units'], turning?: Row['turning']): Row => ({
  id: `r${seq++}`,
  kind: 'magic_ring',
  section: 'crown',
  units,
  repeat: 1,
  rowSpan: 1,
  ...(turning ? { turning } : {}),
});

describe('円の1段目（輪の作り目）に立ち上がり・引き抜き', () => {
  test('細編み: 立ち上がり鎖1目（数えない）＋引き抜きで輪にする', () => {
    const c = computeProject([
      ring([unit('sc', 6)], { chains: 1, join: true }),
    ]);
    expect(c.rows[0].valid).toBe(true);
    expect(c.rows[0].stitchesOut).toBe(6);
    expect(c.rows[0].text).toBe(
      '第1段：立ち上がり鎖1目、輪の作り目に細編み6目を編み入れる。最後に引き抜き編みで輪にする（計6目）'
    );
  });

  test('中長編み: 立ち上がり鎖2目（1目に数える）。アクションは残りの11目で、合計12目', () => {
    const c = computeProject([ring([unit('hdc', 11)], { chains: 2 })]);
    expect(c.rows[0].valid).toBe(true);
    expect(c.rows[0].stitchesIn).toBe(0);
    expect(c.rows[0].stitchesOut).toBe(12);
    expect(c.rows[0].text).toBe(
      '第1段：立ち上がり鎖2目（1目に数える）、輪の作り目に中長編み11目を編み入れる（計12目）'
    );
  });

  test('次の段は、立ち上がりを含めた目数につながる', () => {
    const c = computeProject([
      ring([unit('hdc', 11)], { chains: 2 }),
      {
        id: 'r2',
        kind: 'round',
        section: 'crown',
        units: [{ id: 'x', kind: 'inc', count: 1 }],
        repeat: 12,
        rowSpan: 1,
      },
    ]);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].stitchesIn).toBe(12);
  });

  test('チャート: 1目に数える立ち上がりは最初の目が○（鎖）、親なし', () => {
    const g = buildGeometry([ring([unit('hdc', 11)], { chains: 2 })]);
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0);
    expect(ring0).toHaveLength(12);
    expect(ring0[0].kind).toBe('ch');
    expect(ring0[0].parentIdx).toEqual([]);
    expect(ring0[1].kind).toBe('hdc');
    expect(g.turnings[0].points).toHaveLength(1);
  });

  test('チャート: 引き抜きの●は12時の右、○は左。1目目はずれない', () => {
    const plain = buildGeometry([ring([unit('sc', 6)])]);
    const g = buildGeometry([ring([unit('sc', 6)], { chains: 1, join: true })]);
    plain.nodes.forEach((n, i) => {
      expect(g.nodes[i].x).toBeCloseTo(n.x, 6);
      expect(g.nodes[i].y).toBeCloseTo(n.y, 6);
    });
    const t = g.turnings[0];
    expect(t.rowIndex).toBe(0);
    expect(t.points).toHaveLength(1);
    expect(t.points[0][0]).toBeLessThan(t.join![0]);
  });
});
