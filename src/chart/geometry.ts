import { computeProject } from '../domain/compute';
import { FOUNDATION_LIMITS, foundationStitches } from '../domain/foundation';
import {
  TURNING_MAX,
  isIncKind,
  isTurningCounted,
} from '../domain/stitchTable';
import type {
  Foundation,
  Row,
  Section,
  StitchKind,
  Turning,
} from '../domain/types';
import { stadiumPointCcw as pathPoint } from './stadium';

export interface GeometryOptions {
  W: number; // 目の間隔(px)
  DR_MIN: number; // 段間の最小ステップ
  MARGIN: number; // 外周の余白
}
export const DEFAULT_GEOMETRY_OPTIONS: GeometryOptions = {
  W: 14,
  DR_MIN: 12,
  MARGIN: 28,
};

/** 外周の記号が欠けないための追加の余白 */
const EXTRA_PAD = 5;

/**
 * 数えない立ち上がり＋引き抜きのとき、出発点の前後にずらす距離。
 * ○（立ち上がり）は出発点の先（左）、●（引き抜き）は手前（右）。目の位置はずらさない
 */
const MARK_SHIFT = 2.4;

/**
 * 増し目の2目の傾き（外側へ開く）。目は反時計回りに並ぶので、
 * 1つ目は時計回り側（1）、2つ目は反時計回り側（-1）へ傾ける。0=傾けない
 */
export type Lean = -1 | 0 | 1;

export interface StitchNode {
  rowIndex: number; // 展開後の段番号(0始まり)
  rowId: string;
  index: number; // 段内の位置（反時計回りの読む順）
  kind: StitchKind;
  x: number;
  y: number;
  angle: number; // 外向きの方向（ラジアン）
  lean: Lean;
  parentIdx: number[]; // 前段の親の index
}

export interface RingInfo {
  rowIndex: number;
  rowId: string;
  radius: number;
  halfLength: number; // 中心の線分の半分の長さ（円なら0。楕円なら正）
  count: number;
  label: string; // 表示用の段番号
  labelPos: [number, number]; // 段番号を出す位置（出発点・立ち上がりの反対側＝下側）
  section: Section;
}

export interface ChartLink {
  rowIndex: number;
  rowId: string;
  from: [number, number]; // 子
  to: [number, number]; // 親
}

/** 鎖の作り目（中央に一直線に並ぶ鎖） */
export interface ChainInfo {
  rowId: string;
  points: [number, number][]; // 鎖の各目の中心（左→右）
  links: { from: [number, number]; to: [number, number] }[]; // 1周目の目 → 編み入れる鎖の目
}

/** 段ごとの立ち上がりの鎖（○）と、編み終わりの引き抜き編み（●） */
export interface TurningMark {
  rowIndex: number;
  rowId: string;
  points: [number, number][]; // 立ち上がりの鎖の○（根元から外側へ）
  join: [number, number] | null; // 引き抜き編みの●（輪にしないなら null）
}

export interface ChartGeometry {
  nodes: StitchNode[];
  links: ChartLink[];
  rings: RingInfo[];
  chain: ChainInfo | null; // 鎖の作り目が無ければ null
  turnings: TurningMark[];
  bounds: number; // viewBox = [-bounds, -bounds, 2*bounds, 2*bounds]
}

interface Slot {
  kind: StitchKind;
  parents: number[];
  lean: Lean;
}

type Pt = [number, number];

const lerp = (a: Pt, b: Pt, f: number): Pt => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
];

/** 描画できる設定の鎖の作り目だけを返す */
function validFoundation(f: Foundation | undefined): Foundation | null {
  const L = FOUNDATION_LIMITS;
  if (!f) return null;
  const ok =
    Number.isInteger(f.chains) &&
    Number.isInteger(f.endStitches) &&
    f.chains >= L.chainsMin &&
    f.chains <= L.chainsMax &&
    f.endStitches >= L.endMin &&
    f.endStitches <= L.endMax;
  return ok ? f : null;
}

/** 描画できる設定の立ち上がりだけを返す */
function validTurning(t: Turning | undefined): Turning | null {
  if (!t) return null;
  return Number.isInteger(t.chains) && t.chains >= 1 && t.chains <= TURNING_MAX
    ? t
    : null;
}

