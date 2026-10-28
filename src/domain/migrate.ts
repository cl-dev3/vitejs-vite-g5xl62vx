import type { Project } from './types';

export const CURRENT_SCHEMA = 1;

/** 保存データを現行スキーマとして読めるか確認する。読めなければ null */
export function migrateProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Project>;
  if (
    p.schemaVersion !== CURRENT_SCHEMA ||
    typeof p.id !== 'string' ||
    !p.meta ||
    !Array.isArray(p.rows)
  ) {
    return null;
  }
  return p as Project;
}
