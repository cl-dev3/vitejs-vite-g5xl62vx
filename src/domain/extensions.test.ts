import { describe, expect, test } from 'vitest';
import { computeProject, computeUnit } from './compute';
import { describeUnit } from './describe';
import { foundationStitches } from './foundation';
import {
  allInc,
  createFoundationRow,
  standardInc,
  standardTurning,
} from './presets';
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

describe('中長編み・長編みの増し目', () => {
  test('1目消費・2目生成', () => {
    expect(computeUnit(unit('hdc_inc', 1))).toEqual({ in: 1, out: 2 });
    expect(computeUnit(unit('dc_inc', 3))).toEqual({ in: 3, out: 6 });
  });

  test('1のときは数字を省略する', () => {
    expect(describeUnit(unit('hdc_inc'))).toBe('中長編みの増し目');
    expect(describeUnit(unit('dc_inc'))).toBe('長編みの増し目');
    expect(describeUnit(unit('hdc_inc', 2))).toBe('中長編みの増し目2目');
  });

  test('全目に中長編みの増し目', () => {
    const c = computeProject([ring(), row('round', [unit('hdc_inc')], 6)]);
    expect(c.rows[1].stitchesOut).toBe(12);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].text).toBe(
      '第2段：すべての目に中長編みの増し目を編み入れる（計12目）'
    );
  });

  test('プリセットを長編みの増し目にできる', () => {
    expect(allInc(6, 'hdc')!.units[0].kind).toBe('hdc_inc');
    const p = standardInc(12, 6, 'dc')!;
    expect(p.units.map((x) => x.kind)).toEqual(['dc', 'dc_inc']);
    const first = allInc(6)!;
    const c = computeProject([
      ring(),
      row('round', first.units, first.repeat),
      row('round', p.units, p.repeat),
    ]);
    expect(c.rows[2].valid).toBe(true);
    expect(c.rows[2].text).toBe(
      '第3段：（長編み1目、長編みの増し目）を6回繰り返す（計18目）'
    );
  });
});

