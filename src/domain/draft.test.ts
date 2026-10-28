import { describe, expect, test } from 'vitest';
import { computeRow } from './compute';
import { contextForIndex, createDraft } from './draft';
import { createSampleProject } from './sample';

const rows = createSampleProject().rows;

describe('contextForIndex', () => {
  test('先頭は前段なし', () => {
    expect(contextForIndex(rows, 0)).toMatchObject({
      prevOut: 0,
      startNo: 1,
      isFirst: true,
    });
  });
  test('途中の段は直前までの状態', () => {
    expect(contextForIndex(rows, 2)).toMatchObject({
      prevOut: 12,
      startNo: 3,
      isFirst: false,
    });
  });
});

describe('createDraft', () => {
  test('空のときは輪の作り目', () => {
    const d = createDraft([]);
    expect(d.row.kind).toBe('magic_ring');
    expect(d.context.isFirst).toBe(true);
  });
  test('末尾に追加すると前段と同じ目数の細編み段（有効）', () => {
    const { row, context } = createDraft(rows);
    expect(context.startNo).toBe(11);
    expect(context.prevOut).toBe(36);
    expect(
      computeRow(row, context.prevOut, context.startNo, context.isFirst).valid
    ).toBe(true);
  });
  test('指定段の後ろに入る文脈になる', () => {
    const { row, context } = createDraft(rows, rows[1].id);
    expect(context.prevOut).toBe(12);
    expect(context.startNo).toBe(3);
    expect(row.repeat).toBe(12);
  });
});
