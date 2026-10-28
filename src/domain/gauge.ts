import { nanoid } from 'nanoid';
import { computeProject } from './compute';
import { allInc, standardInc } from './presets';
import type { Gauge, Hook, Project, Row, Section } from './types';

export interface GaugeSummary {
  circumferenceCm: number; // 最大周囲の目数 ÷ ゲージ × 10
  totalRows: number;
  maxStitches: number;
  invalidRows: number; // 目数が合わない段の数
}

export interface RecalcResult {
  next: Project; // 適用後の案
  before: GaugeSummary;
  after: GaugeSummary;
  targetStitches: number; // 目標の周囲目数（頭頂の増し目数の倍数）
  warnings: string[];
}

const SECTION_NAME: Record<Section, string> = {
  crown: '頭頂',
  body: '本体',
  brim: '縁',
  free: 'その他',
};

function summarize(rows: Row[], gauge: Gauge): GaugeSummary {
  const c = computeProject(rows);
  return {
    circumferenceCm:
      gauge.stitchesPer10cm > 0
        ? (c.maxStitchesOut / gauge.stitchesPer10cm) * 10
        : 0,
    totalRows: c.totalRows,
    maxStitches: c.maxStitchesOut,
    invalidRows: c.rows.filter((r) => !r.valid).length,
  };
}

/** 本体の高さ(cm)。未指定なら現在の本体段数とゲージから逆算（0.1cm単位） */
export function currentBodyHeightCm(p: Project): number {
  if (p.meta.target.bodyHeightCm != null) return p.meta.target.bodyHeightCm;
  const span = p.rows
    .filter((r) => r.section === 'body')
    .reduce((a, r) => a + r.rowSpan, 0);
  return Math.round((span / p.meta.gauge.rowsPer10cm) * 100) / 10;
}

/** ユニットが「種類×数」の並びと一致するか（バリアントは通常のみ） */
function matchesUnits(
  row: Row,
  spec: [Row['units'][number]['kind'], number][]
) {
  return (
    row.units.length === spec.length &&
    row.units.every(
      (u, i) =>
        u.kind === spec[i][0] &&
        u.count === spec[i][1] &&
        (u.variant ?? 'normal') === 'normal'
    )
  );
}

/** 先頭から続く標準形の頭頂の段数（6→12→18…）。途中で外れたらそこまで */
function standardCrownLength(rows: Row[], U: number): number {
  let m = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.section !== 'crown' || r.rowSpan !== 1 || r.turning) break;
    let ok: boolean;
    if (i === 0) {
      ok =
        r.kind === 'magic_ring' &&
        r.repeat === 1 &&
        matchesUnits(r, [['sc', U]]);
    } else if (i === 1) {
      ok =
        r.kind === 'round' && r.repeat === U && matchesUnits(r, [['inc', 1]]);
    } else {
      ok =
        r.kind === 'round' &&
        r.repeat === U &&
        matchesUnits(r, [
          ['sc', i - 1],
          ['inc', 1],
        ]);
    }
    if (!ok) break;
    m++;
  }
  return m;
}

/** 前段の全目に細編みを編む段か */
function isAllScRow(row: Row, prevOut: number): boolean {
  return (
    !row.turning &&
    row.kind === 'round' &&
    row.units.length === 1 &&
    row.units[0].kind === 'sc' &&
    (row.units[0].variant ?? 'normal') === 'normal' &&
    row.units[0].count * row.repeat === prevOut
  );
}

/** n目を「count目×repeat回」に分ける（どちらも99以下）。できなければ null */
function splitCount(n: number): { count: number; repeat: number } | null {
  if (n <= 99) return { count: 1, repeat: n };
  for (let d = 2; d <= 99; d++) {
    if (n % d === 0 && n / d <= 99) return { count: d, repeat: n / d };
  }
  return null;
}

function buildCrown(U: number, count: number, oldIds: string[]): Row[] | null {
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const id = oldIds[i] ?? nanoid();
    if (i === 0) {
      rows.push({
        id,
        kind: 'magic_ring',
        section: 'crown',
        units: [{ id: nanoid(), kind: 'sc', count: U }],
        repeat: 1,
        rowSpan: 1,
      });
      continue;
    }
    const preset = i === 1 ? allInc(U) : standardInc(i * U, U);
    if (!preset) return null;
    rows.push({
      id,
      kind: 'round',
      section: 'crown',
      units: preset.units,
      repeat: preset.repeat,
      rowSpan: 1,
    });
  }
  return rows;
}

