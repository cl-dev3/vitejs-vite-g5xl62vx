import { useCallback } from 'react'
import type { AttachMarker } from '../chart/attachMarkers'
import type { ChartGeometry } from '../chart/geometry'
import SvgChart from '../chart/SvgChart'
import { useZoomPan } from '../chart/useZoomPan'
import { detailLevel, effectiveScale } from '../chart/viewMath'
import MarkerOverlay from './MarkerOverlay'

interface Props {
  geometry: ChartGeometry
  selectedRowId?: string | null
  onSelectRow: (rowId: string) => void
  summary: string
  markers?: AttachMarker[]
  onSelectMarker?: (partId: string) => void
}

export default function ChartPreview({
  geometry,
  selectedRowId,
  onSelectRow,
  summary,
  markers = [],
  onSelectMarker,
}: Props) {
  const { ref, view, size, reset, wasDrag, handlers } = useZoomPan()

  const eff = effectiveScale(view.scale, size.w, size.h, geometry.bounds)
  const { showSymbols, showLabels } = detailLevel(eff)

  // ドラッグやピンチの直後のタップは、選択として扱わない
  const handleSelect = useCallback(
    (rowId: string) => {
      if (wasDrag()) return
      onSelectRow(rowId)
    },
    [wasDrag, onSelectRow],
  )
  const handleMarker = useCallback(
    (partId: string) => {
      if (wasDrag()) return
      onSelectMarker?.(partId)
    },
    [wasDrag, onSelectMarker],
  )

  return (
    <div
      ref={ref}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      {...handlers}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          transformOrigin: 'center center',
        }}
      >
        <SvgChart
          geometry={geometry}
          selectedRowId={selectedRowId}
          showSymbols={showSymbols}
          showLabels={showLabels}
          onSelectRow={handleSelect}
        />
        <MarkerOverlay geometry={geometry} markers={markers} onSelect={handleMarker} />
      </div>

      {geometry.rings.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">
          段を追加すると、ここに編み図が表示されます
        </div>
      )}

      <div className="pointer-events-none absolute left-2 top-1 text-xs text-slate-500">
        {summary}
      </div>
      <button
        type="button"
        aria-label="表示位置をリセット"
        className="absolute right-2 top-2 h-11 w-11 rounded-full border border-slate-200 bg-white/90 text-lg shadow-sm"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={reset}
      >
        ⌖
      </button>
    </div>
  )
}