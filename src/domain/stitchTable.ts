import type { StitchKind, Turning, Variant } from './types';

export const KIND_LABEL: Record<StitchKind, string> = {
  sc: '細編み',
  inc: '増し目',
  dec: '減らし目',
  hdc: '中長編み',
  dc: '長編み',
  slst: '引き抜き編み',
  ch: '鎖編み',
  hdc_inc: '中長編みの増し目',
  dc_inc: '長編みの増し目',
};

export const VARIANT_SUFFIX: Record<Variant, string> = {
  normal: '',
  blo: '（すじ編み）',
  flo: '（手前半目）',
};

// count===1 のとき数字を省略する種類（「増し目1目」ではなく「増し目」）
export const OMIT_ONE = new Set<StitchKind>([
  'inc',
  'dec',
  'hdc_inc',
  'dc_inc',
]);

// [消費(in), 生成(out)]
export const STITCH_IO: Record<StitchKind, readonly [number, number]> = {
  sc: [1, 1],
  hdc: [1, 1],
  dc: [1, 1],
  inc: [1, 2],
  hdc_inc: [1, 2],
  dc_inc: [1, 2],
  dec: [2, 1],
  slst: [1, 1],
  ch: [0, 1],
};

type BaseKind = 'sc' | 'hdc' | 'dc';

/** 増し目の種類 → 土台になる編み目 */
export const INC_BASE: Partial<Record<StitchKind, StitchKind>> = {
  inc: 'sc',
  hdc_inc: 'hdc',
  dc_inc: 'dc',
};
export const isIncKind = (k: StitchKind): boolean => INC_BASE[k] !== undefined;

/** 土台の編み目 → 増し目の種類 */
export const INC_OF: Record<BaseKind, StitchKind> = {
  sc: 'inc',
  hdc: 'hdc_inc',
  dc: 'dc_inc',
};

/** 標準の立ち上がり鎖の目数（細編み1・中長編み2・長編み3） */
export const STANDARD_TURNING: Record<BaseKind, number> = {
  sc: 1,
  hdc: 2,
  dc: 3,
};
export const TURNING_MAX = 6;

/** 立ち上がりの鎖を1目に数えるか（省略時は2目以上なら数える） */
export const isTurningCounted = (t: Turning): boolean =>
  t.counted ?? t.chains >= 2;
