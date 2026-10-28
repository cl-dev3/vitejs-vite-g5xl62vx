import { describe, expect, test } from 'vitest';
import { computeProject } from '../domain/compute';
import {
  STORAGE_KEY,
  createMemoryStorage,
  createProjectStore,
} from './projectStore';

const make = () => createProjectStore(createMemoryStorage());

describe('サンプルデータ', () => {
  test('頭頂 6→36 と本体4段がすべて有効', () => {
    const c = computeProject(make().getState().project.rows);
    expect(c.rows.map((r) => r.stitchesOut)).toEqual([
      6, 12, 18, 24, 30, 36, 36,
    ]);
    expect(c.rows.every((r) => r.valid)).toBe(true);
    expect(c.totalRows).toBe(10);
    expect(c.maxStitchesOut).toBe(36);
  });
});

describe('段の操作', () => {
  test('末尾に追加すると前段と同じ目数の細編み段になる', () => {
    const s = make();
    const id = s.getState().addRow();
    const st = s.getState();
    expect(st.project.rows).toHaveLength(8);
    expect(st.project.rows[7].id).toBe(id);
    expect(st.selectedRowId).toBe(id);
    const c = computeProject(st.project.rows);
    expect(c.rows[7].valid).toBe(true);
    expect(c.rows[7].label).toBe('第11段');
  });

  test('指定段の後ろに追加できる', () => {
    const s = make();
    const afterId = s.getState().project.rows[1].id;
    const id = s.getState().addRow(afterId);
    const rows = s.getState().project.rows;
    expect(rows[2].id).toBe(id);
    expect(computeProject(rows).rows.every((r) => r.valid)).toBe(true);
  });

  test('全段を削除してから追加すると輪の作り目が入る', () => {
    const s = make();
    for (const r of [...s.getState().project.rows])
      s.getState().removeRow(r.id);
    expect(s.getState().project.rows).toHaveLength(0);
    s.getState().addRow();
    expect(s.getState().project.rows[0].kind).toBe('magic_ring');
  });

  test('更新・複製・並べ替え', () => {
    const s = make();
    const rows = s.getState().project.rows;
    s.getState().updateRow(rows[6].id, { ...rows[6], note: '色替え' });
    expect(s.getState().project.rows[6].note).toBe('色替え');

    s.getState().duplicateRow(rows[1].id);
    const after = s.getState().project.rows;
    expect(after[2].id).not.toBe(after[1].id);
    expect(after[2].repeat).toBe(after[1].repeat);

    const lastId = after[after.length - 1].id;
    s.getState().moveRow(lastId, 0);
    expect(s.getState().project.rows[0].id).toBe(lastId);
  });

  test('削除すると選択も外れる', () => {
    const s = make();
    const id = s.getState().project.rows[2].id;
    s.getState().selectRow(id);
    s.getState().removeRow(id);
    expect(s.getState().selectedRowId).toBeNull();
  });
});

describe('Undo / Redo', () => {
  test('追加→Undo→Redo', () => {
    const s = make();
    s.getState().addRow();
    expect(s.getState().project.rows).toHaveLength(8);
    s.getState().undo();
    expect(s.getState().project.rows).toHaveLength(7);
    expect(s.getState().future).toHaveLength(1);
    s.getState().redo();
    expect(s.getState().project.rows).toHaveLength(8);
  });

  test('新しい操作でRedo履歴が消える', () => {
    const s = make();
    s.getState().addRow();
    s.getState().undo();
    s.getState().addRow();
    expect(s.getState().future).toHaveLength(0);
  });

  test('履歴は最大50件', () => {
    const s = make();
    for (let i = 0; i < 60; i++) s.getState().addRow();
    expect(s.getState().past).toHaveLength(50);
  });
});

describe('保存', () => {
  test('変更が保存され、作り直したストアに復元される', () => {
    const mem = createMemoryStorage();
    const a = createProjectStore(mem);
    a.getState().addRow();
    const b = createProjectStore(mem);
    expect(b.getState().project.rows).toHaveLength(8);
    expect(b.getState().project.id).toBe(a.getState().project.id);
  });

  test('壊れた保存データは無視してサンプルで起動する', () => {
    const mem = createMemoryStorage();
    mem.setItem(
      STORAGE_KEY,
      '{"state":{"project":{"schemaVersion":99}},"version":1}'
    );
    const s = createProjectStore(mem);
    expect(s.getState().project.rows).toHaveLength(7);
  });
});
