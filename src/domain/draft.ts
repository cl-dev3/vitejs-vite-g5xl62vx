import { nanoid } from 'nanoid';
import { computeProject } from './compute';
import { allSc } from './presets';
import type { Row } from './types';

/** 編集する段の直前までの状態 */
export interface EditContext {
  prevOut: number; // 前段の総目数
  startNo: number; // この段の開始段番号
  isFirst: boolean; // 先頭の段か
  prevRow?: Row; // 前段（「前段をコピー」用）
}

/** rows の index 番目に入る段の文脈を作る */
export function contextForIndex(rows: Row[], index: number): EditContext {
  const head = computeProject(rows.slice(0, index)).rows;
  const last = head[head.length - 1];
  return {
    prevOut: last ? last.stitchesOut : 0,
    startNo: last ? last.endNo + 1 : 1,
    isFirst: index === 0,
    prevRow: index > 0 ? rows[index - 1] : undefined,
  };
}

/** 新しい段の下書きを作る（ストアにはまだ入れない） */
export function createDraft(
  rows: Row[],
  afterId?: string
): { row: Row; context: EditContext } {
  if (rows.length === 0) {
    return {
      row: {
        id: nanoid(),
        kind: 'magic_ring',
        section: 'crown',
        units: [{ id: nanoid(), kind: 'sc', count: 6 }],
        repeat: 1,
        rowSpan: 1,
      },
      context: contextForIndex(rows, 0),
    };
  }

  let at = afterId ? rows.findIndex((r) => r.id === afterId) : -1;
  if (at < 0) at = rows.length - 1;
  const context = contextForIndex(rows, at + 1);
  const preset = allSc(context.prevOut) ?? {
    units: [{ id: nanoid(), kind: 'sc' as const, count: 1 }],
    repeat: 1,
  };
  return {
    row: {
      id: nanoid(),
      kind: 'round',
      section: rows[at].section,
      units: preset.units,
      repeat: preset.repeat,
      rowSpan: 1,
    },
    context,
  };
}
