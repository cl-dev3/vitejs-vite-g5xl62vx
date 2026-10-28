/**
 * 記号パス（M/L だけ・原点中心）を回転し、(x, y) へ移動した新しいパス文字列を返す。
 * rotation はラジアン（SVGの rotate と同じく時計回りが正）。
 */
export function symbolPath(
  d: string,
  x: number,
  y: number,
  rotation: number
): string {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const fmt = (n: number) => String(Math.round(n * 100) / 100);
  return d.replace(
    /([ML])\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/g,
    (_m, cmd: string, px: string, py: string) => {
      const a = Number(px);
      const b = Number(py);
      return `${cmd}${fmt(x + a * cos - b * sin)} ${fmt(
        y + a * sin + b * cos
      )}`;
    }
  );
}
