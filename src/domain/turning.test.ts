import { describe, expect, test } from 'vitest'
import { fitRepeatToPrev, suggestedRepeat } from './turning'
import type { Row, StitchKind } from './types'

let seq = 0
const unit = (kind: StitchKind, count = 1) => ({ id: `u${seq++}`, kind, count })
const round = (
  units: Row['units'],
  repeat = 1,
  extra: Partial<Row> = {},
): Row => ({
  id: `r${seq++}`,
  kind: 'round',
  section: 'body',
  units,
  repeat,
  rowSpan: 1,
  ...extra,
})

describe('suggestedRepeat', () => {
  test('前段の目数 ÷ 1サイクルの消費', () => {
    expect(suggestedRepeat(round([unit('dc')]), 36)).toBe(36)
    expect(suggestedRepeat(round([unit('sc'), unit('inc')]), 36)).toBe(18)
  })

  test('立ち上がりがあっても、目数は変わらないので同じ', () => {
    expect(suggestedRepeat(round([unit('dc')], 1, { turning: { chains: 3 } }), 36)).toBe(36)
    expect(
      suggestedRepeat(round([unit('sc')], 1, { turning: { chains: 1, counted: false } }), 36),
    ).toBe(36)
  })

  test('割り切れない・範囲外・対象外は null', () => {
    expect(suggestedRepeat(round([unit('sc'), unit('inc')]), 35)).toBeNull()
    expect(suggestedRepeat(round([unit('sc')]), 0)).toBeNull()
    expect(suggestedRepeat(round([unit('sc')]), 200)).toBeNull() // 99超
    expect(suggestedRepeat(round([unit('ch')]), 36)).toBeNull() // 消費0
    expect(
      suggestedRepeat({ ...round([unit('sc', 6)]), kind: 'magic_ring' }, 36),
    ).toBeNull()
  })
})

describe('fitRepeatToPrev', () => {
  test('合わせられるときだけ繰り返し回数を変える', () => {
    const r = round([unit('dc')], 5)
    expect(fitRepeatToPrev(r, 36).repeat).toBe(36)
  })
  test('すでに合っている・合わせられないときは同じ行を返す', () => {
    const ok = round([unit('dc')], 36)
    expect(fitRepeatToPrev(ok, 36)).toBe(ok)
    const ng = round([unit('sc'), unit('inc')], 5)
    expect(fitRepeatToPrev(ng, 35)).toBe(ng)
  })
})