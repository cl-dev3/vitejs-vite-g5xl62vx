import { describe, expect, test } from 'vitest';
import { createFoundationRow } from '../domain/presets';
import type { Row, StitchKind } from '../domain/types';
import { buildGeometry, type ChartGeometry } from './geometry';

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
const ringOf = (g: ChartGeometry, k: number) =>
  g.nodes.filter((n) => n.rowIndex === k);

describe('増し目の2目', () => {
  test('同じ親から2目で、左右に開く（lean）', () => {
    const g = buildGeometry([ring(), row('round', [unit('hdc_inc')], 6)]);
    const r1 = ringOf(g, 1);
    expect(r1).toHaveLength(12);
    expect(r1.slice(0, 4).map((n) => n.parentIdx)).toEqual([
      [0],
      [0],
      [1],
      [1],
    ]);
    expect(r1.slice(0, 4).map((n) => n.lean)).toEqual([1, -1, 1, -1]);
    expect(r1.every((n) => n.kind === 'hdc_inc')).toBe(true);
    expect(ringOf(g, 0).every((n) => n.lean === 0)).toBe(true);
  });
});

describe('立ち上がり', () => {
  test('1目に数える鎖は、前段の最初の目の上に1目ぶん立つ', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 6)], 1, { turning: { chains: 3 } }),
    ]);
    const r1 = ringOf(g, 1);
    expect(r1).toHaveLength(6);
    expect(r1[0].kind).toBe('ch');
    expect(r1[0].parentIdx).toEqual([0]);
    expect(r1.slice(1).map((n) => n.parentIdx)).toEqual([
      [1],
      [2],
      [3],
      [4],
      [5],
    ]);
    expect(r1.slice(1).every((n) => n.kind === 'dc')).toBe(true);
  });

  test('数えない鎖（細編みの1目）は目として描かない', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc')], 6, { turning: { chains: 1 } }),
    ]);
    const r1 = ringOf(g, 1);
    expect(r1).toHaveLength(6);
    expect(r1.map((n) => n.parentIdx)).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(r1.every((n) => n.kind === 'sc')).toBe(true);
  });
});

describe('鎖の作り目', () => {
  test('1周目は目数ぶんの目を親なしで並べ、2周目が親につながる', () => {
    const g = buildGeometry([
      createFoundationRow(10, 3),
      row('round', [unit('inc', 3), unit('sc', 8)], 2),
    ]);
    expect(g.rings.map((r) => r.count)).toEqual([22, 28]);
    expect(ringOf(g, 0).every((n) => n.kind === 'sc')).toBe(true);
    expect(g.links.filter((l) => l.rowIndex === 0)).toHaveLength(0);
    // 2周目の28目は、すべて親を1つずつ持つ
    expect(g.links).toHaveLength(28);
  });
});
