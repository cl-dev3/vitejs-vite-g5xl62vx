import { describe, expect, test } from 'vitest';
import { createMemoryStorage, createProjectStore } from '../store/projectStore';
import { computeProject } from './compute';
import { currentBodyHeightCm, recalcForGauge } from './gauge';
import { hookOptions } from './hooks';
import { createSampleProject } from './sample';
import type { Project, Row } from './types';

const G20 = { stitchesPer10cm: 20, rowsPer10cm: 22 };

/** 頭囲18cm・高さ4cm・20目×22段の標準形サンプル */
const base = (): Project => {
  const p = createSampleProject();
  return {
    ...p,
    meta: { ...p.meta, target: { headCircumferenceCm: 18, bodyHeightCm: 4 } },
  };
};
const outs = (p: Project) =>
  computeProject(p.rows).rows.map((r) => r.stitchesOut);

describe('標準形のサンプルを再計算', () => {
  test('同じゲージ: 頭頂6→36を作り直し、本体は高さ4cmぶん（9段）', () => {
    const p = base();
    const r = recalcForGauge(p, G20);
    expect(outs(r.next)).toEqual([6, 12, 18, 24, 30, 36, 36]);
    expect(r.next.rows[6].rowSpan).toBe(9);
    expect(r.before.totalRows).toBe(10);
    expect(r.after.totalRows).toBe(15);
    expect(r.after.circumferenceCm).toBeCloseTo(18, 6);
    expect(r.after.invalidRows).toBe(0);
    expect(r.targetStitches).toBe(36);
    expect(r.warnings).toEqual([]);
  });

  test('既存の段のIDは引き継がれる', () => {
    const p = base();
    const r = recalcForGauge(p, G20);
    expect(r.next.rows[0].id).toBe(p.rows[0].id);
    expect(r.next.rows[5].id).toBe(p.rows[5].id);
    expect(r.next.rows[6].id).toBe(p.rows[6].id);
  });

  test('16目×18段: 30目・頭頂5段・本体7段', () => {
    const r = recalcForGauge(base(), { stitchesPer10cm: 16, rowsPer10cm: 18 });
    expect(outs(r.next)).toEqual([6, 12, 18, 24, 30, 30]);
    expect(r.next.rows[5].rowSpan).toBe(7);
    expect(r.after.circumferenceCm).toBeCloseTo(18.75, 6);
    expect(r.after.invalidRows).toBe(0);
    expect(r.next.meta.gauge).toEqual({ stitchesPer10cm: 16, rowsPer10cm: 18 });
  });

  test('24目×22段: 42目・頭頂7段', () => {
    const r = recalcForGauge(base(), { stitchesPer10cm: 24, rowsPer10cm: 22 });
    expect(outs(r.next)).toEqual([6, 12, 18, 24, 30, 36, 42, 42]);
    expect(r.after.maxStitches).toBe(42);
  });

  test('頭囲が極端に小さくても最小（12目）を保つ', () => {
    const p = base();
    p.meta.target.headCircumferenceCm = 1;
    const r = recalcForGauge(p, G20);
    expect(outs(r.next)).toEqual([6, 12, 12]);
  });

  test('目数が99を超えるときは「2目×60回」のように分ける', () => {
    const p = base();
    p.meta.target.headCircumferenceCm = 60;
    const r = recalcForGauge(p, G20);
    const body = r.next.rows[r.next.rows.length - 1];
    expect(r.targetStitches).toBe(120);
    expect(body.units[0].count).toBe(2);
    expect(body.repeat).toBe(60);
    expect(r.after.maxStitches).toBe(120);
    expect(r.after.invalidRows).toBe(0);
  });

  test('号数は指定したときだけ変わる', () => {
    const p = base();
    const h = { label: '6/0号', mm: 3.5 };
    expect(recalcForGauge(p, G20, h).next.meta.hook).toEqual(h);
    expect(recalcForGauge(p, G20).next.meta.hook).toEqual(p.meta.hook);
  });
});

describe('標準形でない場合は触らず警告する', () => {
  test('頭頂が標準形でなければ段は変更しない', () => {
    const p = base();
    const rows = [...p.rows];
    rows[2] = { ...rows[2], units: [rows[2].units[1], rows[2].units[0]] };
    const r = recalcForGauge(
      { ...p, rows },
      { stitchesPer10cm: 16, rowsPer10cm: 18 }
    );
    expect(r.next.rows).toEqual(rows);
    expect(r.warnings.some((w) => w.includes('標準形ではない'))).toBe(true);
    expect(r.next.meta.gauge.stitchesPer10cm).toBe(16);
  });

  test('減らし段などは残し、目数が合わなければ警告する', () => {
    const p = base();
    const dec: Row = {
      id: 'x',
      kind: 'round',
      section: 'free',
      units: [
        { id: 'xa', kind: 'sc', count: 1 },
        { id: 'xb', kind: 'dec', count: 1 },
      ],
      repeat: 12,
      rowSpan: 1,
    };
    const r = recalcForGauge(
      { ...p, rows: [...p.rows, dec] },
      { stitchesPer10cm: 16, rowsPer10cm: 18 }
    );
    expect(r.before.invalidRows).toBe(0);
    expect(r.after.invalidRows).toBe(1);
    expect(r.warnings.some((w) => w.includes('第11段'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('目数が合わない'))).toBe(true);
  });

  test('ゲージが不正なら何も変えない', () => {
    const p = base();
    const r = recalcForGauge(p, { stitchesPer10cm: 0, rowsPer10cm: 22 });
    expect(r.next).toBe(p);
    expect(r.warnings).toHaveLength(1);
  });
});

describe('補助関数', () => {
  test('currentBodyHeightCm: 指定があればそれ、無ければ段数から逆算', () => {
    const p = base();
    expect(currentBodyHeightCm(p)).toBe(4);
    const q: Project = {
      ...p,
      meta: { ...p.meta, target: { headCircumferenceCm: 18 } },
    };
    expect(currentBodyHeightCm(q)).toBe(1.8); // 4段 ÷ 22段 × 10cm
  });

  test('hookOptions: マスタに無い号数は先頭に足される', () => {
    expect(hookOptions({ label: '5/0号', mm: 3.0 })).toHaveLength(10);
    const opts = hookOptions({ label: '特注', mm: 3.2 });
    expect(opts).toHaveLength(11);
    expect(opts[0].label).toBe('特注');
  });
});

describe('ストア連携', () => {
  test('適用は1回のUndoで元に戻る', () => {
    const s = createProjectStore(createMemoryStorage());
    const r = recalcForGauge(s.getState().project, {
      stitchesPer10cm: 16,
      rowsPer10cm: 18,
    });
    s.getState().applyGaugeRecalc(r.next);
    expect(s.getState().project.meta.gauge.stitchesPer10cm).toBe(16);
    s.getState().undo();
    expect(s.getState().project.meta.gauge.stitchesPer10cm).toBe(20);
  });
});