/**
 * ゲージ（と号数）を変えても、目標の頭囲・高さを保つように目数・段数を作り直す。
 * 標準形の段だけ自動で作り直し、それ以外はそのまま残して警告する。
 */
export function recalcForGauge(
  p: Project,
  newGauge: Gauge,
  newHook?: Hook
): RecalcResult {
  const oldGauge = p.meta.gauge;
  const before = summarize(p.rows, oldGauge);
  const warnings: string[] = [];

  if (!(newGauge.stitchesPer10cm >= 1) || !(newGauge.rowsPer10cm >= 1)) {
    warnings.push('ゲージの値が正しくありません');
    return { next: p, before, after: before, targetStitches: 0, warnings };
  }

  const nextMeta = { ...p.meta, gauge: newGauge, hook: newHook ?? p.meta.hook };
  const finish = (rows: Row[], targetStitches: number): RecalcResult => {
    const next: Project = { ...p, meta: nextMeta, rows };
    const after = summarize(rows, newGauge);
    if (after.invalidRows > 0) {
      warnings.push(
        `目数が合わない段が${after.invalidRows}段あります。手動で調整してください`
      );
    }
    return { next, before, after, targetStitches, warnings };
  };

  const U = Math.max(1, Math.round(p.meta.crownIncrementPerRound));
  // 目標の周囲目数（Uの倍数に丸める）
  const targetN = Math.max(
    2 * U,
    Math.round(
      ((p.meta.target.headCircumferenceCm / 10) * newGauge.stitchesPer10cm) / U
    ) * U
  );

  const old = computeProject(p.rows).rows;
  const labelOf = (a: number, b: number) => {
    const s = old[a].startNo;
    const e = old[b].endNo;
    return s === e ? `第${s}段` : `第${s}〜${e}段`;
  };

  // 1. 頭頂
  let leading = 0;
  while (leading < p.rows.length && p.rows[leading].section === 'crown')
    leading++;
  if (leading === 0 || standardCrownLength(p.rows, U) !== leading) {
    warnings.push(
      leading === 0
        ? '頭頂の段が見つからないため、自動調整できません'
        : `頭頂（${labelOf(
            0,
            leading - 1
          )}）は標準形ではないため、自動調整できません`
    );
    warnings.push('目数・段数は変更していません。手動で調整してください');
    return finish(p.rows, targetN);
  }
  const crownCount = targetN / U;
  const crown =
    crownCount <= 99
      ? buildCrown(
          U,
          crownCount,
          p.rows.slice(0, leading).map((r) => r.id)
        )
      : null;
  if (!crown) {
    warnings.push('目数が大きすぎるため、自動で作り直せません');
    return finish(p.rows, targetN);
  }

  // 2. 頭頂より後ろ（本体・縁など）を、同じ区分ごとのまとまりで処理する
  const rows: Row[] = [...crown];
  const ratio = newGauge.rowsPer10cm / oldGauge.rowsPer10cm;
  let i = leading;
  while (i < p.rows.length) {
    const section = p.rows[i].section;
    let j = i;
    while (j + 1 < p.rows.length && p.rows[j + 1].section === section) j++;
    const run = p.rows.slice(i, j + 1);
    const flat = run.every((r, k) => isAllScRow(r, old[i + k - 1].stitchesOut));
    const split = flat ? splitCount(targetN) : null;

    if (flat && split) {
      const oldSpan = run.reduce((a, r) => a + r.rowSpan, 0);
      const span =
        section === 'body'
          ? Math.max(
              1,
              Math.round(
                ((p.meta.target.bodyHeightCm ??
                  (oldSpan / oldGauge.rowsPer10cm) * 10) /
                  10) *
                  newGauge.rowsPer10cm
              )
            )
          : Math.max(1, Math.round(oldSpan * ratio));
      rows.push({
        id: run[0].id,
        kind: 'round',
        section,
        units: [{ id: nanoid(), kind: 'sc', count: split.count }],
        repeat: split.repeat,
        rowSpan: span,
        note: run[0].note,
      });
    } else {
      rows.push(...run);
      warnings.push(
        `${SECTION_NAME[section]}（${labelOf(
          i,
          j
        )}）は標準形ではないため、そのままにしています。手動で確認してください`
      );
    }
    i = j + 1;
  }

  return finish(rows, targetN);
}
