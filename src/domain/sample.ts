import { nanoid } from 'nanoid';
import { allInc, createFoundationRow, standardInc } from './presets';
import type { Project, Row, Section } from './types';

function roundRow(
  section: Section,
  p: Pick<Row, 'units' | 'repeat'>,
  rowSpan = 1
): Row {
  return {
    id: nanoid(),
    kind: 'round',
    section,
    units: p.units,
    repeat: p.repeat,
    rowSpan,
  };
}

export function createSampleProject(): Project {
  const now = new Date().toISOString();
  const rows: Row[] = [
    {
      id: nanoid(),
      kind: 'magic_ring',
      section: 'crown',
      units: [{ id: nanoid(), kind: 'sc', count: 6 }],
      repeat: 1,
      rowSpan: 1,
    },
    roundRow('crown', allInc(6)!),
  ];
  for (let n = 12; n < 36; n += 6) {
    rows.push(roundRow('crown', standardInc(n, 6)!));
  }
  rows.push(
    roundRow(
      'body',
      { units: [{ id: nanoid(), kind: 'sc', count: 1 }], repeat: 36 },
      4
    )
  );

  return {
    schemaVersion: 1,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    meta: {
      title: 'サンプル帽子',
      yarn: { name: 'コットン糸', weightLabel: '合太', colorName: '生成り' },
      hook: { label: '5/0号', mm: 3.0 },
      gauge: { stitchesPer10cm: 20, rowsPer10cm: 22 },
      target: { headCircumferenceCm: 18, bodyHeightCm: 1.8 },
      crownIncrementPerRound: 6,
    },
    rows,
  };
}
/** 鎖の作り目スタートの楕円サンプル（鎖10目・端3目: 22→28→34→40目、本体6段） */
export function createOvalSampleProject(): Project {
  const base = createSampleProject();
  const sc = (count: number) => ({ id: nanoid(), kind: 'sc' as const, count });
  const inc = (count = 1) => ({ id: nanoid(), kind: 'inc' as const, count });
  const round = (
    units: Row['units'],
    repeat: number,
    rowSpan = 1,
    section: Section = 'crown'
  ): Row => ({ id: nanoid(), kind: 'round', section, units, repeat, rowSpan });

  return {
    ...base,
    id: nanoid(),
    meta: {
      ...base.meta,
      title: 'サンプル（楕円）',
      target: { headCircumferenceCm: 20, bodyHeightCm: 2.7 },
    },
    rows: [
      createFoundationRow(10, 3),
      // 片側（直線）8目 → 端3目を増す、を2回（両端が広がる）
      round([sc(8), inc(3)], 2),
      round([sc(8), sc(1), inc(), sc(1), inc(), sc(1), inc()], 2),
      round([sc(8), sc(2), inc(), sc(2), inc(), sc(2), inc()], 2),
      round([sc(1)], 40, 6, 'body'),
    ],
  };
}
