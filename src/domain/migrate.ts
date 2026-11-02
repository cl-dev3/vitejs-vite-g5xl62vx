import type { Part, Project } from './types'

export const CURRENT_SCHEMA = 2

/** 保存データのパーツを、安全な形にそろえる */
function normalizePart(raw: Part): Part {
  return {
    ...raw,
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'パーツ',
    quantity: Math.max(1, Math.round(Number(raw.quantity) || 1)),
    rows: Array.isArray(raw.rows) ? raw.rows : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
  }
}

/** 保存データを現行スキーマ（v2）として読む。読めなければ null */
export function migrateProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (typeof p.id !== 'string' || !p.meta || !Array.isArray(p.rows)) return null

  // v1: 別パーツなし。空のパーツ一覧を足す
  if (p.schemaVersion === 1) {
    return { ...(p as unknown as Project), schemaVersion: CURRENT_SCHEMA, parts: [] }
  }
  if (p.schemaVersion === CURRENT_SCHEMA) {
    const parts = Array.isArray(p.parts) ? (p.parts as Part[]).map(normalizePart) : []
    return { ...(p as unknown as Project), parts }
  }
  return null
}