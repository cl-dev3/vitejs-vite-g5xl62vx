import { describe, expect, test } from 'vitest';
import { stadiumPointCcw } from './stadium';

const R = 13;
const distToCore = (x: number, y: number, a: number) =>
  Math.hypot(x - Math.max(-a / 2, Math.min(a / 2, x)), y);

describe('stadiumPointCcw（反時計回り。右上から出発）', () => {
  test('a=0 なら円（12時から反時計回り）', () => {
    const P = 2 * Math.PI * R;
    for (const t of [0.05, 0.3, 0.5, 0.8, 0.97]) {
      const p = stadiumPointCcw(t * P, 0, R);
      const th = -Math.PI / 2 - 2 * Math.PI * t;
      expect(p.x).toBeCloseTo(R * Math.cos(th), 6);
      expect(p.y).toBeCloseTo(R * Math.sin(th), 6);
      expect(Math.cos(p.angle)).toBeCloseTo(Math.cos(th), 6);
      expect(Math.sin(p.angle)).toBeCloseTo(Math.sin(th), 6);
    }
  });

  test('出発点は右の半円の上端 (a/2, -R)。そこから上辺を左へ進む', () => {
    const a = 100;
    const s = stadiumPointCcw(0, a, R);
    expect(s.x).toBeCloseTo(a / 2, 6);
    expect(s.y).toBeCloseTo(-R, 6);
    expect(s.angle).toBeCloseTo(-Math.PI / 2, 6);
    const next = stadiumPointCcw(3, a, R);
    expect(next.x).toBeCloseTo(a / 2 - 3, 6);
    expect(next.y).toBeCloseTo(-R, 6);
  });

  test('順番: 上辺（右→左）→ 左の半円 → 下辺（左→右）→ 右の半円（下→上）', () => {
    const a = 100;
    const arc = Math.PI * R;
    const pts: [number, number, number][] = [
      [a, -a / 2, -R], // 上辺の左端
      [a + arc, -a / 2, R], // 左の半円の下端
      [2 * a + arc, a / 2, R], // 下辺の右端
    ];
    for (const [s, x, y] of pts) {
      const p = stadiumPointCcw(s, a, R);
      expect(p.x).toBeCloseTo(x, 6);
      expect(p.y).toBeCloseTo(y, 6);
    }
    const mid = stadiumPointCcw(2 * a + arc + arc / 2, a, R); // 右端
    expect(mid.x).toBeCloseTo(a / 2 + R, 6);
    expect(mid.y).toBeCloseTo(0, 6);
    const end = stadiumPointCcw(2 * a + 2 * arc - 1e-9, a, R); // 出発点の直前
    expect(end.x).toBeCloseTo(a / 2, 4);
    expect(end.y).toBeCloseTo(-R, 4);
  });

  test('どの点も中心の線分から半径R離れ、向きは外向き', () => {
    const a = 80;
    const P = 2 * a + 2 * Math.PI * R;
    for (let i = 0; i < 60; i++) {
      const p = stadiumPointCcw(((i + 0.5) / 60) * P, a, R);
      expect(distToCore(p.x, p.y, a)).toBeCloseTo(R, 5);
      expect(p.angle).toBeGreaterThan(-Math.PI);
      expect(p.angle).toBeLessThanOrEqual(Math.PI);
      const q = [p.x + Math.cos(p.angle), p.y + Math.sin(p.angle)];
      expect(distToCore(q[0], q[1], a)).toBeGreaterThan(R);
    }
  });
});
