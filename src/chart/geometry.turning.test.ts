import { describe, expect, test } from 'vitest'
import { createFoundationRow } from '../domain/presets'
import type { Row, StitchKind } from '../domain/types'
import { legendKinds } from '../pdf/patternInfo'
import { buildGeometry, type ChartGeometry } from './geometry'
import { stadiumPointCcw } from './stadium'

const SHIFT = 2.4 // geometry.ts の MARK_SHIFT

let seq = 0
const unit = (kind: StitchKind, count = 1) => ({ id: `u${seq++}`, kind, count })
const row = (
  kind: Row['kind'],
  units: Row['units'],
  repeat = 1,
  extra: Partial<Row> = {},
): Row => ({
  id: `r${seq++}`,
  kind,
  section: 'crown',
  units,
  repeat,
  rowSpan: 1,
  ...extra,
})
const ring = () => row('magic_ring', [unit('sc', 6)])

describe('立ち上がりの鎖と引き抜き編み（円）', () => {
  test('数えない立ち上がり1目＋引き抜き: ○は先（左）、●は手前（右）。1目目はずれない', () => {
    const rows = (turning?: Row['turning']) => [
      ring(),
      row('round', [unit('sc')], 6, turning ? { turning } : {}),
    ]
    const plain = buildGeometry(rows())
    const g = buildGeometry(rows({ chains: 1, join: true }))

    const a = plain.nodes.filter((n) => n.rowIndex === 1)
    const b = g.nodes.filter((n) => n.rowIndex === 1)
    expect(b).toHaveLength(6)
    b.forEach((n, i) => {
      expect(n.x).toBeCloseTo(a[i].x, 6)
      expect(n.y).toBeCloseTo(a[i].y, 6)
    })

    const t = g.turnings[0]
    const R1 = g.rings[1].radius
    const d = SHIFT / R1
    expect(t.points).toHaveLength(1)
    expect(t.points[0][0]).toBeCloseTo(R1 * Math.cos(-Math.PI / 2 - d), 5)
    expect(t.points[0][1]).toBeCloseTo(R1 * Math.sin(-Math.PI / 2 - d), 5)
    expect(t.join![0]).toBeCloseTo(R1 * Math.cos(-Math.PI / 2 + d), 5)
    expect(t.join![1]).toBeCloseTo(R1 * Math.sin(-Math.PI / 2 + d), 5)
    expect(t.points[0][0]).toBeLessThan(t.join![0])
    expect(
      Math.hypot(t.points[0][0] - t.join![0], t.points[0][1] - t.join![1]),
    ).toBeGreaterThan(4.4)
  })

  test('数えない立ち上がり3目（引き抜きなし）: 前段から次の段へ向かって、等間隔に3つ積む', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc')], 6, { turning: { chains: 3, counted: false } }),
    ])
    const t = g.turnings[0]
    const R0 = g.rings[0].radius
    const R1 = g.rings[1].radius
    expect(t.points).toHaveLength(3)
    t.points.forEach((p, i) => {
      expect(p[1]).toBeCloseTo(-R0 + (-R1 + R0) * ((i + 1) / 3), 5)
    })
    expect(t.join).toBeNull()
  })

  test('1目に数える立ち上がり3目: 最初の目が○に置き換わり、手前に2つ積む。目数は変わらない', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 6)], 1, { turning: { chains: 3 } }),
    ])
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(6)
    expect(ring1[0].kind).toBe('ch')
    expect(ring1.slice(1).every((n) => n.kind === 'dc')).toBe(true)
    const t = g.turnings[0]
    expect(t.points).toHaveLength(2)
    const base: [number, number] = [ring0[0].x, ring0[0].y]
    const top: [number, number] = [ring1[0].x, ring1[0].y]
    t.points.forEach((p, i) => {
      const f = (i + 1) / 3
      expect(p[0]).toBeCloseTo(base[0] + (top[0] - base[0]) * f, 5)
      expect(p[1]).toBeCloseTo(base[1] + (top[1] - base[1]) * f, 5)
    })
  })

  test('全目増し目＋立ち上がり1目に数える: 立ち上がり1＋細編み1＋増し目5（12目）', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('inc')], 6, { turning: { chains: 1, counted: true } }),
    ])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(12)
    expect(ring1[0].kind).toBe('ch')
    expect(ring1[1].kind).toBe('sc') // 最初の増し目の、残りの1目
    expect(ring1[1].glyph).toBe(false)
    expect(ring1.slice(2).every((n) => n.kind === 'inc')).toBe(true)
    expect(g.incGlyphs).toHaveLength(5) // 残りの増し目5組
    // 立ち上がりと細編みは、同じ親（前段の最初の目）
    expect(ring1[0].parentIdx).toEqual([0])
    expect(ring1[1].parentIdx).toEqual([0])
  })

  test('数える立ち上がり＋引き抜き: ●は、最後の目と最初の目(○)のちょうど真ん中', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 6)], 1, { turning: { chains: 3, join: true } }),
    ])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    const j = g.turnings[0].join!
    const last = ring1[ring1.length - 1]
    const firstNode = ring1[0]
    const dLast = Math.hypot(j[0] - last.x, j[1] - last.y)
    const dFirst = Math.hypot(j[0] - firstNode.x, j[1] - firstNode.y)
    expect(dLast).toBeCloseTo(dFirst, 5)
    expect(dLast).toBeGreaterThan(5)
    for (const p of g.turnings[0].points) {
      expect(Math.hypot(j[0] - p[0], j[1] - p[1])).toBeGreaterThan(5)
    }
  })

  test('反時計回りに読む: 最後の目（右）→ ●（12時）→ ○・最初の目（左）', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 6)], 1, { turning: { chains: 3, join: true } }),
    ])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    const j = g.turnings[0].join!
    expect(ring1[0].x).toBeLessThan(j[0])
    expect(ring1[ring1.length - 1].x).toBeGreaterThan(j[0])
  })

  test('1目に数える立ち上がり1目: 鎖は最初の目だけ（積む○なし）。引き抜きだけ出る', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc', 6)], 1, {
        turning: { chains: 1, counted: true, join: true },
      }),
    ])
    expect(g.turnings[0].points).toHaveLength(0)
    expect(g.turnings[0].join).not.toBeNull()
  })

  test('立ち上がりが無ければ何も出ない／rowSpan ごとに出る', () => {
    expect(buildGeometry([ring(), row('round', [unit('sc')], 6)]).turnings).toHaveLength(0)
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc')], 6, { turning: { chains: 1, join: true }, rowSpan: 2 }),
    ])
    expect(g.turnings.map((t) => t.rowIndex)).toEqual([1, 2])
  })
})

