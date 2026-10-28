import SvgChart from '../chart/SvgChart';
import type { ChartGeometry } from '../chart/geometry';
import { SYMBOLS } from '../chart/symbols';
import type { Project, ProjectComputed } from '../domain/types';
import { KIND_ORDER, LEGEND_LABEL, specItems } from './patternInfo';
import { formatJaDate, patternBody } from './printText';

interface Props {
  project: Project;
  computed: ProjectComputed;
  geometry: ChartGeometry;
}

export default function PrintView({ project, computed, geometry }: Props) {
  const { meta } = project;
  const kinds = KIND_ORDER.filter((k) =>
    geometry.nodes.some((n) => n.kind === k)
  );
  const items = specItems(project, computed);

  return (
    <div
      style={{
        color: '#111',
        fontSize: '10.5pt',
        fontFamily:
          "system-ui, 'Hiragino Sans', 'Noto Sans JP', 'Noto Sans CJK JP', 'Yu Gothic', sans-serif",
      }}
    >
      {/* 1枚目: 編み図 */}
      <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0 }}>
        {meta.title || '無題'}
      </h1>
      <div style={{ fontSize: '9pt', color: '#555', marginBottom: '6mm' }}>
        作成日: {formatJaDate(project.createdAt)}
      </div>

      <div style={{ fontWeight: 700, marginBottom: '2mm' }}>
        編み図（上から見た図。数字は段番号）
      </div>
      <div style={{ width: '170mm', height: '170mm', margin: '0 auto' }}>
        <SvgChart geometry={geometry} selectedRowId={null} />
      </div>

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
          <span
            key={k}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.5mm',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="-8 -8 16 16"
              aria-hidden="true"
            >
              <path
                d={SYMBOLS[k].d}
                fill={SYMBOLS[k].filled ? '#111' : 'none'}
                stroke="#111"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {LEGEND_LABEL[k]}
          </span>
        ))}
      </div>

      {/* 2枚目以降: 編み方の表、そのあとに材料・仕様 */}
      <div style={{ breakBefore: 'page', paddingTop: '2mm' }}>
        <div style={{ fontWeight: 700, fontSize: '13pt', marginBottom: '3mm' }}>
          編み方
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ display: 'table-header-group' }}>
            <tr style={{ borderBottom: '0.6mm solid #111', textAlign: 'left' }}>
              <th style={{ width: '26mm', padding: '1mm 0' }}>段</th>
              <th style={{ padding: '1mm 0' }}>編み方</th>
              <th
                style={{ width: '16mm', padding: '1mm 0', textAlign: 'right' }}
              >
                目数
              </th>
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
                <td
                  style={{ padding: '1.2mm 2mm 1.2mm 0', whiteSpace: 'nowrap' }}
                >
                  {r.valid ? '' : '⚠ '}
                  {r.label}
                </td>
                <td style={{ padding: '1.2mm 2mm 1.2mm 0' }}>
                  {patternBody(r.text)}
                </td>
                <td style={{ padding: '1.2mm 0', textAlign: 'right' }}>
                  {r.stitchesOut}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ breakInside: 'avoid', marginTop: '8mm' }}>
          <div
            style={{ fontWeight: 700, fontSize: '13pt', marginBottom: '3mm' }}
          >
            材料・仕様
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '8mm',
            }}
          >
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
                <span style={{ width: '20mm', flexShrink: 0, color: '#555' }}>
                  {k}
                </span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
