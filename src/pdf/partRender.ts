import { buildGeometry, type ChartGeometry } from '../chart/geometry'
import { computeProject } from '../domain/compute'
import type { Part, Project, ProjectComputed } from '../domain/types'

export interface PartRender {
  part: Part
  number: number // 1始まり（タブ・マーカーの番号と同じ）
  computed: ProjectComputed
  geometry: ChartGeometry
}

/** 出力用に、各パーツの計算結果と座標を作る */
export function buildPartRenders(project: Project): PartRender[] {
  return project.parts.map((part, i) => ({
    part,
    number: i + 1,
    computed: computeProject(part.rows),
    geometry: buildGeometry(part.rows),
  }))
}