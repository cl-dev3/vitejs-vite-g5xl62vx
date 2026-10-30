import { describe, expect, test } from 'vitest'
import { computeProject } from '../domain/compute'
import { createSampleProject } from '../domain/sample'
import type { Row, StitchKind } from '../domain/types'
import { DEFAULT_GEOMETRY_OPTIONS, buildGeometry } from './geometry'

const { W, DR_MIN, MARGIN } = DEFAULT_GEOMETRY_OPTIONS
const EXTRA_PAD = 5 // geometry.ts の EXTRA_PAD
const natural = (n: number) => (n * W) / (2 * Math.PI)

let seq = 0
const unit = (kind: StitchKind, count = 1) => ({ id: `u${seq++}`, kind, count })
const row = (
  kind: Row['kind'],
  units: Row['units'],
  repeat = 1,
  rowSpan = 1,
): Row => ({ id: `r${seq++}`, kind, section: 'crown', units, repeat, rowSpan })

const sample = createSampleProject().rows
const g = buildGeometry(sample)

describe('サンプル（頭頂6→36＋本体4段）', () => {
  test('rowSpan が展開され、各リングの目数が合う', () => {
    expect(g.rings.map((r) => r.count)).toEqual([6, 12, 18, 24, 30, 36, 36, 36, 36, 36])
    expect(g.rings.map((r) => r.label)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    ])
    for (const ring of g.rings) {
      expect(g.nodes.filter((n) => n.rowIndex === ring.rowIndex)).toHaveLength(ring.count)
    }
  })

  test('頭頂の半径は周長ベース、本体は最小ステップずつ外へ', () => {
    expect(g.rings[0].radius).toBeCloseTo(natural(6), 5)
    expect(g.rings[1].radius).toBeCloseTo(natural(12), 5)
    expect(g.rings[5].radius).toBeCloseTo(natural(36), 5)
    expect(g.rings[7].radius - g.rings[6].radius).toBeCloseTo(DR_MIN, 5)
  })

  test('半径は常に DR_MIN 以上ずつ増える', () => {
    for (let k = 1; k < g.rings.length; k++) {
      expect(g.rings[k].radius - g.rings[k - 1].radius).toBeGreaterThanOrEqual(DR_MIN - 1e-9)
    }
  })

  test('bounds は最大半径＋余白', () => {
    expect(g.bounds).toBeCloseTo(
      g.rings[g.rings.length - 1].radius + MARGIN + EXTRA_PAD,
      5,
    )
  })

  test('最初の目は12時から反時計回りに半目ぶんずれる', () => {
    const n = g.nodes[0]
    expect(n.angle).toBeCloseTo(-Math.PI / 2 - Math.PI / 6, 5)
    expect(n.x).toBeCloseTo(g.rings[0].radius * Math.cos(n.angle), 5)
    expect(n.y).toBeCloseTo(g.rings[0].radius * Math.sin(n.angle), 5)
    expect(n.x).toBeLessThan(0) // 12時の左側
  })

  test('輪の作り目にはリンクがなく、親子リンク数は親の数の合計', () => {
    expect(g.links.filter((l) => l.rowIndex === 0)).toHaveLength(0)
    const parents = g.nodes.reduce((a, n) => a + n.parentIdx.length, 0)
    expect(g.links).toHaveLength(parents)
  })

  test('各行の目数が computeProject の総目数と一致する', () => {
    const c = computeProject(sample)
    for (let i = 0; i < 6; i++) {
      expect(g.rings[i].count).toBe(c.rows[i].stitchesOut)
    }
  })
})

describe('増し目・減らし目・鎖編み', () => {
  test('増し目は同じ親から2目', () => {
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1.slice(0, 4).map((n) => n.parentIdx)).toEqual([[0], [0], [1], [1]])
  })

  test('減らし目は隣り合う2つの親を持つ', () => {
    const geo = buildGeometry([
      row('magic_ring', [unit('sc', 24)]),
      row('round', [unit('sc', 2), unit('dec')], 6),
    ])
    const ring1 = geo.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(18)
    expect(ring1[0].parentIdx).toEqual([0])
    expect(ring1[2].kind).toBe('dec')
    expect(ring1[2].parentIdx).toEqual([2, 3])
  })

  test('鎖編みは親を持たず、親ポインタも進めない', () => {
    const geo = buildGeometry([
      row('magic_ring', [unit('sc', 6)]),
      row('round', [unit('ch'), unit('sc', 6)]),
    ])
    const ring1 = geo.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1[0].parentIdx).toEqual([])
    expect(ring1[1].parentIdx).toEqual([0])
  })
})

describe('不正な入力でも壊れない', () => {
  test('目数がずれた段の親は前段の範囲内に丸められる', () => {
    const geo = buildGeometry([
      row('magic_ring', [unit('sc', 6)]),
      row('round', [unit('sc')], 12),
    ])
    const ring1 = geo.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(12)
    expect(ring1.every((n) => n.parentIdx.every((p) => p >= 0 && p < 6))).toBe(true)
  })

  test('空の配列・ユニットなしでも例外にならない', () => {
    expect(buildGeometry([]).rings).toHaveLength(0)
    expect(() => buildGeometry([row('magic_ring', [], 1)])).not.toThrow()
  })
})