describe('楕円（鎖の作り目）の立ち上がり', () => {
  const W = 14
  const core = 8 * W
  const chainEnd = (9 / 2) * W // 鎖10目の右端（x=63）

  const oval = (turning?: Row['turning'], kind: 'sc' | 'hdc' | 'dc' = 'sc') =>
    buildGeometry([
      { ...createFoundationRow(10, 3, kind), ...(turning ? { turning } : {}) },
    ])
  /** 1周目のリングの、周の割合 frac の位置 */
  const at = (g: ChartGeometry, frac: number): [number, number] => {
    const R0 = g.rings[0].radius
    const P = 2 * core + 2 * Math.PI * R0
    const f = ((frac % 1) + 1) % 1
    const p = stadiumPointCcw(f * P, core, R0)
    return [p.x, p.y]
  }
  const dist = (a: [number, number], b: [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])

  test('1目目は作り目の右端の上。2目目から上辺。立ち上がりを付けても動かない', () => {
    for (const g of [
      oval(),
      oval({ chains: 1 }),
      oval({ chains: 1, join: true }),
      oval({ chains: 2, counted: false }),
    ]) {
      const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
      expect(ring0[0].x).toBeCloseTo(chainEnd, 0)
      expect(ring0[0].y).toBeLessThan(0)
      expect(ring0[1].x).toBeCloseTo((8 - 4.5) * W, 5)
      expect(ring0[1].y).toBeCloseTo(-g.rings[0].radius, 5)
    }
  })

  test('数えない（鎖1目）＋引き抜き: 1目目の右側に、○（左）・●（右）。円と同じ並び', () => {
    const g = oval({ chains: 1, join: true })
    const R0 = g.rings[0].radius
    const P = 2 * core + 2 * Math.PI * R0
    const d = SHIFT / P
    const f0 = -1 / 22
    const t = g.turnings[0]
    const top = at(g, f0 + d)
    const join = at(g, f0 - d)
    expect(t.points).toHaveLength(1)
    expect(t.points[0][0]).toBeCloseTo(top[0], 5)
    expect(t.points[0][1]).toBeCloseTo(top[1], 5)
    expect(t.join![0]).toBeCloseTo(join[0], 5)
    expect(t.join![1]).toBeCloseTo(join[1], 5)

    // 1目目の「右側」: 1目目から離れていて、1目目の上には乗らない
    const first = g.nodes.filter((n) => n.rowIndex === 0)[0]
    expect(dist(t.points[0], [first.x, first.y])).toBeGreaterThan(4)
    expect(dist(t.join!, [first.x, first.y])).toBeGreaterThan(8)
    // ○は●より1目目に近い（○→●の順に右へ離れる）
    expect(dist(t.points[0], [first.x, first.y])).toBeLessThan(
      dist(t.join!, [first.x, first.y]),
    )
  })

  test('数えない2目: 作り目の右端から、出発点（1目目の右側）へ向かって積む', () => {
    const g = oval({ chains: 2, counted: false })
    const top = at(g, -1 / 22)
    const t = g.turnings[0]
    expect(t.points).toHaveLength(2)
    expect(t.points[1][0]).toBeCloseTo(top[0], 5)
    expect(t.points[1][1]).toBeCloseTo(top[1], 5)
    expect(t.points[0][0]).toBeCloseTo((chainEnd + top[0]) / 2, 5)
    expect(t.points[0][1]).toBeCloseTo(top[1] / 2, 5)
  })

  test('1目に数える（鎖2目・中長編み）: 1目目が○（鎖）に置き換わり、2目目から中長編み', () => {
    const g = oval({ chains: 2 }, 'hdc')
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    expect(ring0).toHaveLength(22)
    expect(ring0[0].kind).toBe('ch')
    expect(ring0[0].x).toBeCloseTo(chainEnd, 0)
    expect(ring0[1].kind).toBe('hdc')
    expect(ring0[1].x).toBeCloseTo((8 - 4.5) * W, 5)
    expect(g.turnings[0].points).toHaveLength(1)
    expect(g.chain!.links[0].to[0]).toBeCloseTo(chainEnd, 6)
    expect(g.chain!.links[1].to[0]).toBeCloseTo((8 - 4.5) * W, 6)
  })

  test('1目に数える＋引き抜き: ●は、最後の目と立ち上がり(○)のちょうど真ん中', () => {
    const g = oval({ chains: 2, join: true }, 'hdc')
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    const j = g.turnings[0].join!
    const expected = at(g, -1 / 22)
    expect(j[0]).toBeCloseTo(expected[0], 5)
    expect(j[1]).toBeCloseTo(expected[1], 5)
    const last = ring0[ring0.length - 1]
    const turn = ring0[0]
    expect(dist(j, [last.x, last.y])).toBeCloseTo(dist(j, [turn.x, turn.y]), 5)
    expect(dist(j, [last.x, last.y])).toBeGreaterThan(4)
  })

  test('2段目以降も同じ並び: 1目目が右端の上、2目目から上辺', () => {
    const g = buildGeometry([
      createFoundationRow(10, 3),
      row('round', [unit('sc', 8), unit('inc', 3)], 2, {
        turning: { chains: 1, join: true },
      }),
    ])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(28)
    expect(ring1[0].x).toBeGreaterThan(core / 2) // 右端の円弧の上側
    expect(ring1[0].y).toBeLessThan(0)
    expect(ring1[1].y).toBeCloseTo(-g.rings[1].radius, 5) // 2目目から上辺
    // 立ち上がり・引き抜きは、1目目の右側（円と同じ並び）
    const t = g.turnings.find((x) => x.rowIndex === 1)!
    expect(t.points).toHaveLength(1)
    expect(dist(t.points[0], [ring1[0].x, ring1[0].y])).toBeGreaterThan(4)
    expect(t.points[0][0]).toBeGreaterThan(core / 2)
  })
})

describe('凡例', () => {
  test('立ち上がり＋引き抜きがあれば、鎖編みと引き抜き編みが入る', () => {
    const plain = legendKinds(
      buildGeometry([ring(), row('round', [unit('dc')], 6)]),
    )
    expect(plain).toEqual(['sc', 'dc'])

    const g = buildGeometry([
      ring(),
      row('round', [unit('dc')], 6, {
        turning: { chains: 3, counted: false, join: true },
      }),
    ])
    const kinds = legendKinds(g)
    expect(kinds).toContain('ch')
    expect(kinds).toContain('slst')
  })

  test('鎖の作り目があれば鎖編みが入る', () => {
    expect(legendKinds(buildGeometry([createFoundationRow(10, 3)]))).toContain('ch')
  })
})