import type { StitchKind } from '../domain/types'

export interface SymbolDef {
  d: string // SVGパス（原点中心、頭が -y 方向）
  filled: boolean // 塗りつぶすか（引き抜き編みの●）
}

const SC: SymbolDef = { d: 'M-3,-3 L3,3 M3,-3 L-3,3', filled: false } // ×
const HDC: SymbolDef = { d: 'M-3,-4.5 L3,-4.5 M0,-4.5 L0,4.5', filled: false } // T
// 長編み: T に、左上→右下の斜線「＼」
const DC: SymbolDef = {
  d: 'M-3,-4.5 L3,-4.5 M0,-4.5 L0,4.5 M-2.2,-2.3 L2.2,0.7',
  filled: false,
}
// 細編み2目一度: 頂点が上のΛ。足の高さの中央に×
const DEC: SymbolDef = {
  d: 'M-4.5,1.25 L0,-3.25 L4.5,1.25 M-2,-0.75 L2,3.25 M2,-0.75 L-2,3.25',
  filled: false,
}

export const SYMBOLS: Record<StitchKind, SymbolDef> = {
  sc: SC,
  // 増し目は、2目で1つのV記号として描く（incShape.ts）。ここは、親がないときに1目ずつ描く用
  inc: SC,
  hdc_inc: HDC,
  dc_inc: DC,
  dec: DEC,
  hdc: HDC,
  dc: DC,
  slst: { d: 'M-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0', filled: true }, // ●
  ch: { d: 'M-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0', filled: false }, // ○
}

/** 親がない増し目（輪の作り目の中など）で、2目を左右に開く角度 */
export const INC_LEAN_DEG = 18
export const INC_LEAN_RAD = (INC_LEAN_DEG * Math.PI) / 180