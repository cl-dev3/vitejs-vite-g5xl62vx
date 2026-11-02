import { describe, expect, test } from 'vitest'
import { migrateProject } from './migrate'
import { createPart } from './parts'
import { createSampleProject } from './sample'

describe('migrateProject', () => {
  test('v1（別パーツなし）は、parts: [] のv2になる', () => {
    const { parts: _parts, ...rest } = createSampleProject()
    const v1 = { ...rest, schemaVersion: 1 }
    const p = migrateProject(v1)!
    expect(p.schemaVersion).toBe(2)
    expect(p.parts).toEqual([])
    expect(p.rows).toHaveLength(7)
  })

  test('v2: パーツの個数・段・接続位置を、安全な形にそろえる', () => {
    const base = createSampleProject()
    const broken = { ...createPart('耳'), quantity: 0, rows: undefined, attachments: undefined }
    const p = migrateProject({ ...base, parts: [broken] })!
    expect(p.parts[0].quantity).toBe(1)
    expect(p.parts[0].rows).toEqual([])
    expect(p.parts[0].attachments).toEqual([])
  })

  test('読めないデータは null', () => {
    expect(migrateProject(null)).toBeNull()
    expect(migrateProject({ schemaVersion: 99 })).toBeNull()
    expect(migrateProject({ ...createSampleProject(), schemaVersion: 3 })).toBeNull()
    expect(migrateProject({ schemaVersion: 2, id: 'x', rows: [] })).toBeNull() // meta なし
  })
})