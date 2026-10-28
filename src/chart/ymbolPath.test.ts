import { describe, expect, test } from 'vitest';
import { SYMBOLS } from './symbols';
import { symbolPath } from './symbolPath';

describe('symbolPath', () => {
  test('回転なしなら平行移動だけ', () => {
    expect(symbolPath('M-3,-3 L3,3 M3,-3 L-3,3', 10, 20, 0)).toBe(
      'M7 17 L13 23 M13 17 L7 23'
    );
  });

  test('90度回転（時計回り）', () => {
    expect(symbolPath('M-3,-3 L3,3', 0, 0, Math.PI / 2)).toBe('M3 -3 L-3 3');
  });

  test('小数を含む記号でもコマンド数が変わらず、NaNにならない', () => {
    const out = symbolPath(SYMBOLS.dc.d, 1, 2, 0.7);
    expect(out.match(/[ML]/g)).toHaveLength(6);
    expect(out).not.toContain('NaN');
  });
});