describe('立ち上がり', () => {
  test('細編み: 鎖1目は1目に数えない', () => {
    const c = computeProject([
      ring(),
      row('round', [unit('sc')], 6, { turning: { chains: 1 } }),
    ]);
    expect(c.rows[1].stitchesIn).toBe(6);
    expect(c.rows[1].stitchesOut).toBe(6);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].text).toBe(
      '第2段：立ち上がり鎖1目、すべての目に細編みを編む（計6目）'
    );
  });

  test('長編み: 鎖3目は1目に数え、残りの目をユニットが受け持つ', () => {
    const c = computeProject([
      ring(),
      row('round', [unit('dc_inc', 5)], 1, { turning: { chains: 3 } }),
    ]);
    expect(c.rows[1].stitchesIn).toBe(6);
    expect(c.rows[1].stitchesOut).toBe(11);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].text).toBe(
      '第2段：立ち上がり鎖3目（1目に数える）、残りのすべての目に長編みの増し目を編み入れる（計11目）'
    );
  });

  test('輪にする（join）', () => {
    const c = computeProject([
      ring(),
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3, join: true } }),
    ]);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].text).toBe(
      '第2段：立ち上がり鎖3目（1目に数える）、残りのすべての目に長編みを編む。最後に引き抜き編みで輪にする（計6目）'
    );
  });

  test('counted:false なら数えない', () => {
    const c = computeProject([
      ring(),
      row('round', [unit('dc', 6)], 1, {
        turning: { chains: 3, counted: false },
      }),
    ]);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].text).toBe(
      '第2段：立ち上がり鎖3目、すべての目に長編みを編む（計6目）'
    );
  });

  test('数える立ち上がりを足すと、ユニットが全目を受け持つ段は目数が合わなくなる', () => {
    const c = computeProject([
      ring(),
      row('round', [unit('dc', 6)], 1, { turning: { chains: 3 } }),
    ]);
    expect(c.rows[1].errors).toContain(
      '前段の目数(6)と消費目数(7)が一致しません（差 1）'
    );
  });

  test('鎖の数は1〜6（輪の作り目にも付けられる）', () => {
    const ok = computeProject([
      row('magic_ring', [unit('sc', 6)], 1, { turning: { chains: 1 } }),
    ]);
    expect(ok.rows[0].valid).toBe(true);

    for (const n of [0, 7]) {
      const b = computeProject([
        ring(),
        row('round', [unit('sc')], 6, { turning: { chains: n } }),
      ]);
      expect(b.rows[1].errors).toContain(
        '立ち上がりの鎖は1〜6目にしてください'
      );
    }
  });

  test('standardTurning: 先頭の編み目から標準の鎖数を決める', () => {
    const t = (kinds: StitchKind[]) =>
      standardTurning(
        row(
          'round',
          kinds.map((k) => unit(k)),
          1
        )
      );
    expect(t(['sc'])).toEqual({ chains: 1 });
    expect(t(['inc'])).toEqual({ chains: 1 });
    expect(t(['hdc_inc', 'hdc'])).toEqual({ chains: 2 });
    expect(t(['dc'])).toEqual({ chains: 3 });
    expect(t(['dec'])).toBeUndefined();
    expect(t(['ch'])).toBeUndefined();
    expect(standardTurning(row('round', [], 1))).toBeUndefined();
  });
});
describe('鎖の作り目（楕円スタート）', () => {
  test('1周目の目数 = 2×(鎖−2) + 2×端', () => {
    expect(foundationStitches({ chains: 10, endStitches: 3 })).toBe(22);
    expect(foundationStitches({ chains: 6, endStitches: 2 })).toBe(12);
  });

  test('1周目の文章と目数', () => {
    const c = computeProject([createFoundationRow(10, 3)]);
    expect(c.rows[0].stitchesIn).toBe(0);
    expect(c.rows[0].stitchesOut).toBe(22);
    expect(c.rows[0].valid).toBe(true);
    expect(c.rows[0].text).toBe(
      '第1段：鎖10目の作り目をし、細編みを、鎖の片側に8目、先端に3目、鎖の反対側に8目、根元に3目編み入れる（計22目）'
    );
  });

  test('中長編みの周回', () => {
    const c = computeProject([createFoundationRow(8, 2, 'hdc')]);
    expect(c.rows[0].stitchesOut).toBe(16);
    expect(c.rows[0].text).toContain('中長編みを、鎖の片側に6目、先端に2目');
  });

  test('2周目: 両端を増して楕円を広げる', () => {
    const c = computeProject([
      createFoundationRow(10, 3),
      row('round', [unit('sc', 8), unit('inc', 3)], 2),
    ]);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].stitchesOut).toBe(28);
    expect(c.rows[1].text).toBe(
      '第2段：（細編み8目、増し目3目）を2回繰り返す（計28目）'
    );
  });

  test('検証: 最初の段以外／鎖の数／端の数／編み目の種類／立ち上がり／設定なし', () => {
    const notFirst = computeProject([ring(), createFoundationRow()]);
    expect(notFirst.rows[1].errors).toContain(
      '鎖の作り目は最初の段にだけ使えます'
    );

    const f = createFoundationRow();
    const chains = computeProject([
      { ...f, foundation: { chains: 2, endStitches: 3 } },
    ]);
    expect(chains.rows[0].errors).toContain(
      '作り目の鎖は3〜99目にしてください'
    );

    const ends = computeProject([
      { ...f, foundation: { chains: 10, endStitches: 0 } },
    ]);
    expect(ends.rows[0].errors).toContain(
      '端に編み入れる目数は1〜9目にしてください'
    );

    const kind = computeProject([{ ...f, units: [unit('dec')] }]);
    expect(kind.rows[0].errors).toContain(
      '作り目の周回は細編み・中長編み・長編みのどれかにしてください'
    );

    const none = computeProject([{ ...f, foundation: undefined }]);
    expect(none.rows[0].errors).toContain('鎖の作り目の設定がありません');
  });
});
