import { describe, expect, test } from 'vitest'
import { createFoundationRow } from '../domain/presets'
import type { Row, StitchKind } from '../domain/types'
import { legendKinds } from '../pdf/patternInfo'
import { buildGeometry, type ChartGeometry } from './geometry'
import { stadiumPointCcw } from './stadium'

const SHIFT = 2.4 // geometry.ts の MARK_SHIFT
const OUT = 4.5 // geometry.ts の MARK_OUT

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

  test('1目に数える立ち上がり3目: 最初の目が○で、手前に2つ積む', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3 } }),
    ])
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1[0].kind).toBe('ch')
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

  test('数える立ち上がり＋引き抜き: ●は、最後の目と最初の目(○)のちょうど真ん中', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3, join: true } }),
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
      row('round', [unit('dc', 5)], 1, { turning: { chains: 3, join: true } }),
    ])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    const j = g.turnings[0].join!
    expect(ring1[0].x).toBeLessThan(j[0])
    expect(ring1[ring1.length - 1].x).toBeGreaterThan(j[0])
  })

  test('1目に数える立ち上がり1目: 鎖は最初の目だけ（積む○なし）。引き抜きだけ出る', () => {
    const g = buildGeometry([
      ring(),
      row('round', [unit('sc', 5)], 1, {
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

describe('鎖の作り目（楕円）の1段目の立ち上がり', () => {
  const W = 14
  const core = 8 * W
  const chainEnd = (9 / 2) * W // 鎖10目の右端（x=63）

  const oval = (turning?: Row['turning'], kind: 'sc' | 'hdc' | 'dc' = 'sc') =>
    buildGeometry([
      { ...createFoundationRow(10, 3, kind), ...(turning ? { turning } : {}) },
    ])
  /** 1周目のリングの、周の割合 frac の位置（out だけ外側） */
  const at = (g: ChartGeometry, frac: number, out = 0): [number, number] => {
    const R0 = g.rings[0].radius
    const P = 2 * core + 2 * Math.PI * R0
    const f = ((frac % 1) + 1) % 1
    const p = stadiumPointCcw(f * P, core, R0)
    return [p.x + out * Math.cos(p.angle), p.y + out * Math.sin(p.angle)]
  }

  test('1目に数える（鎖2目）: 立ち上がりが作り目の右端に立ち、1目目は右から2つ目の上のまま', () => {
    const g = oval({ chains: 2 }, 'hdc')
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    const plain = oval(undefined, 'hdc').nodes

    expect(ring0).toHaveLength(22)
    expect(ring0[0].kind).toBe('ch')
    // 立ち上がり: 作り目の右端（x≈63）のすぐ上
    expect(ring0[0].x).toBeCloseTo(chainEnd, 0)
    expect(ring0[0].y).toBeLessThan(0)
    // 最初の実際の目: 立ち上がりの有無でずれない（作り目の右から2つ目の真上）
    expect(ring0[1].kind).toBe('hdc')
    expect(ring0[1].x).toBeCloseTo(plain[0].x, 5)
    expect(ring0[1].y).toBeCloseTo(plain[0].y, 5)
    expect(ring0[1].x).toBeCloseTo((8 - 4.5) * W, 5)
    expect(ring0[1].y).toBeCloseTo(-g.rings[0].radius, 5)

    expect(g.turnings[0].points).toHaveLength(1)
    // 作り目の鎖との対応
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
    const dLast = Math.hypot(j[0] - last.x, j[1] - last.y)
    const dTurn = Math.hypot(j[0] - turn.x, j[1] - turn.y)
    expect(dLast).toBeCloseTo(dTurn, 5)
    expect(dLast).toBeGreaterThan(4)
  })

  test('数えない2目: 作り目の右端から、右端の少し外側へ向かって2つ積む', () => {
    const g = oval({ chains: 2, counted: false })
    const top = at(g, -0.5 / 22, OUT)
    const t = g.turnings[0]
    expect(t.points).toHaveLength(2)
    expect(t.points[1][0]).toBeCloseTo(top[0], 5)
    expect(t.points[1][1]).toBeCloseTo(top[1], 5)
    expect(t.points[0][0]).toBeCloseTo((chainEnd + top[0]) / 2, 5)
    expect(t.points[0][1]).toBeCloseTo(top[1] / 2, 5)
    // 作り目の右端に近い
    expect(Math.abs(t.points[1][0] - chainEnd)).toBeLessThan(6)
    // 1目目はずれない
    const plain = oval()
    expect(g.nodes[0].x).toBeCloseTo(plain.nodes[0].x, 6)
    expect(g.nodes[0].y).toBeCloseTo(plain.nodes[0].y, 6)
  })

  test('数えない＋引き抜き: ○は先（左）、●は手前（右）。最後の目とは重ならない', () => {
    const g = oval({ chains: 1, join: true })
    const R0 = g.rings[0].radius
    const P = 2 * core + 2 * Math.PI * R0
    const d = SHIFT / P
    const t = g.turnings[0]
    const top = at(g, -0.5 / 22 + d, OUT)
    const join = at(g, -0.5 / 22 - d, OUT)
    expect(t.points).toHaveLength(1)
    expect(t.points[0][0]).toBeCloseTo(top[0], 5)
    expect(t.points[0][1]).toBeCloseTo(top[1], 5)
    expect(t.join![0]).toBeCloseTo(join[0], 5)
    expect(t.join![1]).toBeCloseTo(join[1], 5)
    const ring0 = g.nodes.filter((n) => n.rowIndex === 0)
    const last = ring0[ring0.length - 1]
    for (const p of [t.points[0], t.join!]) {
      expect(Math.hypot(p[0] - last.x, p[1] - last.y)).toBeGreaterThan(4)
    }
  })

  test('2周目以降も、同じ向きにそろう（1目に数える立ち上がりのとき）', () => {
    const g = buildGeometry([
      { ...createFoundationRow(10, 3, 'hdc'), turning: { chains: 2 } },
      row('round', [unit('sc', 8), unit('inc', 3)], 2),
    ])
    const ring1 = g.nodes.filter((n) => n.rowIndex === 1)
    expect(ring1).toHaveLength(28)
    // 2つ目の目が、上辺の最初の位置（立ち上がりは右端、次の目から上辺）
    expect(ring1[1].y).toBeCloseTo(-g.rings[1].radius, 5)
    expect(g.rings.map((r) => r.count)).toEqual([22, 28])
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