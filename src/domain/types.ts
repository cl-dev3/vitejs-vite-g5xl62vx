export type StitchKind =
  | 'sc' // 細編み
  | 'inc' // 増し目（細編みの増し目）
  | 'dec' // 減らし目
  | 'hdc' // 中長編み
  | 'dc' // 長編み
  | 'slst' // 引き抜き編み
  | 'ch' // 鎖編み
  | 'hdc_inc' // 中長編みの増し目
  | 'dc_inc'; // 長編みの増し目

export type Variant = 'normal' | 'blo' | 'flo'; // 通常 / すじ編み / 手前側
export type RowKind =
  | 'magic_ring' // 輪の作り目
  | 'chain_foundation' // 鎖の作り目（楕円スタート）
  | 'round'; // 通常の周回
export type Section = 'crown' | 'body' | 'brim' | 'free'; // 頭頂 / 本体 / 縁 / その他

/** 1サイクル内の1アクション（例: 細編み×2） */
export interface Unit {
  id: string;
  kind: StitchKind;
  count: number; // 連続する回数 (1..99)
  variant?: Variant; // 省略時 normal
}

/**
 * 鎖の作り目（楕円スタート）の設定。
 * 1周目の目数 = 2×(chains−2) + 2×endStitches
 * 編み入れる順: 先端に endStitches目 → 片側に (chains−2)目 → 根元に endStitches目 → 反対側に (chains−2)目
 */
export interface Foundation {
  chains: number; // 作り目の鎖の目数（立ち上がりは含まない）3..99
  endStitches: number; // 両端それぞれに編み入れる目数 1..9
}

/** 段の始まりの立ち上がり鎖 */
export interface Turning {
  chains: number; // 立ち上がりの鎖の目数 1..6
  counted?: boolean; // 1目に数えるか。省略時は chains>=2 のとき true
  join?: boolean; // 最後に引き抜き編みで輪にするか
}

/** 1段（同一段を rowSpan 段続けることも可） */
export interface Row {
  id: string;
  kind: RowKind;
  section: Section;
  units: Unit[]; // 1サイクル分のユニット列（chain_foundation では units[0].kind が編み目の種類）
  repeat: number; // サイクルの繰り返し回数 (1..99)
  rowSpan: number; // 同じ段を何段続けるか (>=1)
  foundation?: Foundation; // kind === 'chain_foundation' のとき必須
  turning?: Turning; // kind === 'round' のときだけ指定可
  note?: string;
}

export interface Gauge {
  stitchesPer10cm: number;
  rowsPer10cm: number;
}

export interface Hook {
  label: string; // 例 '5/0号'
  mm: number;
}

export interface ProjectMeta {
  title: string;
  yarn: { name: string; weightLabel?: string; colorName?: string };
  hook: Hook;
  gauge: Gauge;
  target: {
    headCircumferenceCm: number;
    bodyHeightCm?: number;
  };
  crownIncrementPerRound: number; // 頭頂の1段あたり増し目数（通常6）
}

export interface Project {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: ProjectMeta;
  rows: Row[];
}

export interface RowComputed {
  rowId: string;
  startNo: number;
  endNo: number;
  label: string; // "第3段" / "第7〜12段"
  stitchesIn: number;
  stitchesOut: number; // 「総目数」
  delta: number; // out - in
  valid: boolean;
  errors: string[];
  text: string; // 日本語の編み図テキスト
}

export interface ProjectComputed {
  rows: RowComputed[];
  totalRows: number;
  totalStitches: number;
  maxStitchesOut: number;
}
