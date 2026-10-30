import { describe, expect, test } from 'vitest'
import type { Row, StitchKind } from '../domain/types'
import { buildGeometry } from './geometry'

let seq = 0
const unit = (kind: StitchKind, count = 1) => ({ id: `u${seq++}`, kind, count })
const row = (kind: Row['kind'], units: Row['units'], repeat = 1): Row => ({
  id: `r${seq++}`,
  kind,
  section: 'crown',
  units,
  repeat,
  rowSpan: 1,
})
const ring = () => row('magic_ring', [unit('sc', 6)])

describe('増し目は、2目で1つのV記号', () => {
  for (const [kind, segCount] of [
    ['inc', 4],
    ['hdc_inc', 4],
    ['dc_inc', 6],
  ] as const) {
    test(`${kind}: 頂点は親の先端。Vは外側へ開き、左右対称`, () => {
      const g = buildGeometry([ring(), row('round', [unit(kind)], 6)])
      const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
      const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
      expect(ring1).toHaveLength(12)

      // 2目に1つ
      expect(g.incGlyphs).toHaveLength(6)
      expect(
        g.incGlyphs.every(
          (x) => x.rowIndex === 1 && x.kind === kind && x.segments.length === segCount,
        ),
      ).toBe(true)
      expect(ring1.every((n) => n.glyph)).toBe(true)
      expect(ring0.every((n) => !n.glyph)).toBe(true)

      const parent = ring0[0]
      const apex = [
        parent.x + 3 * Math.cos(parent.angle),
        parent.y + 3 * Math.sin(parent.angle),
      ]
      const [armL, armR] = g.incGlyphs[0].segments
      for (const arm of [armL, armR]) {
        expect(arm[0][0]).toBeCloseTo(apex[0], 5)
        expect(arm[0][1]).toBeCloseTo(apex[1], 5)
        // 先端は、頂点より外側（中心から遠い）
        expect(Math.hypot(arm[1][0], arm[1][1])).toBeGreaterThan(Math.hypot(apex[0], apex[1]))
      }
      expect(Math.hypot(armL[1][0] - apex[0], armL[1][1] - apex[1])).toBeCloseTo(
        Math.hypot(armR[1][0] - apex[0], armR[1][1] - apex[1]),
        5,
      )
    })
  }

  test('細編み: ×は、2つの腕の先の真ん中', () => {
    const g = buildGeometry([ring(), row('round', [unit('inc')], 6)])
    const s = g.incGlyphs[0].segments
    const tipMid = [(s[0][1][0] + s[1][1][0]) / 2, (s[0][1][1] + s[1][1][1]) / 2]
    for (const x of [s[2], s[3]]) {
      expect((x[0][0] + x[1][0]) / 2).toBeCloseTo(tipMid[0], 5)
      expect((x[0][1] + x[1][1]) / 2).toBeCloseTo(tipMid[1], 5)
    }
  })

  test('中長編み・長編み: 横棒は、軸（Vの中心線）に垂直で、腕の先が中央', () => {
    for (const kind of ['hdc_inc', 'dc_inc'] as const) {
      const g = buildGeometry([ring(), row('round', [unit(kind)], 6)])
      const s = g.incGlyphs[0].segments
      const apex = s[0][0]
      const tipL = s[0][1]
      const tipR = s[1][1]
      const axis = [(tipL[0] + tipR[0]) / 2 - apex[0], (tipL[1] + tipR[1]) / 2 - apex[1]]
      const len = Math.hypot(axis[0], axis[1])
      for (const [bar, tip] of [
        [s[2], tipL],
        [s[3], tipR],
      ] as const) {
        const bx = bar[1][0] - bar[0][0]
        const by = bar[1][1] - bar[0][1]
        expect((bx * axis[0] + by * axis[1]) / (Math.hypot(bx, by) * len)).toBeCloseTo(0, 5)
        expect((bar[0][0] + bar[1][0]) / 2).toBeCloseTo(tip[0], 5)
        expect((bar[0][1] + bar[1][1]) / 2).toBeCloseTo(tip[1], 5)
      }
    }
  })

  test('増し目の子の細い線は、inc として区別される', () => {
    const g = buildGeometry([ring(), row('round', [unit('inc')], 6)])
    expect(g.links.filter((l) => l.rowIndex === 1).every((l) => l.inc)).toBe(true)
    expect(g.links.filter((l) => l.rowIndex === 0)).toHaveLength(0)
  })

  test('増し目と細編みが混ざる段: 増し目の組ごとに1つ。細編みは1目ずつ', () => {
    const g = buildGeometry([ring(), row('round', [unit('sc'), unit('inc')], 3)])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(9)
    expect(g.incGlyphs).toHaveLength(3)
    expect(ring1.filter((n) => n.kind === 'sc').every((n) => !n.glyph)).toBe(true)
    expect(ring1.filter((n) => n.kind === 'inc').every((n) => n.glyph)).toBe(true)
    const l1 = g.links.filter((l) => l.rowIndex === 1)
    expect(l1.filter((l) => l.inc)).toHaveLength(6)
    expect(l1.filter((l) => !l.inc)).toHaveLength(3)
  })

  test('親がない増し目（輪の作り目の中）は、V記号なし。1目ずつ左右に開く', () => {
    const g = buildGeometry([row('magic_ring', [unit('inc', 3)])])
    const n = g.nodes.filter((x) => x.rowIndex === 0)
    expect(n).toHaveLength(6)
    expect(g.incGlyphs).toHaveLength(0)
    expect(n.every((x) => !x.glyph)).toBe(true)
    expect(n[0].tilt).toBeGreaterThan(0)
    expect(n[1].tilt).toBeLessThan(0)
  })
})