import { useCallback } from 'react';
import { effectiveScale, detailLevel } from '../chart/viewMath';
import type { ChartGeometry } from '../chart/geometry';
import SvgChart from '../chart/SvgChart';
import { useZoomPan } from '../chart/useZoomPan';

interface Props {
  geometry: ChartGeometry;
  selectedRowId?: string | null;
  onSelectRow: (rowId: string) => void;
  summary: string;
}

export default function ChartPreview({
  geometry,
  selectedRowId,
  onSelectRow,
  summary,
}: Props) {
  const { ref, view, size, reset, wasDrag, handlers } = useZoomPan();

  const eff = effectiveScale(view.scale, size.w, size.h, geometry.bounds);
  const { showSymbols, showLabels } = detailLevel(eff);

  // ドラッグやピンチの直後のタップはリング選択として扱わない
  const handleSelect = useCallback(
    (rowId: string) => {
      if (wasDrag()) return;
      onSelectRow(rowId);
    },
    [wasDrag, onSelectRow]
  );

  return (
    <div
      ref={ref}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      {...handlers}
    >
      <div
        className="h-full w-full"
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
      </div>

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
  );
}
