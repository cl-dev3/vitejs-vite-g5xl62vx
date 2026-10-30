import {
  INC_BASE,
  KIND_LABEL,
  OMIT_ONE,
  VARIANT_SUFFIX,
  isIncKind,
  isTurningCounted,
} from './stitchTable'
import type { Row, Unit } from './types'

/** 種類名＋バリアント（例: 「細編み（すじ編み）」） */
function kindName(u: Unit): string {
  return KIND_LABEL[u.kind] + VARIANT_SUFFIX[u.variant ?? 'normal']
}

/** 1ユニットの文章（例: 「細編み2目」「増し目」「長編みの増し目5目」） */
export function describeUnit(u: Unit): string {
  if (OMIT_ONE.has(u.kind) && u.count === 1) return kindName(u)
  return `${KIND_LABEL[u.kind]}${u.count}目${VARIANT_SUFFIX[u.variant ?? 'normal']}`
}

function joinUnits(units: Unit[]): string {
  return units.map(describeUnit).join('、')
}

/** 立ち上がりの文章（例: 「立ち上がり鎖3目（1目に数える）」）。付いていなければ空文字 */
function describeTurning(row: Row): string {
  const t = row.turning
  if (!t) return ''
  return `立ち上がり鎖${t.chains}目${isTurningCounted(t) ? '（1目に数える）' : ''}`
}

/**
 * 立ち上がりを1目に数えるとき: 段の最初の1目が立ち上がりに置き換わる。
 * 最初のアクションが増し目なら、残りの1目は土台の編み目（細編みなど）になる。
 * 置き換えたあとのアクション列を返す
 */
function afterFirstReplaced(units: Unit[]): Unit[] {
  if (units.length === 0) return []
  const [u0, ...rest] = units
  const head: Unit[] = []
  if (isIncKind(u0.kind)) {
    head.push({ ...u0, id: `${u0.id}-base`, kind: INC_BASE[u0.kind] ?? 'sc', count: 1 })
    if (u0.count - 1 > 0) head.push({ ...u0, count: u0.count - 1 })
  } else if (u0.count - 1 > 0) {
    head.push({ ...u0, count: u0.count - 1 })
  }
  return [...head, ...rest]
}

/** 立ち上がりを1目に数える通常の段の文章 */
function describeCounted(row: Row, prevOut: number): string {
  const { units, repeat } = row

  if (units.length === 1) {
    // アクションが1つなら、全体をひとまとめにして、最初の1目を置き換える
    const u = units[0]
    const flat: Unit = { ...u, count: u.count * repeat }
    const rest = afterFirstReplaced([flat])
    const plain = u.kind === 'sc' || u.kind === 'hdc' || u.kind === 'dc'
    if (plain && prevOut > 0 && flat.count === prevOut && rest.length === 1) {
      return `残りのすべての目に${kindName(rest[0])}を編む`
    }
    return joinUnits(rest)
  }

  // アクションが複数なら、最初のサイクルの最初の1目だけを置き換え、残りのサイクルを繰り返す
  const lead = joinUnits(afterFirstReplaced(units))
  if (repeat > 1) {
    return `${lead ? `${lead}、` : ''}（${joinUnits(units)}）を${repeat - 1}回繰り返す`
  }
  return lead
}

/**
 * 鎖の作り目（楕円スタート）の文章。チャートと同じ順番。
 * 立ち上がりを1目に数えるときは、編み始めの端（根元＝右端）の1目がその鎖になる。
 */
function describeFoundation(row: Row): string {
  const f = row.foundation
  if (!f) return '鎖の作り目'
  const kind = KIND_LABEL[row.units[0]?.kind ?? 'sc']
  const side = f.chains - 2
  const counted = row.turning !== undefined && isTurningCounted(row.turning)
  const lastEnd = counted ? f.endStitches - 1 : f.endStitches
  const turn = describeTurning(row)
  const segs = [
    `鎖の片側に${side}目`,
    `先端に${f.endStitches}目`,
    `鎖の反対側に${side}目`,
    lastEnd > 0 ? `根元に${lastEnd}目` : '',
  ]
    .filter(Boolean)
    .join('、')
  return `鎖${f.chains}目の作り目をし、${turn ? `${turn}、` : ''}${kind}を、${segs}編み入れる`
}

function describeBody(row: Row, prevOut: number): string {
  if (row.kind === 'chain_foundation') return describeFoundation(row)

  const counted = row.turning !== undefined && isTurningCounted(row.turning)

  if (row.kind === 'magic_ring') {
    const turn = describeTurning(row)
    const units = counted ? afterFirstReplaced(row.units) : row.units
    const ring = units.length > 0 ? `輪の作り目に${joinUnits(units)}を編み入れる` : ''
    return [turn, ring].filter(Boolean).join('、')
  }

  if (counted) return describeCounted(row, prevOut)

  // 1種類だけで前段の全目をカバーしている場合は「すべての目に〜」
  if (row.units.length === 1 && prevOut > 0) {
    const u = row.units[0]
    const covered = u.count * row.repeat
    if (isIncKind(u.kind) && covered === prevOut) {
      return `すべての目に${kindName(u)}を編み入れる`
    }
    if (u.kind === 'dec' && covered * 2 === prevOut) {
      return `すべて${kindName(u)}で編む`
    }
    if (
      (u.kind === 'sc' || u.kind === 'hdc' || u.kind === 'dc') &&
      covered === prevOut
    ) {
      return `すべての目に${kindName(u)}を編む`
    }
  }

  if (row.repeat > 1) {
    return `（${joinUnits(row.units)}）を${row.repeat}回繰り返す`
  }
  return joinUnits(row.units)
}

/**
 * 1段の編み図テキストを作る。
 * 例: 「第3段：（細編み1目、増し目）を6回繰り返す（計18目）」
 *     「第2段：立ち上がり鎖1目（1目に数える）、細編み1目、増し目5目（計12目）」
 */
export function describeRow(
  row: Row,
  ctx: { prevOut: number; startNo: number; endNo: number },
  io: { stitchesIn: number; stitchesOut: number },
): string {
  const label =
    row.rowSpan === 1
      ? `第${ctx.startNo}段`
      : `第${ctx.startNo}〜${ctx.endNo}段`
  const total =
    row.rowSpan > 1
      ? `（各段 計${io.stitchesOut}目）`
      : `（計${io.stitchesOut}目）`
  const note = row.note ? `※${row.note}` : ''

  // 通常の段は先頭に立ち上がりを付ける。輪・鎖の作り目は、文の中に立ち上がりを含める
  const turn = row.kind === 'round' ? describeTurning(row) : ''
  const body = describeBody(row, ctx.prevOut)
  const main = turn ? (body ? `${turn}、${body}` : turn) : body
  const join = row.turning?.join ? '。最後に引き抜き編みで輪にする' : ''

  return `${label}：${main}${join}${total}${note}`
}