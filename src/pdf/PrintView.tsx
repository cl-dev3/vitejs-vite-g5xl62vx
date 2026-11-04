import type { AttachMarker } from '../chart/attachMarkers'
import type { ChartGeometry } from '../chart/geometry'
import SvgChart from '../chart/SvgChart'
import MarkerOverlay from '../components/MarkerOverlay'
import type { Project, ProjectComputed, StitchKind } from '../domain/types'
import LegendGlyph from './LegendGlyph'
import type { PartRender } from './partRender'
import { LEGEND_LABEL, legendKindsOf, partSummaries, specItems } from './patternInfo'
import { formatJaDate, patternBody } from './printText'

interface Props {
  project: Project
  computed: ProjectComputed
  geometry: ChartGeometry
  parts: PartRender[]
  markers: AttachMarker[]
}

const FONT =
  "system-ui, 'Hiragino Sans', 'Noto Sans JP', 'Noto Sans CJK JP', 'Yu Gothic', sans-serif"

function Legend({ kinds }: { kinds: StitchKind[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2mm 6mm',
        marginTop: '4mm',
        fontSize: '9pt',
      }}
    >
      {kinds.map((k) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5mm' }}>
          <LegendGlyph kind={k} />
          {LEGEND_LABEL[k]}
        </span>
      ))}
    </div>
  )
}

function RowsTable({ computed }: { computed: ProjectComputed }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ display: 'table-header-group' }}>
        <tr style={{ borderBottom: '0.6mm solid #111', textAlign: 'left' }}>
          <th style={{ width: '26mm', padding: '1mm 0' }}>段</th>
          <th style={{ padding: '1mm 0' }}>編み方</th>
          <th style={{ width: '16mm', padding: '1mm 0', textAlign: 'right' }}>目数</th>
        </tr>
      </thead>
      <tbody>
        {computed.rows.map((r) => (
          <tr
            key={r.rowId}
            style={{
              breakInside: 'avoid',
              borderBottom: '0.3mm solid #bbb',
              verticalAlign: 'top',
            }}
          >
            <td style={{ padding: '1.2mm 2mm 1.2mm 0', whiteSpace: 'nowrap' }}>
              {r.valid ? '' : '⚠ '}
              {r.label}
            </td>
            <td style={{ padding: '1.2mm 2mm 1.2mm 0' }}>{patternBody(r.text)}</td>
            <td style={{ padding: '1.2mm 0', textAlign: 'right' }}>{r.stitchesOut}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const h2 = { fontWeight: 700, fontSize: '13pt', marginBottom: '3mm' } as const

export default function PrintView({ project, computed, geometry, parts, markers }: Props) {
  const { meta } = project
  const summaries = partSummaries(project)
  const allKinds = legendKindsOf([geometry, ...parts.map((p) => p.geometry)])
  const items = specItems(project, computed)

  return (
    <div style={{ color: '#111', fontSize: '10.5pt', fontFamily: FONT }}>
      {/* 1枚目: 編み図（別パーツの接続マーカー入り） */}
      <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0 }}>{meta.title || '無題'}</h1>
      <div style={{ fontSize: '9pt', color: '#555', marginBottom: '6mm' }}>
        作成日: {formatJaDate(project.createdAt)}
      </div>

      <div style={{ fontWeight: 700, marginBottom: '2mm' }}>
        編み図（上から見た図。数字は段番号）
      </div>
      <div style={{ position: 'relative', width: '170mm', height: '170mm', margin: '0 auto' }}>
        <SvgChart geometry={geometry} selectedRowId={null} />
        <MarkerOverlay geometry={geometry} markers={markers} />
      </div>

      <Legend kinds={allKinds} />
      {markers.length > 0 && (
        <div style={{ fontSize: '8pt', color: '#666', marginTop: '2mm' }}>
          色つきの丸の番号は、別パーツの接続位置です（「別パーツ」の番号と同じ）。
        </div>
      )}

      {/* 2枚目以降: 編み方の表、材料・仕様、別パーツの一覧 */}
      <div style={{ breakBefore: 'page', paddingTop: '2mm' }}>
        <div style={h2}>編み方</div>
        <RowsTable computed={computed} />

        <div style={{ breakInside: 'avoid', marginTop: '8mm' }}>
          <div style={h2}>材料・仕様</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '8mm' }}>
            {items.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  gap: '4mm',
                  borderBottom: '0.3mm solid #999',
                  padding: '1.2mm 0',
                }}
              >
                <span style={{ width: '20mm', flexShrink: 0, color: '#555' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {summaries.length > 0 && (
          <div style={{ breakInside: 'avoid', marginTop: '8mm' }}>
            <div style={h2}>別パーツ</div>
            {summaries.map((p) => (
              <div
                key={p.number}
                style={{
                  display: 'flex',
                  gap: '4mm',
                  borderBottom: '0.3mm solid #999',
                  padding: '1.5mm 0',
                  fontSize: '9.5pt',
                }}
              >
                <span style={{ width: '34mm', flexShrink: 0 }}>
                  {p.number}　{p.name}
                  {p.quantity > 1 ? ` ×${p.quantity}` : ''}
                </span>
                <span style={{ whiteSpace: 'pre-line' }}>
                  接続位置: {p.positions.length > 0 ? p.positions.join('、') : '指定なし'}
                  {p.note ? `\nメモ: ${p.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* パーツごとのページ */}
      {parts.map((pr) => {
        const sm = summaries[pr.number - 1]
        return (
          <div key={pr.part.id} style={{ breakBefore: 'page', paddingTop: '2mm' }}>
            <div style={{ fontSize: '15pt', fontWeight: 700 }}>
              パーツ {pr.number}　{pr.part.name}
              {pr.part.quantity > 1 ? ` ×${pr.part.quantity}` : ''}
            </div>
            <div style={{ fontSize: '9pt', color: '#444', margin: '1mm 0 3mm' }}>
              作る個数: {pr.part.quantity}個　接続位置:{' '}
              {sm.positions.length > 0 ? sm.positions.join('、') : '指定なし'}
              {sm.note && (
                <>
                  <br />
                  メモ: {sm.note}
                </>
              )}
            </div>
            {pr.computed.rows.length === 0 ? (
              <div style={{ fontSize: '9pt', color: '#666' }}>（段がありません）</div>
            ) : (
              <>
                <div style={{ width: '110mm', height: '110mm', margin: '0 auto' }}>
                  <SvgChart geometry={pr.geometry} selectedRowId={null} />
                </div>
                <Legend kinds={legendKindsOf([pr.geometry])} />
                <div style={{ ...h2, marginTop: '5mm' }}>編み方</div>
                <RowsTable computed={pr.computed} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}