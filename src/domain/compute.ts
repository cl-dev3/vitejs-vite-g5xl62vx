import { describeRow } from './describe';
import { FOUNDATION_LIMITS, foundationStitches } from './foundation';
import { STITCH_IO, TURNING_MAX, isTurningCounted } from './stitchTable';
import type { ProjectComputed, Row, RowComputed, Unit } from './types';

const FOUNDATION_KINDS: readonly string[] = ['sc', 'hdc', 'dc'];

/** 1ユニットの消費・生成目数 */
export function computeUnit(u: Unit): { in: number; out: number } {
  const [i, o] = STITCH_IO[u.kind];
  return { in: i * u.count, out: o * u.count };
}

/** 1段を計算・検証する。prevOut は直前の段の総目数 */
export function computeRow(
  row: Row,
  prevOut: number,
  startNo: number,
  isFirst: boolean
): RowComputed {
  const isRing = row.kind === 'magic_ring';
  const isFoundation = row.kind === 'chain_foundation';
  const isRound = row.kind === 'round';

  const cycle = row.units.reduce(
    (acc, u) => {
      const io = computeUnit(u);
      return { in: acc.in + io.in, out: acc.out + io.out };
    },
    { in: 0, out: 0 }
  );

  // 立ち上がりの鎖を1目に数える場合は、その鎖が1目ぶんになる。
  // 通常の段では前段の1目を使う（in も out も +1）。輪の作り目では out だけ +1
  const turnStitch =
    (isRound || isRing) && row.turning && isTurningCounted(row.turning) ? 1 : 0;

  const stitchesIn = isRound ? cycle.in * row.repeat + turnStitch : 0;
  const stitchesOut = isFoundation
    ? row.foundation
      ? foundationStitches(row.foundation)
      : 0
    : cycle.out * row.repeat + turnStitch;
  const endNo = startNo + row.rowSpan - 1;

  const errors: string[] = [];
  if (isFirst && isRound) {
    errors.push('最初の段は輪の作り目か鎖の作り目にしてください');
  }
  if (row.units.length === 0) {
    errors.push('アクションを1つ以上追加してください');
  }
  if (!isFirst && isRound && stitchesIn !== prevOut) {
    errors.push(
      `前段の目数(${prevOut})と消費目数(${stitchesIn})が一致しません（差 ${Math.abs(
        stitchesIn - prevOut
      )}）`
    );
  }
  if (row.rowSpan > 1 && stitchesIn !== stitchesOut) {
    errors.push('目数が変わる段は「続ける段数」を1にしてください');
  }

  if (isFoundation) {
    const f = row.foundation;
    const L = FOUNDATION_LIMITS;
    if (!isFirst) errors.push('鎖の作り目は最初の段にだけ使えます');
    if (!f) {
      errors.push('鎖の作り目の設定がありません');
    } else {
      if (
        !Number.isInteger(f.chains) ||
        f.chains < L.chainsMin ||
        f.chains > L.chainsMax
      ) {
        errors.push(
          `作り目の鎖は${L.chainsMin}〜${L.chainsMax}目にしてください`
        );
      }
      if (
        !Number.isInteger(f.endStitches) ||
        f.endStitches < L.endMin ||
        f.endStitches > L.endMax
      ) {
        errors.push(
          `端に編み入れる目数は${L.endMin}〜${L.endMax}目にしてください`
        );
      }
    }
    const k = row.units[0]?.kind;
    if (k && !FOUNDATION_KINDS.includes(k)) {
      errors.push(
        '作り目の周回は細編み・中長編み・長編みのどれかにしてください'
      );
    }
  }

  if (row.turning) {
    const n = row.turning.chains;
    if (!Number.isInteger(n) || n < 1 || n > TURNING_MAX) {
      errors.push(`立ち上がりの鎖は1〜${TURNING_MAX}目にしてください`);
    }
  }

  const computed: RowComputed = {
    rowId: row.id,
    startNo,
    endNo,
    label: row.rowSpan === 1 ? `第${startNo}段` : `第${startNo}〜${endNo}段`,
    stitchesIn,
    stitchesOut,
    delta: stitchesOut - stitchesIn,
    valid: errors.length === 0,
    errors,
    text: '',
  };
  computed.text = describeRow(
    row,
    { prevOut, startNo, endNo },
    { stitchesIn, stitchesOut }
  );
  return computed;
}

/** 全段を計算する（保存はせず、毎回ここから導出する） */
export function computeProject(rows: Row[]): ProjectComputed {
  const result: RowComputed[] = [];
  let prevOut = 0;
  let nextNo = 1;
  let totalRows = 0;
  let totalStitches = 0;
  let maxStitchesOut = 0;

  rows.forEach((row, index) => {
    const c = computeRow(row, prevOut, nextNo, index === 0);
    result.push(c);
    prevOut = c.stitchesOut;
    nextNo = c.endNo + 1;
    totalRows += row.rowSpan;
    totalStitches += c.stitchesOut * row.rowSpan;
    maxStitchesOut = Math.max(maxStitchesOut, c.stitchesOut);
  });

  return { rows: result, totalRows, totalStitches, maxStitchesOut };
}
