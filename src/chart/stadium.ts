export interface PathPoint {
  x: number;
  y: number;
  angle: number; // 外向きの方向（ラジアン）
}

/**
 * 角丸の長方形（スタジアム形）の外周上の点（時計回り版）。
 * 中心は長さ a の線分（-a/2〜a/2）、半径 R。s は出発点からの道のり（0〜外周）。
 * 出発点は右の半円の上端 (a/2, -R) で、時計回り。a=0 なら円（12時から時計回り）。
 */
export function stadiumPoint(s: number, a: number, R: number): PathPoint {
  const arc = Math.PI * R; // 半円の長さ

  if (s < arc) {
    const th = -Math.PI / 2 + s / R;
    return { x: a / 2 + R * Math.cos(th), y: R * Math.sin(th), angle: th };
  }
  if (s < arc + a) {
    return { x: a / 2 - (s - arc), y: R, angle: Math.PI / 2 };
  }
  if (s < 2 * arc + a) {
    const th = Math.PI / 2 + (s - arc - a) / R;
    return { x: -a / 2 + R * Math.cos(th), y: R * Math.sin(th), angle: th };
  }
  return { x: -a / 2 + (s - 2 * arc - a), y: -R, angle: -Math.PI / 2 };
}

function normalize(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * 反時計回り版（編み図は反時計回りに読み進める）。
 * 出発点は右の半円の上端 (a/2, -R)（右上）。a=0 なら円（12時から反時計回り）。
 * 順番: 上辺（右→左）→ 左の半円（上→下）→ 下辺（左→右）→ 右の半円（下→上）
 */
export function stadiumPointCcw(s: number, a: number, R: number): PathPoint {
  const arc = Math.PI * R; // 半円の長さ

  if (s < a) {
    return { x: a / 2 - s, y: -R, angle: -Math.PI / 2 };
  }
  if (s < a + arc) {
    const th = -Math.PI / 2 - (s - a) / R;
    return {
      x: -a / 2 + R * Math.cos(th),
      y: R * Math.sin(th),
      angle: normalize(th),
    };
  }
  if (s < 2 * a + arc) {
    return { x: -a / 2 + (s - a - arc), y: R, angle: Math.PI / 2 };
  }
  const th = Math.PI / 2 - (s - 2 * a - arc) / R;
  return {
    x: a / 2 + R * Math.cos(th),
    y: R * Math.sin(th),
    angle: normalize(th),
  };
}
