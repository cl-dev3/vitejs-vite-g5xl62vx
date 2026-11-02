import { describe, expect, test } from 'vitest'
import { MIN_PX, pickSnap, snapHeights, tapSnap } from './useSheetSnap'

const VH = 800

describe('snapHeights', () => {
  test('最小・半分・全面の高さ', () => {
    const h = snapHeights(VH)
    expect(h.min).toBe(MIN_PX)
    expect(h.half).toBeCloseTo(416, 5)
    expect(h.full).toBe(VH)
  })
})

describe('pickSnap', () => {
  test('ゆっくり動かしたときは、いちばん近い状態に止まる（動かし始めの状態は関係ない）', () => {
    expect(pickSnap(300, 0, 'half', VH)).toBe('half')
    expect(pickSnap(700, 0, 'half', VH)).toBe('full')
    expect(pickSnap(100, 0, 'full', VH)).toBe('min')
    expect(pickSnap(60, 0.1, 'half', VH)).toBe('min')
    expect(pickSnap(790, -0.1, 'min', VH)).toBe('full')
  })

  test('はじいたときは、1段階だけ動く', () => {
    expect(pickSnap(420, -1, 'half', VH)).toBe('full') // 上へ
    expect(pickSnap(420, 1, 'half', VH)).toBe('min') // 下へ
    expect(pickSnap(100, -1, 'min', VH)).toBe('half')
    expect(pickSnap(700, 1, 'full', VH)).toBe('half')
  })

  test('いちばん上・下で、さらにはじいても、その状態のまま', () => {
    expect(pickSnap(800, -1, 'full', VH)).toBe('full')
    expect(pickSnap(64, 1, 'min', VH)).toBe('min')
  })
})

describe('tapSnap', () => {
  test('半分→全面、全面→半分、最小→半分', () => {
    expect(tapSnap('half')).toBe('full')
    expect(tapSnap('full')).toBe('half')
    expect(tapSnap('min')).toBe('half')
  })
})