import type { Project } from '../domain/types'
import type { ChartGeometry } from './geometry'

/** マーカーを、目の外側へずらす距離 */
const MARKER_OUT = 8

export interface AttachMarker {
  partId: string
  attachmentId: string
  number: number // パーツの番号（タブの番号と同じ。1始まり）
  label: string // パーツの名前
  x: number
  y: number
}

/**
 * 本体のチャート（geometry）の上に出す、別パーツの接続マーカー。
 * 接続先の段が無い、位置が範囲外のものは出さない
 */
export function buildAttachMarkers(
  project: Project,
  geometry: ChartGeometry,
): AttachMarker[] {
  const out: AttachMarker[] = []
  project.parts.forEach((part, pi) => {
    for (const a of part.attachments) {
      const ring = geometry.rings.find((r) => r.rowId === a.rowId) // rowSpan があれば最初の段
      if (!ring) continue
      const nodes = geometry.nodes.filter((n) => n.rowIndex === ring.rowIndex)
      if (!Number.isInteger(a.position) || a.position < 1 || a.position > nodes.length) continue
      const n = nodes[a.position - 1]
      out.push({
        partId: part.id,
        attachmentId: a.id,
        number: pi + 1,
        label: part.name,
        x: n.x + MARKER_OUT * Math.cos(n.angle),
        y: n.y + MARKER_OUT * Math.sin(n.angle),
      })
    }
  })
  return out
}