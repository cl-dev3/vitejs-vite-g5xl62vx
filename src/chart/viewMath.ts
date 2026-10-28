export interface ViewState {
  scale: number;
  tx: number; // コンテナ中心からの平行移動(px)
  ty: number;
}
export interface Pt {
  x: number;
  y: number;
}

export const INITIAL_VIEW: ViewState = { scale: 1, tx: 0, ty: 0 };
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 8;

export function clampScale(s: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

/** 点 p（コンテナ中心基準）を固定したまま、倍率を nextScale に変える */
export function zoomAt(v: ViewState, p: Pt, nextScale: number): ViewState {
  const scale = clampScale(nextScale);
  const k = scale / v.scale;
  return { scale, tx: p.x - (p.x - v.tx) * k, ty: p.y - (p.y - v.ty) * k };
}

/** 2本指: 前回の中点・距離 → 今回の中点・距離（拡大縮小と移動を同時に反映） */
export function pinchView(
  v: ViewState,
  prevMid: Pt,
  prevDist: number,
  mid: Pt,
  dist: number
): ViewState {
  const scale = clampScale(v.scale * (dist / prevDist));
  const cx = (prevMid.x - v.tx) / v.scale; // 前回の中点の下にあったコンテンツ座標
  const cy = (prevMid.y - v.ty) / v.scale;
  return { scale, tx: mid.x - cx * scale, ty: mid.y - cy * scale };
}

/** 画面上で 1 単位が何pxに見えるか（ズーム込み） */
export function effectiveScale(
  viewScale: number,
  w: number,
  h: number,
  bounds: number
): number {
  if (w <= 0 || h <= 0 || bounds <= 0) return viewScale;
  return viewScale * (Math.min(w, h) / (2 * bounds));
}

/** 詳細度: 小さいときは記号を点にし、さらに小さいとラベルも消す */
export function detailLevel(eff: number): {
  showSymbols: boolean;
  showLabels: boolean;
} {
  return { showSymbols: eff >= 0.9, showLabels: eff >= 0.5 };
}
