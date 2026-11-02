import type { AttachMarker } from '../chart/attachMarkers'
import type { ChartGeometry } from '../chart/geometry'

const COLORS = ['#7c3aed', '#0d9488', '#d97706', '#2563eb', '#db2777', '#65a30d']

interface Props {
  geometry: ChartGeometry
  markers: AttachMarker[]
  onSelect?: (partId: string) => void
}

/** チャートの上に重ねる、別パーツの接続マーカー（番号つきの丸） */
export default function MarkerOverlay({ geometry, markers, onSelect }: Props) {
  if (markers.length === 0) return null
  const b = geometry.bounds
  return (
    <svg
      viewBox={`${-b} ${-b} ${2 * b} ${2 * b}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {markers.map((m) => (
        <g
          key={m.attachmentId}
          className="pointer-events-auto cursor-pointer"
          onClick={() => onSelect?.(m.partId)}
        >
          <circle
            cx={m.x}
            cy={m.y}
            r={5.5}
            fill={COLORS[(m.number - 1) % COLORS.length]}
            stroke="#ffffff"
            strokeWidth={1}
          />
          <text
            x={m.x}
            y={m.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={6.5}
            fill="#ffffff"
          >
            {m.number}
          </text>
        </g>
      ))}
    </svg>
  )
}