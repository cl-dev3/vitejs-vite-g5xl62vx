import { computeUnit } from './compute'
import type { Row } from './types'

/**
 * 前段の目数に合わせるために必要な繰り返し回数（前段の目数 ÷ 1サイクルの消費目数）。
 * 割り切れない・範囲外（1〜99以外）・対象外の段は null。
 * 立ち上がりを数えても、目数は変わらないので、計算は同じ
 */
export function suggestedRepeat(row: Row, prevOut: number): number | null {
  if (row.kind !== 'round' || prevOut <= 0) return null
  const cycleIn = row.units.reduce((a, u) => a + computeUnit(u).in, 0)
  if (cycleIn <= 0 || prevOut % cycleIn !== 0) return null
  const repeat = prevOut / cycleIn
  return repeat >= 1 && repeat <= 99 ? repeat : null
}

/** 提案された繰り返し回数に合わせる（合わせられなければ、そのまま返す） */
export function fitRepeatToPrev(row: Row, prevOut: number): Row {
  const r = suggestedRepeat(row, prevOut)
  return r === null || r === row.repeat ? row : { ...row, repeat: r }
}