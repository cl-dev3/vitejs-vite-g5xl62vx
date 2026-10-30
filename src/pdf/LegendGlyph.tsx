import { incLegendSegments } from '../chart/incShape'
import { SYMBOLS } from '../chart/symbols'
import type { StitchKind } from '../domain/types'

/** 印刷方式の凡例の記号（増し目は、2目で1つのV記号） */
export default function LegendGlyph({ kind }: { kind: StitchKind }) {
  const sym = SYMBOLS[kind]
  const inc = incLegendSegments(kind)
  const stroke = {
    stroke: '#111',
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg width="24" height="16" viewBox="-12 -13 24 16" aria-hidden="true">
      {inc ? (
        inc.map((s, i) => (
          <line
            key={i}
            x1={s[0][0]}
            y1={s[0][1]}
            x2={s[1][0]}
            y2={s[1][1]}
            {...stroke}
          />
        ))
      ) : (
        <g transform="translate(0 -5)">
          <path d={sym.d} fill={sym.filled ? '#111' : 'none'} {...stroke} />
        </g>
      )}
    </svg>
  )
}