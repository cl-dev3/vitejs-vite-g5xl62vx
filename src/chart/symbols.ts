import type { StitchKind } from '../domain/types';

export interface SymbolDef {
  d: string; // SVGパス（原点中心、頭が -y 方向）
  filled: boolean; // 塗りつぶすか（引き抜き編みの●）
}

const SC: SymbolDef = { d: 'M-3,-3 L3,3 M3,-3 L-3,3', filled: false }; // ×
const HDC: SymbolDef = { d: 'M-3,-4.5 L3,-4.5 M0,-4.5 L0,4.5', filled: false }; // T
const DC: SymbolDef = {
  d: 'M-3,-4.5 L3,-4.5 M0,-4.5 L0,4.5 M-2,1 L2,-1',
  filled: false,
}; // 斜線付きT

export const SYMBOLS: Record<StitchKind, SymbolDef> = {
  sc: SC,
  inc: SC, // 増し目は土台の記号を、同じ親から出る2目で左右に開く
  hdc_inc: HDC,
  dc_inc: DC,
  dec: { d: 'M-3.5,4.5 L0,-4.5 L3.5,4.5', filled: false }, // Λ
  hdc: HDC,
  dc: DC,
  slst: { d: 'M-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0', filled: true }, // ●
  ch: { d: 'M-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0', filled: false }, // ○
};

/** 増し目の2目が外側へ開く角度。見た目を変えたいときはここだけ直す */
export const INC_LEAN_DEG = 18;
export const INC_LEAN_RAD = (INC_LEAN_DEG * Math.PI) / 180;
