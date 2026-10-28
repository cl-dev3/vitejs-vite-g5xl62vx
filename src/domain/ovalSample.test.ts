import { describe, expect, test } from 'vitest';
import { buildGeometry } from '../chart/geometry';
import { computeProject } from './compute';
import { createOvalSampleProject } from './sample';

describe('楕円サンプル', () => {
  test('22→28→34→40→40 で、すべて有効', () => {
    const p = createOvalSampleProject();
    const c = computeProject(p.rows);
    expect(c.rows.map((r) => r.stitchesOut)).toEqual([22, 28, 34, 40, 40]);
    expect(c.rows.every((r) => r.valid)).toBe(true);
    expect(c.totalRows).toBe(10);
  });

  test('座標が作れて、鎖がある', () => {
    const g = buildGeometry(createOvalSampleProject().rows);
    expect(g.rings).toHaveLength(10);
    expect(g.chain).not.toBeNull();
  });
});