/** 1段ぶんの目（スロット）を展開する。prevN は前段の目数 */
function expandRing(row: Row, prevN: number): Slot[] {
  const slots: Slot[] = [];

  // 鎖の作り目: 1周目の目数ぶんの目を、親なしで並べる
  if (row.kind === 'chain_foundation') {
    const n = row.foundation ? foundationStitches(row.foundation) : 0;
    const kind = row.units[0]?.kind ?? 'sc';
    for (let i = 0; i < n; i++) slots.push({ kind, parents: [], lean: 0 });
    // 立ち上がりを1目に数える場合: 最初の1目（出発点の次）が、立ち上がりの鎖になる
    if (n > 0 && row.turning && isTurningCounted(row.turning)) {
      slots[0] = { kind: 'ch', parents: [], lean: 0 };
    }
    return slots;
  }

  const hasParents = row.kind === 'round' && prevN > 0;
  // 目数がずれた不正な段でも壊れないよう、親の index は範囲内に丸める
  const par = (i: number) => Math.min(i, prevN - 1);
  let p = 0;

  // 立ち上がりの鎖を1目に数える場合: 前段の最初の目の上（輪の作り目なら輪の上）に1目ぶん立つ
  if (
    row.turning &&
    isTurningCounted(row.turning) &&
    (hasParents || row.kind === 'magic_ring')
  ) {
    slots.push({ kind: 'ch', parents: hasParents ? [par(0)] : [], lean: 0 });
    if (hasParents) p += 1;
  }

  for (let r = 0; r < row.repeat; r++) {
    for (const u of row.units) {
      for (let c = 0; c < u.count; c++) {
        if (u.kind === 'ch') {
          slots.push({ kind: 'ch', parents: [], lean: 0 });
        } else if (isIncKind(u.kind)) {
          // 増し目: 同じ親から2目。2目は外側へ開く（1つ目は時計回り側、2つ目は反時計回り側）
          const parents = hasParents ? [par(p)] : [];
          slots.push(
            { kind: u.kind, parents, lean: 1 },
            { kind: u.kind, parents, lean: -1 }
          );
          p += 1;
        } else if (u.kind === 'dec') {
          const parents = hasParents ? [...new Set([par(p), par(p + 1)])] : [];
          slots.push({ kind: 'dec', parents, lean: 0 });
          p += 2;
        } else {
          slots.push({
            kind: u.kind,
            parents: hasParents ? [par(p)] : [],
            lean: 0,
          });
          p += 1;
        }
      }
    }
  }
  return slots;
}

