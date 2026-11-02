import { describe, expect, test } from 'vitest'
import { createPart } from '../domain/parts'
import { createSampleProject } from '../domain/sample'
import { buildAttachMarkers } from './attachMarkers'
import { buildGeometry } from './geometry'

describe('buildAttachMarkers', () => {
  const project = createSampleProject()
  const row6 = project.rows[5]
  const withParts = {
    ...project,
    parts: [
      {
        ...createPart('耳'),
        quantity: 2,
        attachments: [
          { id: 'a1', rowId: row6.id, position: 1 },
          { id: 'a2', rowId: row6.id, position: 19 },
        ],
      },
      {
        ...createPart('ツバ'),
        attachments: [
          { id: 'a3', rowId: 'missing', position: 1 }, // 段がない
          { id: 'a4', rowId: row6.id, position: 99 }, // 範囲外
          { id: 'a5', rowId: row6.id, position: 36 },
        ],
      },
    ],
  }
  const g = buildGeometry(project.rows)
  const markers = buildAttachMarkers(withParts, g)

  test('有効な接続位置だけが、パーツの番号つきで出る', () => {
    expect(markers.map((m) => m.attachmentId)).toEqual(['a1', 'a2', 'a5'])
    expect(markers.map((m) => m.number)).toEqual([1, 1, 2])
    expect(markers.map((m) => m.label)).toEqual(['耳', '耳', 'ツバ'])
  })

  test('マーカーは、その目の外側（同じ向き）にある', () => {
    const ring = g.rings[5]
    const nodes = g.nodes.filter((n) => n.rowIndex === 5)
    for (const [m, pos] of [
      [markers[0], 1],
      [markers[1], 19],
      [markers[2], 36],
    ] as const) {
      const n = nodes[pos - 1]
      expect(Math.hypot(m.x, m.y)).toBeCloseTo(ring.radius + 8, 5)
      expect(Math.atan2(m.y, m.x)).toBeCloseTo(Math.atan2(n.y, n.x), 5)
    }
  })

  test('パーツがなければ、マーカーもない', () => {
    expect(buildAttachMarkers(project, g)).toEqual([])
  })
})