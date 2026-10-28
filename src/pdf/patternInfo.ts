import type { ChartGeometry } from '../chart/geometry';
import { currentBodyHeightCm } from '../domain/gauge';
import { hookDisplay } from '../domain/hooks';
import type { Project, ProjectComputed, StitchKind } from '../domain/types';

export const KIND_ORDER: StitchKind[] = [
  'sc',
  'inc',
  'hdc',
  'hdc_inc',
  'dc',
  'dc_inc',
  'dec',
  'slst',
  'ch',
];

export const LEGEND_LABEL: Record<StitchKind, string> = {
  sc: '細編み',
  inc: '増し目（同じ目から2目）',
  hdc: '中長編み',
  hdc_inc: '中長編みの増し目（同じ目から2目）',
  dc: '長編み',
  dc_inc: '長編みの増し目（同じ目から2目）',
  dec: '減らし目（2目を1目に）',
  slst: '引き抜き編み',
  ch: '鎖編み',
};

/**
 * 凡例に出す編み目。図に出てくるものだけ。
 * 鎖の作り目・立ち上がりの鎖があれば鎖編み、編み終わりの引き抜きがあれば引き抜き編みも入れる
 */
export function legendKinds(g: ChartGeometry): StitchKind[] {
  const used = new Set<StitchKind>(g.nodes.map((n) => n.kind));
  if (g.chain || g.turnings.some((t) => t.points.length > 0)) used.add('ch');
  if (g.turnings.some((t) => t.join)) used.add('slst');
  return KIND_ORDER.filter((k) => used.has(k));
}

/** 材料・仕様表の項目（[見出し, 内容]） */
export function specItems(
  project: Project,
  computed: ProjectComputed
): [string, string][] {
  const { meta } = project;
  const yarn = [
    meta.yarn.name,
    meta.yarn.weightLabel ? `（${meta.yarn.weightLabel}）` : '',
    meta.yarn.colorName ? ` / ${meta.yarn.colorName}` : '',
  ].join('');

  return [
    ['使用糸', yarn || '-'],
    ['使用針', hookDisplay(meta.hook)],
    [
      'ゲージ',
      `10cm四方で ${meta.gauge.stitchesPer10cm}目 × ${meta.gauge.rowsPer10cm}段`,
    ],
    ['頭囲', `${meta.target.headCircumferenceCm}cm`],
    ['高さ', `${currentBodyHeightCm(project)}cm`],
    ['総段数', `${computed.totalRows}段`],
    ['最大目数', `${computed.maxStitchesOut}目`],
  ];
}
