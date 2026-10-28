import { computeUnit } from './compute';
import { isTurningCounted } from './stitchTable';
import type { Row } from './types';

/**
 * 前段の目数に合わせるために必要な繰り返し回数。
 * 立ち上がりを1目に数える場合は、前段の1目ぶんをそちらが使うので、残りの目を割る。
 * 割り切れない・範囲外（1〜99以外）・対象外の段は null
 */
export function suggestedRepeat(row: Row, prevOut: number): number | null {
  if (row.kind !== 'round' || prevOut <= 0) return null;
  const cycleIn = row.units.reduce((a, u) => a + computeUnit(u).in, 0);
  if (cycleIn <= 0) return null;
  const counted = row.turning !== undefined && isTurningCounted(row.turning);
  const target = prevOut - (counted ? 1 : 0);
  if (target <= 0 || target % cycleIn !== 0) return null;
  const repeat = target / cycleIn;
  return repeat >= 1 && repeat <= 99 ? repeat : null;
}

/** 提案された繰り返し回数に合わせる（合わせられなければ、そのまま返す） */
export function fitRepeatToPrev(row: Row, prevOut: number): Row {
  const r = suggestedRepeat(row, prevOut);
  return r === null || r === row.repeat ? row : { ...row, repeat: r };
}
