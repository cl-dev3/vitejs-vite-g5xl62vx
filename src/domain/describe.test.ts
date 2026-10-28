import { describe, expect, test } from 'vitest';
import { describeRow, describeUnit } from './describe';
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
  rowSpan = 1,
  note?: string
): Row => ({
  id: `r${seq++}`,
  kind,
  section: 'crown',
  units,
  repeat,
  rowSpan,
  note,
});

describe('describeUnit', () => {
  test('増し目・減らし目は1のとき数字を省略', () => {
    expect(describeUnit(unit('inc'))).toBe('増し目');
    expect(describeUnit(unit('dec'))).toBe('減らし目');
  });
  test('それ以外は「種類＋数＋目」', () => {
    expect(describeUnit(unit('sc', 2))).toBe('細編み2目');
    expect(describeUnit(unit('inc', 2))).toBe('増し目2目');
    expect(describeUnit(unit('sc', 1))).toBe('細編み1目');
  });
  test('バリアントは末尾に付く', () => {
    expect(describeUnit({ ...unit('sc', 3), variant: 'blo' })).toBe(
      '細編み3目（すじ編み）'
    );
  });
});

describe('describeRow（設計書4.2のテストケース）', () => {
  test('輪の作り目', () => {
    const r = row('magic_ring', [unit('sc', 6)]);
    expect(
      describeRow(
        r,
        { prevOut: 0, startNo: 1, endNo: 1 },
        { stitchesIn: 0, stitchesOut: 6 }
      )
    ).toBe('第1段：輪の作り目に細編み6目を編み入れる（計6目）');
  });

  test('全目増し目', () => {
    const r = row('round', [unit('inc')], 6);
    expect(
      describeRow(
        r,
        { prevOut: 6, startNo: 2, endNo: 2 },
        { stitchesIn: 6, stitchesOut: 12 }
      )
    ).toBe('第2段：すべての目に増し目を編み入れる（計12目）');
  });

  test('標準の増し段', () => {
    const r = row('round', [unit('sc'), unit('inc')], 6);
    expect(
      describeRow(
        r,
        { prevOut: 12, startNo: 3, endNo: 3 },
        { stitchesIn: 12, stitchesOut: 18 }
      )
    ).toBe('第3段：（細編み1目、増し目）を6回繰り返す（計18目）');
  });

  test('rowSpan>1 の全目細編み', () => {
    const r = row('round', [unit('sc')], 36, 4);
    expect(
      describeRow(
        r,
        { prevOut: 36, startNo: 9, endNo: 12 },
        { stitchesIn: 36, stitchesOut: 36 }
      )
    ).toBe('第9〜12段：すべての目に細編みを編む（各段 計36目）');
  });

  test('標準の減らし段', () => {
    const r = row('round', [unit('sc', 2), unit('dec')], 6);
    expect(
      describeRow(
        r,
        { prevOut: 24, startNo: 7, endNo: 7 },
        { stitchesIn: 24, stitchesOut: 18 }
      )
    ).toBe('第7段：（細編み2目、減らし目）を6回繰り返す（計18目）');
  });

  test('全目減らし目', () => {
    const r = row('round', [unit('dec')], 6);
    expect(
      describeRow(
        r,
        { prevOut: 12, startNo: 5, endNo: 5 },
        { stitchesIn: 12, stitchesOut: 6 }
      )
    ).toBe('第5段：すべて減らし目で編む（計6目）');
  });

  test('repeat=1 は「、」で結合するだけ', () => {
    const r = row('round', [unit('sc', 3), unit('inc'), unit('sc', 2)], 1);
    expect(
      describeRow(
        r,
        { prevOut: 6, startNo: 4, endNo: 4 },
        { stitchesIn: 6, stitchesOut: 7 }
      )
    ).toBe('第4段：細編み3目、増し目、細編み2目（計7目）');
  });

  test('メモは末尾に※付きで入る', () => {
    const r = row('round', [unit('sc')], 6, 1, '色替え');
    expect(
      describeRow(
        r,
        { prevOut: 6, startNo: 2, endNo: 2 },
        { stitchesIn: 6, stitchesOut: 6 }
      )
    ).toBe('第2段：すべての目に細編みを編む（計6目）※色替え');
  });
});
