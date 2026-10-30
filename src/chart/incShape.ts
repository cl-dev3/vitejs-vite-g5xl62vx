import type { StitchKind } from '../domain/types'

export type Pt = [number, number]
export type Seg = [Pt, Pt]

// ---- 増し目（2目編み入れる）の記号の寸法。比率は編み目記号の一覧（JIS）に合わせた ----
const SC_MAX = 9 // 細編み: Vの深さの上限（腕は±45°）
const SC_X = 2.2 // 細編み: ×の半分の大きさ
const T_SLOPE = 0.38 // 中長編み・長編み: 腕の傾き（横 ÷ 縦）
const T_BAR = 0.19 // 中長編み・長編み: 腕の先の横棒の半分（縦に対する比）
const TICK_AT = 0.62 // 長編み: 斜線の位置（頂点から腕の先までの割合）
const TICK_HX = 2.0 // 長編み: 斜線の半分の長さ（横）
const TICK_HY = 1.3 // 長編み: 斜線の半分の長さ（縦）
const STITCH_TOP = 4.5 // 中長編み・長編みの記号の、中心から上端（横棒）まで

/**
 * 増し目（2目編み入れる）の記号を、頂点を原点・外向きを -y とした線分で返す。
 * H は、頂点から「2目の中心」までの距離。増し目でない種類は null
 */
export function incLocalSegments(kind: StitchKind, H: number): Seg[] | null {
  if (kind === 'inc') {
    // 細編み: Vの腕は±45°。×は1つ、腕の先と同じ高さの中央
    const D = Math.min(H, SC_MAX)
    const s = SC_X
    return [
      [[0, 0], [-D, -D]],
      [[0, 0], [D, -D]],
      [[-s, -D - s], [s, -D + s]],
      [[s, -D - s], [-s, -D + s]],
    ]
  }

  if (kind === 'hdc_inc' || kind === 'dc_inc') {
    // 中長編み・長編み: 細いV。腕の先に、水平な横棒
    const Ht = H + STITCH_TOP
    const tx = T_SLOPE * Ht
    const b = T_BAR * Ht
    const segs: Seg[] = [
      [[0, 0], [-tx, -Ht]],
      [[0, 0], [tx, -Ht]],
      [[-tx - b, -Ht], [-tx + b, -Ht]],
      [[tx - b, -Ht], [tx + b, -Ht]],
    ]
    if (kind === 'dc_inc') {
      // 長編み: 各腕に斜線（左は「＼」、右は「／」。腕の傾きに合わせて回す）
      for (const sign of [-1, 1]) {
        const c: Pt = [sign * tx * TICK_AT, -Ht * TICK_AT]
        const th = Math.atan2(sign * tx, Ht) // 腕の傾き
        const cos = Math.cos(th)
        const sin = Math.sin(th)
        const rot = (x: number, y: number): Pt => [
          c[0] + x * cos - y * sin,
          c[1] + x * sin + y * cos,
        ]
        segs.push([rot(sign * TICK_HX, -TICK_HY), rot(-sign * TICK_HX, TICK_HY)])
      }
    }
    return segs
  }

  return null
}

/** 線分を、origin を原点として theta（ラジアン、時計回りが正）だけ回して移動する */
export function transformSegments(segs: Seg[], origin: Pt, theta: number): Seg[] {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const f = (p: Pt): Pt => [
    origin[0] + p[0] * c - p[1] * s,
    origin[1] + p[0] * s + p[1] * c,
  ]
  return segs.map(([a, b]) => [f(a), f(b)])
}

/** 凡例用: 増し目の記号（頂点が原点、上が外向き）。増し目でなければ null */
export function incLegendSegments(kind: StitchKind): Seg[] | null {
  return incLocalSegments(kind, kind === 'inc' ? 8 : 6.5)
}