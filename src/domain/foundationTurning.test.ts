import { describe, expect, test } from 'vitest';
import { computeProject } from './compute';
import { createFoundationRow } from './presets';

const found = (
  L: number,
  E: number,
  kind: 'sc' | 'hdc' | 'dc',
  turning?: object
) => ({
  ...createFoundationRow(L, E, kind),
  turning: turning as never,
});

describe('鎖の作り目の1段目に立ち上がり', () => {
  test('作り目10目＋立ち上がり2目（1目に数える）: 目数は変わらず、最初の片側が1目減る', () => {
    const c = computeProject([found(10, 3, 'hdc', { chains: 2 })]);
    expect(c.rows[0].valid).toBe(true);
    expect(c.rows[0].stitchesOut).toBe(22);
    expect(c.rows[0].text).toBe(
      '第1段：鎖10目の作り目をし、立ち上がり鎖2目（1目に数える）、中長編みを、鎖の片側に7目、先端に3目、鎖の反対側に8目、根元に3目編み入れる（計22目）'
    );
  });

  test('細編みの立ち上がり1目（数えない）: 減らない', () => {
    const c = computeProject([found(10, 3, 'sc', { chains: 1 })]);
    expect(c.rows[0].valid).toBe(true);
    expect(c.rows[0].stitchesOut).toBe(22);
    expect(c.rows[0].text).toBe(
      '第1段：鎖10目の作り目をし、立ち上がり鎖1目、細編みを、鎖の片側に8目、先端に3目、鎖の反対側に8目、根元に3目編み入れる（計22目）'
    );
  });

  test('片側が1目だけのとき、数える立ち上がりでその項目が消える', () => {
    const c = computeProject([found(3, 2, 'sc', { chains: 2 })]);
    expect(c.rows[0].stitchesOut).toBe(6);
    expect(c.rows[0].text).toBe(
      '第1段：鎖3目の作り目をし、立ち上がり鎖2目（1目に数える）、細編みを、先端に2目、鎖の反対側に1目、根元に2目編み入れる（計6目）'
    );
  });

  test('引き抜き編みで輪にする', () => {
    const c = computeProject([found(10, 3, 'hdc', { chains: 2, join: true })]);
    expect(c.rows[0].text).toContain(
      '編み入れる。最後に引き抜き編みで輪にする（計22目）'
    );
  });

  test('鎖の数は1〜6', () => {
    for (const n of [0, 7]) {
      const c = computeProject([found(10, 3, 'sc', { chains: n })]);
      expect(c.rows[0].errors).toContain(
        '立ち上がりの鎖は1〜6目にしてください'
      );
    }
  });

  test('立ち上がりがあっても、次の段の目数はつながる', () => {
    const c = computeProject([
      found(10, 3, 'hdc', { chains: 2 }),
      {
        id: 'r2',
        kind: 'round',
        section: 'crown',
        units: [
          { id: 'a', kind: 'sc', count: 8 },
          { id: 'b', kind: 'inc', count: 3 },
        ],
        repeat: 2,
        rowSpan: 1,
      },
    ]);
    expect(c.rows[1].valid).toBe(true);
    expect(c.rows[1].stitchesIn).toBe(22);
  });
});