/** 編み図の座標を計算する（上から見た同心円／楕円の展開図。反時計回りに読む） */
export function buildGeometry(
  rows: Row[],
  options: Partial<GeometryOptions> = {}
): ChartGeometry {
  const { W, DR_MIN, MARGIN } = { ...DEFAULT_GEOMETRY_OPTIONS, ...options };
  const computed = computeProject(rows).rows;

  // 鎖の作り目スタートなら、中心は長さ core の線分（直線部 = 鎖−2目ぶん）。なければ円（core=0）
  const first = rows[0];
  const foundation =
    first?.kind === 'chain_foundation'
      ? validFoundation(first.foundation)
      : null;
  const core = foundation ? (foundation.chains - 2) * W : 0;
  // 鎖の右端（編み始めの端。立ち上がりの鎖が立つ位置）
  const chainEnd: Pt | null = foundation
    ? [((foundation.chains - 1) / 2) * W, 0]
    : null;

  // 1. 段の展開（rowSpan 回コピー）とスロット化
  const expanded: { row: Row; no: number; slots: Slot[] }[] = [];
  let prevN = 0;
  rows.forEach((row, i) => {
    for (let k = 0; k < row.rowSpan; k++) {
      const slots = expandRing(row, prevN);
      expanded.push({ row, no: computed[i].startNo + k, slots });
      prevN = slots.length;
    }
  });

  // 2. 半径（周長ベース＋最小ステップ）。外周 = 2×core + 2π×半径
  const radii: number[] = [];
  expanded.forEach((e, k) => {
    const natural = Math.max(
      0,
      (e.slots.length * W - 2 * core) / (2 * Math.PI)
    );
    radii[k] =
      k === 0
        ? Math.max(natural, W * 0.9)
        : Math.max(radii[k - 1] + DR_MIN, natural);
  });

  // 3. 座標・リンク
  const nodes: StitchNode[] = [];
  const links: ChartLink[] = [];
  const rings: RingInfo[] = [];
  const turnings: TurningMark[] = [];
  let chain: ChainInfo | null = null;
  let prevNodes: StitchNode[] = [];

  expanded.forEach((e, k) => {
    const N = e.slots.length;
    const R = radii[k];
    const perimeter = 2 * core + 2 * Math.PI * R;
    // 反時計回り。目は、立ち上がりの有無に関係なく、出発点から（i + 0.5）目の位置に置く
    const current: StitchNode[] = e.slots.map((s, i) => {
      const pt = pathPoint(((i + 0.5) / N) * perimeter, core, R);
      return {
        rowIndex: k,
        rowId: e.row.id,
        index: i,
        kind: s.kind,
        x: pt.x,
        y: pt.y,
        angle: pt.angle,
        lean: s.lean,
        parentIdx: s.parents,
      };
    });

    for (const n of current) {
      for (const pi of n.parentIdx) {
        const parent = prevNodes[pi];
        if (parent) {
          links.push({
            rowIndex: k,
            rowId: e.row.id,
            from: [n.x, n.y],
            to: [parent.x, parent.y],
          });
        }
      }
    }

    // 鎖の作り目: 中央に一直線に並べ、1周目の目を編み入れる鎖の目につなぐ
    if (k === 0 && foundation && e.row.kind === 'chain_foundation') {
      const L = foundation.chains;
      const E = foundation.endStitches;
      const points: Pt[] = Array.from({ length: L }, (_, j) => [
        (j - (L - 1) / 2) * W,
        0,
      ]);
      // 1周目の i 番目の目が編み入れる鎖の目。
      // 順番: 上辺（右→左: 鎖L-2〜1）→ 左端（鎖0）→ 下辺（左→右: 鎖1〜L-2）→ 右端（鎖L-1）
      const chainIndexOf = (i: number): number => {
        if (i < L - 2) return L - 2 - i;
        if (i < L - 2 + E) return 0;
        if (i < 2 * (L - 2) + E) return 1 + (i - (L - 2 + E));
        return L - 1;
      };
      chain = {
        rowId: e.row.id,
        points,
        links: current.map((n, i) => ({
          from: [n.x, n.y] as Pt,
          to: points[Math.max(0, Math.min(L - 1, chainIndexOf(i)))],
        })),
      };
    }

    // 立ち上がりの鎖（○）と、編み終わりの引き抜き編み（●）
    // 並び順（反時計回り）: 最後の目 → ●（右）→ ○（立ち上がり・左）→ 最初の目
    const t =
      e.row.kind === 'round' ||
      e.row.kind === 'chain_foundation' ||
      e.row.kind === 'magic_ring'
        ? validTurning(e.row.turning)
        : null;
    if (t && N > 0) {
      const start = pathPoint(0, core, R); // この段の出発点
      const isFoundationRow = e.row.kind === 'chain_foundation';
      const counted = isTurningCounted(t);
      // 数えない立ち上がり＋引き抜きのときだけ、○を出発点の先へ、●を手前へずらす
      const shift = t.join && !counted ? MARK_SHIFT : 0;
      const marks: Pt[] = [];

      // 立ち上がりの根元（作り目の鎖の端／前の段／輪の作り目の中心寄り）
      const baseAt = (distance: number): Pt | null => {
        if (isFoundationRow) return chainEnd;
        const pr = k > 0 ? radii[k - 1] : Math.max(0, R - DR_MIN);
        const prevPerimeter = 2 * core + 2 * Math.PI * pr;
        const p = pathPoint((distance / perimeter) * prevPerimeter, core, pr);
        return [p.x, p.y];
      };

      if (counted) {
        // 1目に数える: 最初の目の位置が、鎖の一番上。そこへ向かって下の鎖を積む
        const top: Pt = [current[0].x, current[0].y];
        const from: Pt | null = isFoundationRow
          ? chainEnd
          : prevNodes[0]
          ? [prevNodes[0].x, prevNodes[0].y]
          : baseAt(0.5 * (perimeter / N));
        if (from) {
          for (let j = 1; j < t.chains; j++)
            marks.push(lerp(from, top, j / t.chains));
        }
      } else {
        // 数えない: 出発点（または、そこから少し先）に鎖が立つ（目としては数えない）
        const topP = pathPoint(shift, core, R);
        const top: Pt = [topP.x, topP.y];
        const from = baseAt(shift);
        if (from) {
          for (let j = 1; j <= t.chains; j++)
            marks.push(lerp(from, top, j / t.chains));
        }
      }

      // ●: 1目に数えるなら出発点（最初の目の○のすぐ手前）、数えないなら○の手前（右）
      const joinP = !t.join
        ? null
        : counted
        ? start
        : pathPoint(perimeter - MARK_SHIFT, core, R);

      turnings.push({
        rowIndex: k,
        rowId: e.row.id,
        points: marks,
        join: joinP ? [joinP.x, joinP.y] : null,
      });
    }

    nodes.push(...current);
    rings.push({
      rowIndex: k,
      rowId: e.row.id,
      radius: R,
      halfLength: core / 2,
      count: N,
      label: String(e.no),
      labelPos: [0, R], // 出発点・立ち上がりと重ならない、下側（楕円は下辺の中央）
      section: e.row.section,
    });
    prevNodes = current;
  });

  const maxR = radii.length > 0 ? radii[radii.length - 1] : 0;
  return {
    nodes,
    links,
    rings,
    chain,
    turnings,
    bounds: core / 2 + maxR + MARGIN + EXTRA_PAD,
  };
}
