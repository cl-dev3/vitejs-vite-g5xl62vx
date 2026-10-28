import {
  KIND_LABEL,
  OMIT_ONE,
  VARIANT_SUFFIX,
  isIncKind,
  isTurningCounted,
} from './stitchTable';
import type { Row, Unit } from './types';

/** 種類名＋バリアント（例: 「細編み（すじ編み）」） */
function kindName(u: Unit): string {
  return KIND_LABEL[u.kind] + VARIANT_SUFFIX[u.variant ?? 'normal'];
}

/** 1ユニットの文章（例: 「細編み2目」「増し目」「長編みの増し目」） */
export function describeUnit(u: Unit): string {
  if (OMIT_ONE.has(u.kind) && u.count === 1) return kindName(u);
  return `${KIND_LABEL[u.kind]}${u.count}目${
    VARIANT_SUFFIX[u.variant ?? 'normal']
  }`;
}

function joinUnits(units: Unit[]): string {
  return units.map(describeUnit).join('、');
}

/** 立ち上がりの文章（例: 「立ち上がり鎖3目（1目に数える）」）。付いていなければ空文字 */
function describeTurning(row: Row): string {
  const t = row.turning;
  if (!t) return '';
  return `立ち上がり鎖${t.chains}目${
    isTurningCounted(t) ? '（1目に数える）' : ''
  }`;
}

/**
 * 鎖の作り目（楕円スタート）の文章。チャートと同じ順番（右上から反時計回り）。
 * 片側（上辺）→ 先端（左端）→ 反対側（下辺）→ 根元（右端・編み始めの端）
 * 立ち上がりを1目に数えるときは、最初の片側の1目がその鎖になる。
 */
function describeFoundation(row: Row): string {
  const f = row.foundation;
  if (!f) return '鎖の作り目';
  const kind = KIND_LABEL[row.units[0]?.kind ?? 'sc'];
  const side = f.chains - 2;
  const counted = row.turning !== undefined && isTurningCounted(row.turning);
  const firstSide = counted ? side - 1 : side;
  const turn = describeTurning(row);
  const segs = [
    firstSide > 0 ? `鎖の片側に${firstSide}目` : '',
    `先端に${f.endStitches}目`,
    `鎖の反対側に${side}目`,
    `根元に${f.endStitches}目`,
  ]
    .filter(Boolean)
    .join('、');
  return `鎖${f.chains}目の作り目をし、${
    turn ? `${turn}、` : ''
  }${kind}を、${segs}編み入れる`;
}

function describeBody(row: Row, prevOut: number): string {
  if (row.kind === 'magic_ring') {
    const turn = describeTurning(row);
    return `${turn ? `${turn}、` : ''}輪の作り目に${joinUnits(
      row.units
    )}を編み入れる`;
  }
  if (row.kind === 'chain_foundation') return describeFoundation(row);

  // 立ち上がりの鎖が前段の1目を使うとき、ユニットが受け持つのは「残りの目」
  const counted = row.turning !== undefined && isTurningCounted(row.turning);
  const target = prevOut - (counted ? 1 : 0);
  const all = counted ? '残りのすべての目' : 'すべての目';

  // 1種類だけで前段の全目をカバーしている場合は「すべての目に〜」
  if (row.units.length === 1 && prevOut > 0) {
    const u = row.units[0];
    const covered = u.count * row.repeat;
    if (isIncKind(u.kind) && covered === target) {
      return `${all}に${kindName(u)}を編み入れる`;
    }
    if (u.kind === 'dec' && covered * 2 === target) {
      return `${counted ? '残り' : ''}すべて${kindName(u)}で編む`;
    }
    if (
      (u.kind === 'sc' || u.kind === 'hdc' || u.kind === 'dc') &&
      covered === target
    ) {
      return `${all}に${kindName(u)}を編む`;
    }
  }

  if (row.repeat > 1) {
    return `（${joinUnits(row.units)}）を${row.repeat}回繰り返す`;
  }
  return joinUnits(row.units);
}

/**
 * 1段の編み図テキストを作る。
 * 例: 「第3段：（細編み1目、増し目）を6回繰り返す（計18目）」
 *     「第2段：立ち上がり鎖3目（1目に数える）、残りのすべての目に長編みを編む。最後に引き抜き編みで輪にする（計36目）」
 */
export function describeRow(
  row: Row,
  ctx: { prevOut: number; startNo: number; endNo: number },
  io: { stitchesIn: number; stitchesOut: number }
): string {
  const label =
    row.rowSpan === 1
      ? `第${ctx.startNo}段`
      : `第${ctx.startNo}〜${ctx.endNo}段`;
  const total =
    row.rowSpan > 1
      ? `（各段 計${io.stitchesOut}目）`
      : `（計${io.stitchesOut}目）`;
  const note = row.note ? `※${row.note}` : '';

  // 通常の段は先頭に立ち上がりを付ける。輪・鎖の作り目は、文の中に立ち上がりを含める
  const turn = row.kind === 'round' ? describeTurning(row) : '';
  const body = describeBody(row, ctx.prevOut);
  const main = turn ? `${turn}、${body}` : body;
  const join = row.turning?.join ? '。最後に引き抜き編みで輪にする' : '';

  return `${label}：${main}${join}${total}${note}`;
}
