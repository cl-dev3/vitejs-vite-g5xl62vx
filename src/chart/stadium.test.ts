import { describe, expect, test } from 'vitest';
import { stadiumPoint } from './stadium';

const R = 13;
const dist = (x: number, y: number, a: number) =>
  Math.hypot(x - Math.max(-a / 2, Math.min(a / 2, x)), y);

describe('stadiumPoint', () => {
  test('a=0 なら円（12時から時計回り）', () => {
    const P = 2 * Math.PI * R;
    for (const t of [0.05, 0.3, 0.5, 0.8, 0.97]) {
      const p = stadiumPoint(t * P, 0, R);
      const th = -Math.PI / 2 + 2 * Math.PI * t;
      expect(p.x).toBeCloseTo(R * Math.cos(th), 6);
      expect(p.y).toBeCloseTo(R * Math.sin(th), 6);
      expect(p.angle).toBeCloseTo(th, 6);
    }
  });

  test('出発点と各区間のつなぎ目', () => {
    const a = 100;
    const arc = Math.PI * R;
    const start = stadiumPoint(0, a, R);
    expect([start.x, start.y]).toEqual([a / 2, -R]);
    expect(start.angle).toBeCloseTo(-Math.PI / 2, 6);

    const bottomRight = stadiumPoint(arc, a, R);
    expect(bottomRight.x).toBeCloseTo(a / 2, 6);
    expect(bottomRight.y).toBeCloseTo(R, 6);

    const bottomLeft = stadiumPoint(arc + a, a, R);
    expect(bottomLeft.x).toBeCloseTo(-a / 2, 6);
    expect(bottomLeft.y).toBeCloseTo(R, 6);

    const topLeft = stadiumPoint(2 * arc + a, a, R);
    expect(topLeft.x).toBeCloseTo(-a / 2, 6);
    expect(topLeft.y).toBeCloseTo(-R, 6);
  });

  test('どの点も、中心の線分から半径Rだけ離れている', () => {
    const a = 80;
    const P = 2 * a + 2 * Math.PI * R;
    for (let i = 0; i < 60; i++) {
      const p = stadiumPoint(((i + 0.5) / 60) * P, a, R);
      expect(dist(p.x, p.y, a)).toBeCloseTo(R, 5);
    }
  });

  test('下辺は下向き、上辺は上向き', () => {
    const a = 80;
    const arc = Math.PI * R;
    expect(stadiumPoint(arc + a / 2, a, R).angle).toBeCloseTo(Math.PI / 2, 6);
    expect(stadiumPoint(2 * arc + a + a / 2, a, R).angle).toBeCloseTo(
      -Math.PI / 2,
      6
    );
  });
});
