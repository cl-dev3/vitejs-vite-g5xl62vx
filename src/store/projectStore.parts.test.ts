import { describe, expect, test } from 'vitest'
import { MAIN_PART } from '../domain/parts'
import { createSampleProject } from '../domain/sample'
import {
  STORAGE_KEY,
  createMemoryStorage,
  createProjectStore,
} from './projectStore'

const make = () => createProjectStore(createMemoryStorage())

describe('パーツの追加・切り替え', () => {
  test('追加すると、そのパーツが選ばれ、段の操作はそのパーツに対して行われる', () => {
    const s = make()
    const id = s.getState().addPart('耳')
    expect(s.getState().activePartId).toBe(id)
    expect(s.getState().project.parts).toHaveLength(1)
    expect(s.getState().project.parts[0]).toMatchObject({ name: '耳', quantity: 1 })

    s.getState().addRow() // 空なので、輪の作り目が入る
    expect(s.getState().project.parts[0].rows).toHaveLength(1)
    expect(s.getState().project.parts[0].rows[0].kind).toBe('magic_ring')
    expect(s.getState().project.rows).toHaveLength(7) // 本体は変わらない

    s.getState().setActivePart(MAIN_PART)
    s.getState().addRow()
    expect(s.getState().project.rows).toHaveLength(8)
    expect(s.getState().project.parts[0].rows).toHaveLength(1)
  })

  test('名前を省略すると「パーツN」になる', () => {
    const s = make()
    s.getState().addPart()
    s.getState().addPart()
    expect(s.getState().project.parts.map((p) => p.name)).toEqual(['パーツ1', 'パーツ2'])
  })

  test('存在しないパーツへは切り替えない。切り替えると選択が外れる', () => {
    const s = make()
    const id = s.getState().addPart('耳')
    s.getState().selectRow('x')
    s.getState().setActivePart('nothing')
    expect(s.getState().activePartId).toBe(id)
    s.getState().setActivePart(MAIN_PART)
    expect(s.getState().selectedRowId).toBeNull()
  })
})

describe('パーツの更新・削除・Undo', () => {
  test('updatePart: 名前・個数・接続位置を更新する', () => {
    const s = make()
    const id = s.getState().addPart('耳')
    const rowId = s.getState().project.rows[5].id
    s.getState().updatePart(id, {
      name: 'くまの耳',
      quantity: 2,
      attachments: [{ id: 'a', rowId, position: 3 }],
      note: '縫い付ける',
    })
    expect(s.getState().project.parts[0]).toMatchObject({
      name: 'くまの耳',
      quantity: 2,
      note: '縫い付ける',
    })
    expect(s.getState().project.parts[0].attachments).toHaveLength(1)
  })

  test('選択中のパーツを削除すると、本体に戻る', () => {
    const s = make()
    const id = s.getState().addPart('耳')
    s.getState().removePart(id)
    expect(s.getState().project.parts).toHaveLength(0)
    expect(s.getState().activePartId).toBe(MAIN_PART)
  })

  test('追加をUndoすると、パーツが消えて、本体に戻る', () => {
    const s = make()
    s.getState().addPart('耳')
    s.getState().undo()
    expect(s.getState().project.parts).toHaveLength(0)
    expect(s.getState().activePartId).toBe(MAIN_PART)
    s.getState().redo()
    expect(s.getState().project.parts).toHaveLength(1)
  })
})

describe('保存と、旧データの読み込み', () => {
  test('パーツは保存され、作り直したストアに復元される', () => {
    const mem = createMemoryStorage()
    const a = createProjectStore(mem)
    const id = a.getState().addPart('耳')
    a.getState().addRow()
    const b = createProjectStore(mem)
    expect(b.getState().project.parts).toHaveLength(1)
    expect(b.getState().project.parts[0].id).toBe(id)
    expect(b.getState().project.parts[0].rows).toHaveLength(1)
    expect(b.getState().activePartId).toBe(MAIN_PART) // 選択は保存しない
  })

  test('旧データ（v1）は、自動でv2になって読み込まれる', () => {
    const mem = createMemoryStorage()
    const { parts: _parts, ...rest } = createSampleProject()
    mem.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { project: { ...rest, schemaVersion: 1 } }, version: 1 }),
    )
    const s = createProjectStore(mem)
    expect(s.getState().project.schemaVersion).toBe(2)
    expect(s.getState().project.parts).toEqual([])
    expect(s.getState().project.rows).toHaveLength(7)
  })
})