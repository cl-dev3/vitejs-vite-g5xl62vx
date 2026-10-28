import { nanoid } from 'nanoid';
import { createStore, useStore } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import { computeProject } from '../domain/compute';
import { migrateProject } from '../domain/migrate';
import { allSc, copyRow } from '../domain/presets';
import { createSampleProject } from '../domain/sample';
import type { Project, ProjectMeta, Row } from '../domain/types';

export const STORAGE_KEY = 'hatchart:v1:project:current';
const HISTORY_MAX = 50;

export interface ProjectState {
  project: Project;
  selectedRowId: string | null;
  past: Project[]; // Undo用スナップショット（最大50）
  future: Project[]; // Redo用
  selectRow(id: string | null): void;
  addRow(afterId?: string, draft?: Partial<Row>): string;
  updateRow(id: string, row: Row): void;
  removeRow(id: string): void;
  moveRow(id: string, toIndex: number): void;
  duplicateRow(id: string): void;
  updateMeta(patch: Partial<ProjectMeta>): void;
  applyGaugeRecalc(next: Project): void;
  undo(): void;
  redo(): void;
  resetToSample(): void;
}

/** テスト用・localStorage が無い環境用のメモリ保存先 */
export function createMemoryStorage(): StateStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function defaultStorage(): StateStorage {
  return typeof localStorage !== 'undefined'
    ? localStorage
    : createMemoryStorage();
}

export function createProjectStore(storage: StateStorage = defaultStorage()) {
  return createStore<ProjectState>()(
    persist(
      (set, get) => {
        /** 変更を確定する: 履歴に積み、Redoを消し、更新日時を付ける */
        const commit = (next: Project) => {
          const { project, past } = get();
          set({
            project: { ...next, updatedAt: new Date().toISOString() },
            past: [...past, project].slice(-HISTORY_MAX),
            future: [],
          });
        };
        const commitRows = (rows: Row[]) => commit({ ...get().project, rows });
        /** 選択中の段が無くなっていたら解除する */
        const fixSelection = () => {
          const { selectedRowId, project } = get();
          if (
            selectedRowId &&
            !project.rows.some((r) => r.id === selectedRowId)
          ) {
            set({ selectedRowId: null });
          }
        };

        return {
          project: createSampleProject(),
          selectedRowId: null,
          past: [],
          future: [],

          selectRow: (id) => set({ selectedRowId: id }),

          addRow: (afterId, draft) => {
            const rows = get().project.rows;
            let base: Row;
            let insertAt: number;

            if (rows.length === 0) {
              base = {
                id: nanoid(),
                kind: 'magic_ring',
                section: 'crown',
                units: [{ id: nanoid(), kind: 'sc', count: 6 }],
                repeat: 1,
                rowSpan: 1,
              };
              insertAt = 0;
            } else {
              let at = afterId ? rows.findIndex((r) => r.id === afterId) : -1;
              if (at < 0) at = rows.length - 1;
              const prevOut = computeProject(rows).rows[at].stitchesOut;
              const preset = allSc(prevOut) ?? {
                units: [{ id: nanoid(), kind: 'sc' as const, count: 1 }],
                repeat: 1,
              };
              base = {
                id: nanoid(),
                kind: 'round',
                section: rows[at].section,
                units: preset.units,
                repeat: preset.repeat,
                rowSpan: 1,
              };
              insertAt = at + 1;
            }

            const row: Row = { ...base, ...draft, id: base.id };
            const next = [...rows];
            next.splice(insertAt, 0, row);
            commitRows(next);
            set({ selectedRowId: row.id });
            return row.id;
          },

          updateRow: (id, row) =>
            commitRows(
              get().project.rows.map((r) => (r.id === id ? { ...row, id } : r))
            ),

          removeRow: (id) => {
            commitRows(get().project.rows.filter((r) => r.id !== id));
            fixSelection();
          },

          moveRow: (id, toIndex) => {
            const rows = [...get().project.rows];
            const from = rows.findIndex((r) => r.id === id);
            if (from < 0) return;
            const [row] = rows.splice(from, 1);
            const to = Math.max(0, Math.min(toIndex, rows.length));
            rows.splice(to, 0, row);
            commitRows(rows);
          },

          duplicateRow: (id) => {
            const rows = [...get().project.rows];
            const i = rows.findIndex((r) => r.id === id);
            if (i < 0) return;
            const dup = copyRow(rows[i]);
            rows.splice(i + 1, 0, dup);
            commitRows(rows);
            set({ selectedRowId: dup.id });
          },

          updateMeta: (patch) => {
            const p = get().project;
            commit({ ...p, meta: { ...p.meta, ...patch } });
          },

          applyGaugeRecalc: (next) => {
            commit(next);
            fixSelection();
          },

          undo: () => {
            const { past, project, future } = get();
            if (past.length === 0) return;
            set({
              project: past[past.length - 1],
              past: past.slice(0, -1),
              future: [project, ...future],
            });
            fixSelection();
          },

          redo: () => {
            const { past, project, future } = get();
            if (future.length === 0) return;
            set({
              project: future[0],
              past: [...past, project].slice(-HISTORY_MAX),
              future: future.slice(1),
            });
            fixSelection();
          },

          resetToSample: () => {
            commit(createSampleProject());
            set({ selectedRowId: null });
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        // 履歴や選択状態は保存せず、プロジェクト本体だけ保存する
        partialize: (s) => ({ project: s.project }),
        // 読み込んだデータが壊れていたらサンプルのまま起動する
        merge: (persisted, current) => {
          const p = migrateProject(
            (persisted as { project?: unknown } | undefined)?.project
          );
          return p ? { ...current, project: p } : current;
        },
      }
    )
  );
}

export const projectStore = createProjectStore();

export function useProjectStore<T>(selector: (s: ProjectState) => T): T {
  return useStore(projectStore, selector);
}
