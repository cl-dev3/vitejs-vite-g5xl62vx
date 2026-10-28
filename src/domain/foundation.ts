import type { Foundation } from './types';

export const FOUNDATION_LIMITS = {
  chainsMin: 3,
  chainsMax: 99,
  endMin: 1,
  endMax: 9,
} as const;

/** 鎖の作り目の1周目の目数 = 直線部(鎖−2目)×両側 + 両端 */
export function foundationStitches(f: Foundation): number {
  return Math.max(0, 2 * (f.chains - 2) + 2 * f.endStitches);
}
