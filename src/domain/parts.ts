import { nanoid } from 'nanoid'
import { computeProject } from './compute'
import type { Attachment, Part, Project, Row } from './types'

/** 本体を指す、アクティブなパーツのID */
export const MAIN_PART = 'main'

export function hasPart(project: Project, id: string): boolean {
  return project.parts.some((p) => p.id === id)
}

/** 本体（MAIN_PART）またはパーツの段 */
export function rowsOf(project: Project, partId: string): Row[] {
  if (partId === MAIN_PART) return project.rows
  return project.parts.find((p) => p.id === partId)?.rows ?? project.rows
}

/** 本体またはパーツの段を置き換えた、新しいプロジェクト */
export function withRows(project: Project, partId: string, rows: Row[]): Project {
  if (partId === MAIN_PART) return { ...project, rows }
  return {
    ...project,
    parts: project.parts.map((p) => (p.id === partId ? { ...p, rows } : p)),
  }
}

export function createPart(name: string): Part {
  return { id: nanoid(), name, quantity: 1, rows: [], attachments: [] }
}

/** 接続位置の表示（例: 「第6段の7目め」） */
export function attachmentLabel(project: Project, a: Attachment): string {
  const row = computeProject(project.rows).rows.find((r) => r.rowId === a.rowId)
  if (!row) return '（段が見つかりません）'
  return `${row.label}の${a.position}目め`
}

export interface AttachmentIssue {
  partId: string
  attachmentId: string
  message: string
}

/** 接続位置の確認: 本体の段が無い、位置が段の目数を超えている、など */
export function checkAttachments(project: Project): AttachmentIssue[] {
  const rows = computeProject(project.rows).rows
  const issues: AttachmentIssue[] = []
  for (const part of project.parts) {
    for (const a of part.attachments) {
      const row = rows.find((r) => r.rowId === a.rowId)
      if (!row) {
        issues.push({ partId: part.id, attachmentId: a.id, message: '接続先の段がありません' })
      } else if (!Number.isInteger(a.position) || a.position < 1 || a.position > row.stitchesOut) {
        issues.push({
          partId: part.id,
          attachmentId: a.id,
          message: `位置が、段の目数（${row.stitchesOut}目）の範囲外です`,
        })
      }
    }
  }
  return issues
}