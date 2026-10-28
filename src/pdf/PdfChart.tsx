import {
  Circle,
  Ellipse,
  Line,
  Path,
  Rect,
  Svg,
  Text,
} from '@react-pdf/renderer';
import type { ChartGeometry } from '../chart/geometry';
import { symbolPath } from '../chart/symbolPath';
import { INC_LEAN_RAD, SYMBOLS } from '../chart/symbols';
import type { Section, StitchKind } from '../domain/types';

const RING_COLOR: Record<Section, string> = {
  crown: '#f9a8d4',
  body: '#7dd3fc',
  brim: '#86efac',
  free: '#cbd5e1',
};
const INK = '#1f2937';

interface GlyphProps {
  kind: StitchKind;
  x: number;
  y: number;
  angle: number; // 目の位置の外向きの角度（ラジアン）。頭が外向きになるよう回転する
  color: string;
}

/** 1目ぶんの記号 */
export function Glyph({ kind, x, y, angle, color }: GlyphProps) {
  if (kind === 'slst') return <Circle cx={x} cy={y} r={2} fill={color} />;
  if (kind === 'ch') {
    return (
      <Circle
        cx={x}
        cy={y}
        r={2.5}
        fill="none"
        stroke={color}
        strokeWidth={1.1}
      />
    );
  }
  return (
    <Path
      d={symbolPath(SYMBOLS[kind].d, x, y, angle + Math.PI / 2)}
      fill="none"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

interface Props {
  geometry: ChartGeometry;
  size: number; // 一辺(pt)
  fontFamily: string;
}

export default function PdfChart({ geometry, size, fontFamily }: Props) {
  const b = geometry.bounds;
  return (
    <Svg width={size} height={size} viewBox={`${-b} ${-b} ${2 * b} ${2 * b}`}>
      {geometry.rings.map((r) => (
        <Rect
          key={`ring${r.rowIndex}`}
          x={-r.halfLength - r.radius}
          y={-r.radius}
          width={2 * (r.halfLength + r.radius)}
          height={2 * r.radius}
          rx={r.radius}
          ry={r.radius}
          fill="none"
          stroke={RING_COLOR[r.section]}
          strokeWidth={0.8}
        />
      ))}
      {geometry.links.map((l, i) => (
        <Line
          key={`link${i}`}
          x1={l.from[0]}
          y1={l.from[1]}
          x2={l.to[0]}
          y2={l.to[1]}
          stroke="#cbd5e1"
          strokeWidth={0.5}
        />
      ))}
      {geometry.chain &&
        geometry.chain.links.map((l, i) => (
          <Line
            key={`cl${i}`}
            x1={l.from[0]}
            y1={l.from[1]}
            x2={l.to[0]}
            y2={l.to[1]}
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
        ))}
      {geometry.chain &&
        geometry.chain.points.map((p, i) => (
          <Ellipse
            key={`ch${i}`}
            cx={p[0]}
            cy={p[1]}
            rx={6}
            ry={2.8}
            fill="#ffffff"
            stroke={INK}
            strokeWidth={1.1}
          />
        ))}
      {geometry.nodes.map((n) => (
        <Glyph
          key={`n${n.rowIndex}-${n.index}`}
          kind={n.kind}
          x={n.x}
          y={n.y}
          angle={n.angle + n.lean * INC_LEAN_RAD}
          color={INK}
        />
      ))}
      {/* 立ち上がりの鎖（○）と、編み終わりの引き抜き編み（●） */}
      {geometry.turnings.flatMap((t) => [
        ...t.points.map((p, i) => (
          <Circle
            key={`tp${t.rowIndex}-${i}`}
            cx={p[0]}
            cy={p[1]}
            r={2}
            fill="#ffffff"
            stroke={INK}
            strokeWidth={1.1}
          />
        )),
        ...(t.join
          ? [
              <Circle
                key={`tj${t.rowIndex}`}
                cx={t.join[0]}
                cy={t.join[1]}
                r={1.8}
                fill={INK}
              />,
            ]
          : []),
      ])}
      {geometry.rings.map((r) => {
        const w = 3.8 * r.label.length + 2;
        return (
          <Rect
            key={`lb${r.rowIndex}`}
            x={r.labelPos[0] - w / 2}
            y={r.labelPos[1] - 3.5}
            width={w}
            height={7}
            fill="#ffffff"
          />
        );
      })}
      {geometry.rings.map((r) => (
        <Text
          key={`lt${r.rowIndex}`}
          x={r.labelPos[0]}
          y={r.labelPos[1] + 2.2}
          textAnchor="middle"
          fill="#111111"
          style={{ fontFamily, fontSize: 6 }}
        >
          {r.label}
        </Text>
      ))}
    </Svg>
  );
}
