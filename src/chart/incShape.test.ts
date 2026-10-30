import { describe, expect, test } from 'vitest'
import {
  incLegendSegments,
  incLocalSegments,
  transformSegments,
  type Pt,
  type Seg,
} from './incShape'

const mid = (s: Seg): Pt => [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2]

describe('細編み2目編み入れる（V＋中央に×1つ）', () => {
  test('腕は±45°。×は腕の先と同じ高さの中央', () => {
    const s = incLocalSegments('inc', 9)!
    expect(s).toHaveLength(4)
    expect(s[0]).toEqual([[0, 0], [-9, -9]])
    expect(s[1]).toEqual([[0, 0], [9, -9]])
    expect(mid(s[2])[0]).toBeCloseTo(0, 6)
    expect(mid(s[2])[1]).toBeCloseTo(-9, 6)
    expect(mid(s[3])[0]).toBeCloseTo(0, 6)
    expect(mid(s[3])[1]).toBeCloseTo(-9, 6)
  })

  test('頂点から2目の中心までが長くても、Vの深さは9まで', () => {
    const s = incLocalSegments('inc', 20)!
    expect(s[0][1]).toEqual([-9, -9])
  })
})

describe('中長編み・長編み 2目編み入れる（細いV＋水平な横棒）', () => {
  test('中長編み: 腕の先に、水平な横棒（腕の先が中央）', () => {
    const H = 9
    const Ht = H + 4.5
    const s = incLocalSegments('hdc_inc', H)!
    expect(s).toHaveLength(4)
    const tx = 0.38 * Ht
    expect(s[0][1][0]).toBeCloseTo(-tx, 6)
    expect(s[0][1][1]).toBeCloseTo(-Ht, 6)
    expect(s[1][1][0]).toBeCloseTo(tx, 6)
    // 横棒は水平で、腕の先を中心にしている
    for (const [bar, tip] of [
      [s[2], s[0][1]],
      [s[3], s[1][1]],
    ] as const) {
      expect(bar[0][1]).toBeCloseTo(bar[1][1], 6)
      expect(mid(bar)[0]).toBeCloseTo(tip[0], 6)
      expect(mid(bar)[1]).toBeCloseTo(tip[1], 6)
    }
  })

  test('長編み: 各腕に斜線。腕の途中（62%）にあり、左は「＼」、右は「／」の向き', () => {
    const s = incLocalSegments('dc_inc', 9)!
    expect(s).toHaveLength(6)
    const [armL, armR, , , tickL, tickR] = s
    for (const [arm, tick] of [
      [armL, tickL],
      [armR, tickR],
    ] as const) {
      const v = arm[1]
      const m = mid(tick)
      // 腕の上に乗っている
      expect(v[0] * m[1] - v[1] * m[0]).toBeCloseTo(0, 5)
      expect((m[0] * v[0] + m[1] * v[1]) / (v[0] * v[0] + v[1] * v[1])).toBeCloseTo(0.62, 5)
    }
    // 左右対称（x を反転すると一致する）
    const mirrored = tickR.map(([x, y]) => [-x, y]) as Seg
    const sorted = (seg: Seg) => [...seg].sort((a, b) => a[0] - b[0])
    expect(sorted(mirrored)[0][0]).toBeCloseTo(sorted(tickL)[0][0], 6)
    expect(sorted(mirrored)[0][1]).toBeCloseTo(sorted(tickL)[0][1], 6)
    expect(sorted(mirrored)[1][0]).toBeCloseTo(sorted(tickL)[1][0], 6)
    expect(sorted(mirrored)[1][1]).toBeCloseTo(sorted(tickL)[1][1], 6)
  })
})

describe('その他', () => {
  test('増し目でない種類は null', () => {
    expect(incLocalSegments('sc', 9)).toBeNull()
    expect(incLocalSegments('dec', 9)).toBeNull()
    expect(incLegendSegments('hdc')).toBeNull()
  })

  test('transformSegments: 90°回すと、上（-y）が右（+x）になる', () => {
    const out = transformSegments([[[0, 0], [0, -5]]], [10, 20], Math.PI / 2)
    expect(out[0][0]).toEqual([10, 20])
    expect(out[0][1][0]).toBeCloseTo(15, 6)
    expect(out[0][1][1]).toBeCloseTo(20, 6)
  })

  test('凡例の記号は、頂点が原点で、上へ伸びる', () => {
    for (const k of ['inc', 'hdc_inc', 'dc_inc'] as const) {
      const s = incLegendSegments(k)!
      const ys = s.flatMap((seg) => [seg[0][1], seg[1][1]])
      expect(Math.max(...ys)).toBeLessThanOrEqual(0)
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(-12.5)
    }
  })
})