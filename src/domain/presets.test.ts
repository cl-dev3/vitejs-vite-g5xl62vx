import { describe, expect, test } from 'vitest';
import { computeProject } from './compute';
import { allInc, allSc, copyRow, standardDec, standardInc } from './presets';
import type { Row } from './types';

const mk = (id: string, p: { units: Row['units']; repeat: number }): Row => ({
  id,
  kind: 'round',
  section: 'crown',
  units: p.units,
  repeat: p.repeat,
  rowSpan: 1,
});

describe('presets', () => {
  test('全目増し目: 6→12', () => {
    const p = allInc(6)!;
    expect(p.repeat).toBe(6);
    expect(p.units).toHaveLength(1);
    expect(p.units[0].kind).toBe('inc');
  });

  test('標準の増し段: 12→18（k=1）', () => {
    const p = standardInc(12, 6)!;
    expect(p.units.map((x) => [x.kind, x.count])).toEqual([
      ['sc', 1],
      ['inc', 1],
    ]);
    expect(p.repeat).toBe(6);
  });

  test('標準の減らし段: 24→18（k=2）、12→6（k=0）', () => {
    const a = standardDec(24, 6)!;
    expect(a.units.map((x) => [x.kind, x.count])).toEqual([
      ['sc', 2],
      ['dec', 1],
    ]);
    const b = standardDec(12, 6)!;
    expect(b.units.map((x) => x.kind)).toEqual(['dec']);
  });

  test('割り切れない・範囲外は null', () => {
    expect(standardInc(13, 6)).toBeNull();
    expect(standardDec(13, 6)).toBeNull();
    expect(standardDec(6, 6)).toBeNull(); // k=-1
    expect(allSc(100)).toBeNull();
    expect(allSc(0)).toBeNull();
  });

  test('プリセットを連結すると頭頂 6→12→18→24 になる', () => {
    const ring: Row = {
      id: 'r0',
      kind: 'magic_ring',
      section: 'crown',
      units: [{ id: 'u0', kind: 'sc', count: 6 }],
      repeat: 1,
      rowSpan: 1,
    };
    const rows = [
      ring,
      mk('r1', allInc(6)!),
      mk('r2', standardInc(12, 6)!),
      mk('r3', standardInc(18, 6)!),
    ];
    const c = computeProject(rows);
    expect(c.rows.map((r) => r.stitchesOut)).toEqual([6, 12, 18, 24]);
    expect(c.rows.every((r) => r.valid)).toBe(true);
    expect(c.rows[3].text).toBe(
      '第4段：（細編み2目、増し目）を6回繰り返す（計24目）'
    );
  });

  test('copyRow はIDを新しく振る', () => {
    const src = mk('r1', allInc(6)!);
    const dup = copyRow(src);
    expect(dup.id).not.toBe(src.id);
    expect(dup.units[0].id).not.toBe(src.units[0].id);
    expect(dup.repeat).toBe(src.repeat);
  });
});
