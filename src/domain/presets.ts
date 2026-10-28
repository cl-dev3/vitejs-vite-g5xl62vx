import { nanoid } from 'nanoid';
import { INC_BASE, INC_OF, STANDARD_TURNING } from './stitchTable';
import type { Row, StitchKind, Turning, Unit } from './types';

export type PresetResult = Pick<Row, 'units' | 'repeat'>;
export type BaseKind = 'sc' | 'hdc' | 'dc';

const u = (kind: StitchKind, count = 1): Unit => ({
  id: nanoid(),
  kind,
  count,
});

/** 繰り返し回数の範囲チェック（1..99）。範囲外・不正は false */
function ok(repeat: number): boolean {
  return Number.isInteger(repeat) && repeat >= 1 && repeat <= 99;
}

/** 全目増し目: [増し目×1] × prevOut（base で細編み／中長編み／長編みを選ぶ） */
export function allInc(
  prevOut: number,
  base: BaseKind = 'sc'
): PresetResult | null {
  return ok(prevOut) ? { units: [u(INC_OF[base])], repeat: prevOut } : null;
}

/** 全目に同じ編み目: [kind×1] × prevOut */
export function allStitch(
  prevOut: number,
  kind: BaseKind = 'sc'
): PresetResult | null {
  return ok(prevOut) ? { units: [u(kind)], repeat: prevOut } : null;
}

/** 全目細編み */
export function allSc(prevOut: number): PresetResult | null {
  return allStitch(prevOut, 'sc');
}

/** 標準の増し段: [base×k, 増し目] × U（k = prevOut÷U − 1） */
export function standardInc(
  prevOut: number,
  U: number,
  base: BaseKind = 'sc'
): PresetResult | null {
  if (U < 1 || prevOut < U || prevOut % U !== 0 || !ok(U)) return null;
  const k = prevOut / U - 1;
  const inc = INC_OF[base];
  const units = k > 0 ? [u(base, k), u(inc)] : [u(inc)];
  return { units, repeat: U };
}

/** 標準の減らし段: [sc×k, dec] × U（k = prevOut÷U − 2） */
export function standardDec(prevOut: number, U: number): PresetResult | null {
  if (U < 1 || prevOut % U !== 0 || !ok(U)) return null;
  const k = prevOut / U - 2;
  if (k < 0) return null;
  const units = k > 0 ? [u('sc', k), u('dec')] : [u('dec')];
  return { units, repeat: U };
}

/** 前段をコピー（IDは新しく発行する） */
export function copyRow(row: Row): Row {
  return {
    ...row,
    id: nanoid(),
    units: row.units.map((x) => ({ ...x, id: nanoid() })),
  };
}

/** 鎖の作り目（楕円スタート）の段を作る */
export function createFoundationRow(
  chains = 10,
  endStitches = 3,
  kind: BaseKind = 'sc'
): Row {
  return {
    id: nanoid(),
    kind: 'chain_foundation',
    section: 'crown',
    units: [u(kind)],
    repeat: 1,
    rowSpan: 1,
    foundation: { chains, endStitches },
  };
}

/**
 * 段の先頭の編み目から、標準の立ち上がりを決める。
 * 細編み系→鎖1目、中長編み系→鎖2目、長編み系→鎖3目。それ以外（減らし目・鎖・引き抜きなど）は undefined
 */
export function standardTurning(row: Row): Turning | undefined {
  const first = row.units[0]?.kind;
  if (!first) return undefined;
  const base = INC_BASE[first] ?? first;
  if (base === 'sc' || base === 'hdc' || base === 'dc') {
    return { chains: STANDARD_TURNING[base] };
  }
  return undefined;
}
