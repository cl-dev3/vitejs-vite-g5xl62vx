import { describe, expect, test } from 'vitest';
import { computeProject, computeUnit } from './compute';
import type { Row, StitchKind } from './types';

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
  rowSpan = 1
): Row => ({ id: `r${seq++}`, kind, section: 'crown', units, repeat, rowSpan });

describe('computeUnit', () => {
  test('増し目は1消費2生成', () => {
    expect(computeUnit(unit('inc', 1))).toEqual({ in: 1, out: 2 });
  });
  test('減らし目は2消費1生成', () => {
    expect(computeUnit(unit('dec', 1))).toEqual({ in: 2, out: 1 });
  });
  test('鎖編みは0消費', () => {
    expect(computeUnit(unit('ch', 3))).toEqual({ in: 0, out: 3 });
  });
});

describe('computeProject', () => {
  const crown = [
    row('magic_ring', [unit('sc', 6)]),
    row('round', [unit('inc')], 6),
    row('round', [unit('sc'), unit('inc')], 6),
  ];

  test('頭頂 6→12→18 が有効で総目数が合う', () => {
    const c = computeProject(crown);
    expect(c.rows.map((r) => r.stitchesOut)).toEqual([6, 12, 18]);
    expect(c.rows[0].stitchesIn).toBe(0);
    expect(c.rows[2].delta).toBe(6);
    expect(c.rows.every((r) => r.valid)).toBe(true);
    expect(c.maxStitchesOut).toBe(18);
  });

  test('rowSpan の段番号・ラベル・合計', () => {
    const rows = [
      row('magic_ring', [unit('sc', 6)]),
      row('round', [unit('inc')], 6),
      row('round', [unit('sc')], 12, 4),
    ];
    const c = computeProject(rows);
    expect(c.rows[2].label).toBe('第3〜6段');
    expect(c.rows[2].startNo).toBe(3);
    expect(c.rows[2].endNo).toBe(6);
    expect(c.totalRows).toBe(6);
    expect(c.totalStitches).toBe(6 + 12 + 12 * 4);
  });

  test('減らし段 24→18', () => {
    const rows = [
      row('magic_ring', [unit('sc', 24)]),
      row('round', [unit('sc', 2), unit('dec')], 6),
    ];
    const c = computeProject(rows);
    expect(c.rows[1].stitchesIn).toBe(24);
    expect(c.rows[1].stitchesOut).toBe(18);
    expect(c.rows[1].valid).toBe(true);
  });

  test('前段との目数不一致はエラー', () => {
    const rows = [
      row('magic_ring', [unit('sc', 6)]),
      row('round', [unit('sc')], 5),
    ];
    const c = computeProject(rows);
    expect(c.rows[1].valid).toBe(false);
    expect(c.rows[1].errors[0]).toContain('一致しません');
  });

  test('目数が変わる段の rowSpan>1 はエラー', () => {
    const rows = [
      row('magic_ring', [unit('sc', 6)]),
      row('round', [unit('inc')], 6, 2),
    ];
    const c = computeProject(rows);
    expect(c.rows[1].errors).toContain(
      '目数が変わる段は「続ける段数」を1にしてください'
    );
  });

  test('先頭が輪の作り目でないとエラー', () => {
    const c = computeProject([row('round', [unit('sc')], 6)]);
    expect(c.rows[0].errors).toContain(
      '最初の段は輪の作り目か鎖の作り目にしてください'
    );
  });

  test('ユニットが0個だとエラー', () => {
    const c = computeProject([row('magic_ring', [], 1)]);
    expect(c.rows[0].errors).toContain('アクションを1つ以上追加してください');
  });
});
