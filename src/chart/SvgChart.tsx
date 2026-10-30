import { memo, useMemo } from 'react'
import type { Section } from '../domain/types'
import type {
  ChainInfo,
  ChartGeometry,
  ChartLink,
  IncGlyph,
  RingInfo,
  StitchNode,
  TurningMark,
} from './geometry'
import { SYMBOLS } from './symbols'

const RING_COLOR: Record<Section, string> = {
  crown: '#fbcfe8', // 頭頂
  body: '#bae6fd', // 本体
  brim: '#bbf7d0', // 縁
  free: '#e2e8f0', // その他
}
const BASE = '#64748b' // slate-500
const SELECT = '#ec4899'

/** リングの形（中心の線分の長さが0なら円、あれば角丸の長方形） */
function ringRect(ring: RingInfo) {
  return {
    x: -ring.halfLength - ring.radius,
    y: -ring.radius,
    width: 2 * (ring.halfLength + ring.radius),
    height: 2 * ring.radius,
    rx: ring.radius,
  }
}

interface ChainProps {
  chain: ChainInfo
  selected: boolean
  showSymbols: boolean
}

const ChainLayer = memo(function ChainLayer({ chain, selected, showSymbols }: ChainProps) {
  const color = selected ? SELECT : BASE
  const pts = chain.points
  return (
    <g pointerEvents="none">
      {showSymbols &&
        chain.links.map((l, i) => (
          <line
            key={i}
            x1={l.from[0]}
            y1={l.from[1]}
            x2={l.to[0]}
            y2={l.to[1]}
            stroke={selected ? '#f9a8d4' : '#cbd5e1'}
            strokeWidth={0.5}
          />
        ))}
      {!showSymbols && (
        <polyline
          points={pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
        />
      )}
      {pts.map((p, i) =>
        showSymbols ? (
          // 鎖編みの記号: 横に長い○を一直線に並べる
          <ellipse
            key={i}
            cx={p[0]}
            cy={p[1]}
            rx={6}
            ry={2.8}
            fill="#ffffff"
            stroke={color}
            strokeWidth={1.1}
          />
        ) : (
          <circle key={i} cx={p[0]} cy={p[1]} r={1.6} fill={color} />
        ),
      )}
    </g>
  )
})

interface LayerProps {
  ring: RingInfo
  nodes: StitchNode[]
  links: ChartLink[]
  incs: IncGlyph[]
  turning?: TurningMark
  selected: boolean
  showSymbols: boolean
  showLabels: boolean
  onSelect?: (rowId: string) => void
}

const RingLayer = memo(function RingLayer({
  ring,
  nodes,
  links,
  incs,
  turning,
  selected,
  showSymbols,
  showLabels,
  onSelect,
}: LayerProps) {
  const color = selected ? SELECT : BASE
  return (
    <g>
      <rect
        {...ringRect(ring)}
        fill="none"
        stroke={selected ? SELECT : RING_COLOR[ring.section]}
        strokeWidth={selected ? 1.2 : 0.8}
        strokeOpacity={selected ? 0.5 : 1}
      />
      {/* 親とのつながり（増し目はV記号で描くので、細い線は描かない） */}
      {showSymbols &&
        links
          .filter((l) => !l.inc)
          .map((l, i) => (
            <line
              key={i}
              x1={l.from[0]}
              y1={l.from[1]}
              x2={l.to[0]}
              y2={l.to[1]}
              stroke={selected ? '#f9a8d4' : '#cbd5e1'}
              strokeWidth={0.5}
            />
          ))}
      {/* 増し目（2目編み入れる）: 2目で1つのV記号 */}
      {showSymbols &&
        incs.flatMap((g, gi) =>
          g.segments.map((s, si) => (
            <line
              key={`i${gi}-${si}`}
              x1={s[0][0]}
              y1={s[0][1]}
              x2={s[1][0]}
              y2={s[1][1]}
              stroke={color}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          )),
        )}
      {nodes.map((n) => {
        if (!showSymbols) {
          // 低詳細度: 記号の代わりに点で描く
          return <circle key={n.index} cx={n.x} cy={n.y} r={1.6} fill={color} />
        }
        if (n.glyph) return null // 増し目のV記号に含まれる
        const sym = SYMBOLS[n.kind]
        return (
          <g
            key={n.index}
            transform={`translate(${n.x} ${n.y}) rotate(${((n.angle + n.tilt) * 180) / Math.PI + 90})`}
          >
            <path
              d={sym.d}
              fill={sym.filled ? color : 'none'}
              stroke={color}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      })}
      {/* 立ち上がりの鎖（○）と、編み終わりの引き抜き編み（●） */}
      {turning &&
        turning.points.map((p, i) =>
          showSymbols ? (
            <circle
              key={`t${i}`}
              cx={p[0]}
              cy={p[1]}
              r={2.2}
              fill="#ffffff"
              stroke={color}
              strokeWidth={1.1}
            />
          ) : (
            <circle key={`t${i}`} cx={p[0]} cy={p[1]} r={1.4} fill={color} />
          ),
        )}
      {turning?.join && (
        <circle
          cx={turning.join[0]}
          cy={turning.join[1]}
          r={showSymbols ? 1.8 : 1.4}
          fill={color}
        />
      )}
      {showLabels && (
        <text
          x={ring.labelPos[0]}
          y={ring.labelPos[1]}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={6}
          fill={color}
          stroke="#ffffff"
          strokeWidth={2}
          paintOrder="stroke"
        >
          {ring.label}
        </text>
      )}
      {/* タップ判定用の透明な太線（選択同期） */}
      <rect
        {...ringRect(ring)}
        fill="none"
        stroke="transparent"
        strokeWidth={11}
        pointerEvents="stroke"
        onClick={() => onSelect?.(ring.rowId)}
      />
    </g>
  )
})

interface Props {
  geometry: ChartGeometry
  selectedRowId?: string | null
  showSymbols?: boolean
  showLabels?: boolean
  onSelectRow?: (rowId: string) => void
}

function SvgChart({
  geometry,
  selectedRowId,
  showSymbols = true,
  showLabels = true,
  onSelectRow,
}: Props) {
  const layers = useMemo(() => {
    const nodeBy: StitchNode[][] = geometry.rings.map(() => [])
    const linkBy: ChartLink[][] = geometry.rings.map(() => [])
    const incBy: IncGlyph[][] = geometry.rings.map(() => [])
    const turnBy: (TurningMark | undefined)[] = geometry.rings.map(() => undefined)
    geometry.nodes.forEach((n) => nodeBy[n.rowIndex].push(n))
    geometry.links.forEach((l) => linkBy[l.rowIndex].push(l))
    geometry.incGlyphs.forEach((g) => incBy[g.rowIndex].push(g))
    geometry.turnings.forEach((t) => {
      turnBy[t.rowIndex] = t
    })
    return geometry.rings.map((ring, i) => ({
      ring,
      nodes: nodeBy[i],
      links: linkBy[i],
      incs: incBy[i],
      turning: turnBy[i],
    }))
  }, [geometry])

  const b = geometry.bounds
  return (
    <svg
      viewBox={`${-b} ${-b} ${2 * b} ${2 * b}`}
      className="h-full w-full"
      role="img"
      aria-label="編み図"
    >
      {geometry.chain && (
        <ChainLayer
          chain={geometry.chain}
          selected={geometry.chain.rowId === selectedRowId}
          showSymbols={showSymbols}
        />
      )}
      {layers.map((l) => (
        <RingLayer
          key={l.ring.rowIndex}
          ring={l.ring}
          nodes={l.nodes}
          links={l.links}
          incs={l.incs}
          turning={l.turning}
          selected={l.ring.rowId === selectedRowId}
          showSymbols={showSymbols}
          showLabels={showLabels}
          onSelect={onSelectRow}
        />
      ))}
    </svg>
  )
}

export default memo(SvgChart)