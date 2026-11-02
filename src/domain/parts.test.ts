import { describe, expect, test } from 'vitest'
import {
  MAIN_PART,
  attachmentLabel,
  checkAttachments,
  createPart,
  hasPart,
  rowsOf,
  withRows,
} from './parts'
import { createSampleProject } from './sample'

describe('rowsOf / withRows', () => {
  test('本体は project.rows、パーツは part.rows', () => {
    const p = createSampleProject()
    const part = createPart('耳')
    const q = { ...p, parts: [part] }
    expect(rowsOf(q, MAIN_PART)).toBe(q.rows)
    expect(rowsOf(q, part.id)).toBe(part.rows)
    expect(hasPart(q, part.id)).toBe(true)
    expect(hasPart(q, 'x')).toBe(false)
  })

  test('withRows は対象だけを置き換え、他は変えない', () => {
    const p = createSampleProject()
    const a = createPart('耳')
    const b = createPart('ツバ')
    const q = { ...p, parts: [a, b] }
    const rows = p.rows.slice(0, 2)

    const main = withRows(q, MAIN_PART, rows)
    expect(main.rows).toBe(rows)
    expect(main.parts).toBe(q.parts)

    const part = withRows(q, a.id, rows)
    expect(part.rows).toBe(q.rows)
    expect(part.parts[0].rows).toBe(rows)
    expect(part.parts[1]).toBe(b)
  })
})

describe('接続位置', () => {
  const base = () => {
    const p = createSampleProject()
    return { project: p, row6: p.rows[5], body: p.rows[6] }
  }

  test('attachmentLabel', () => {
    const { project, row6, body } = base()
    expect(attachmentLabel(project, { id: 'a', rowId: row6.id, position: 7 })).toBe(
      '第6段の7目め',
    )
    expect(attachmentLabel(project, { id: 'a', rowId: body.id, position: 1 })).toBe(
      '第7〜10段の1目め',
    )
    expect(attachmentLabel(project, { id: 'a', rowId: 'none', position: 1 })).toBe(
      '（段が見つかりません）',
    )
  })

  test('checkAttachments: 正しければ空。段が無い・位置が範囲外なら指摘する', () => {
    const { project, row6 } = base()
    const part = {
      ...createPart('耳'),
      attachments: [
        { id: 'ok', rowId: row6.id, position: 36 },
        { id: 'over', rowId: row6.id, position: 37 },
        { id: 'zero', rowId: row6.id, position: 0 },
        { id: 'gone', rowId: 'none', position: 1 },
      ],
    }
    const issues = checkAttachments({ ...project, parts: [part] })
    expect(issues.map((i) => i.attachmentId)).toEqual(['over', 'zero', 'gone'])
    expect(issues[0].message).toContain('36目')
    expect(issues[2].message).toBe('接続先の段がありません')
    expect(checkAttachments(project)).toEqual([])
  })
})