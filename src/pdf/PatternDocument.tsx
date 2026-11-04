import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { AttachMarker } from '../chart/attachMarkers'
import type { ChartGeometry } from '../chart/geometry'
import type { Project, ProjectComputed, StitchKind } from '../domain/types'
import type { PartRender } from './partRender'
import PdfChart, { PdfLegendGlyph } from './PdfChart'
import { LEGEND_LABEL, legendKindsOf, partSummaries, specItems } from './patternInfo'
import { formatJaDate, patternBody } from './printText'

const makeStyles = (font: string) =>
  StyleSheet.create({
    page: { padding: 34, paddingBottom: 40, fontFamily: font, fontSize: 10, color: '#111111' },
    title: { fontSize: 20 },
    sub: { fontSize: 9, color: '#555555', marginTop: 2, marginBottom: 14 },
    chartTitle: { fontSize: 11, marginBottom: 6 },
    chartBox: { alignItems: 'center' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, fontSize: 9 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 4 },
    markerNote: { fontSize: 8, color: '#666666', marginTop: 4 },
    h2: { fontSize: 14, marginBottom: 8 },
    h2b: { fontSize: 12, marginTop: 8, marginBottom: 6 },
    thead: {
      flexDirection: 'row',
      borderBottomWidth: 1.2,
      borderBottomColor: '#111111',
      paddingBottom: 3,
      marginBottom: 2,
      fontSize: 9,
    },
    tr: {
      flexDirection: 'row',
      borderBottomWidth: 0.6,
      borderBottomColor: '#bbbbbb',
      paddingVertical: 4,
    },
    cLabel: { width: 76, paddingRight: 6 },
    cBody: { flex: 1, paddingRight: 6 },
    cCount: { width: 40, textAlign: 'right' },
    warn: { color: '#b91c1c', fontSize: 8 },
    specBlock: { marginTop: 22 },
    specGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    specCell: {
      width: '50%',
      flexDirection: 'row',
      borderBottomWidth: 0.6,
      borderBottomColor: '#999999',
      paddingVertical: 4,
      paddingRight: 10,
    },
    specKey: { width: 50, color: '#555555' },
    specVal: { flex: 1 },
    partRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.6,
      borderBottomColor: '#999999',
      paddingVertical: 4,
    },
    partKey: { width: 110, paddingRight: 6 },
    partVal: { flex: 1, fontSize: 9 },
    partTitle: { fontSize: 16, marginBottom: 2 },
    partInfo: { fontSize: 9, color: '#444444', marginBottom: 4 },
    noteText: { fontSize: 9, color: '#444444', marginBottom: 8 },
    pageNo: { position: 'absolute', bottom: 16, right: 34, fontSize: 8, color: '#777777' },
  })
type Styles = ReturnType<typeof makeStyles>

function Legend({ kinds, s }: { kinds: StitchKind[]; s: Styles }) {
  return (
    <View style={s.legend}>
      {kinds.map((k) => (
        <View key={k} style={s.legendItem}>
          <PdfLegendGlyph kind={k} />
          <Text style={{ marginLeft: 4 }}>{LEGEND_LABEL[k]}</Text>
        </View>
      ))}
    </View>
  )
}

/** 編み方の表。fixed なら、見出しを各ページに繰り返す */
function RowsTable({
  computed,
  s,
  fixed,
}: {
  computed: ProjectComputed
  s: Styles
  fixed: boolean
}) {
  return (
    <>
      <View fixed={fixed} style={s.thead}>
        <Text style={s.cLabel}>段</Text>
        <Text style={s.cBody}>編み方</Text>
        <Text style={s.cCount}>目数</Text>
      </View>
      {computed.rows.map((r) => (
        <View key={r.rowId} wrap={false} style={s.tr}>
          <View style={s.cLabel}>
            <Text>{r.label}</Text>
            {!r.valid && <Text style={s.warn}>要確認</Text>}
          </View>
          <Text style={s.cBody}>{patternBody(r.text)}</Text>
          <Text style={s.cCount}>{r.stitchesOut}</Text>
        </View>
      ))}
    </>
  )
}

interface Props {
  project: Project
  computed: ProjectComputed
  geometry: ChartGeometry
  fontFamily: string
  parts: PartRender[]
  markers: AttachMarker[]
}

export default function PatternDocument({
  project,
  computed,
  geometry,
  fontFamily,
  parts,
  markers,
}: Props) {
  const s = makeStyles(fontFamily)
  const title = project.meta.title || '無題'
  const summaries = partSummaries(project)
  const allKinds = legendKindsOf([geometry, ...parts.map((p) => p.geometry)])

  const pageNo = (
    <Text
      fixed
      style={s.pageNo}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  )

  /** パーツのページ（表が少なければ1ページ、多ければ「図」と「編み方」の2ページ） */
  const partPages = (pr: PartRender) => {
    const sm = summaries[pr.number - 1]
    const qty = pr.part.quantity > 1 ? ` ×${pr.part.quantity}` : ''
    const head = (
      <>
        <Text style={s.partTitle}>
          パーツ {pr.number}　{pr.part.name}
          {qty}
        </Text>
        <Text style={s.partInfo}>
          作る個数: {pr.part.quantity}個　接続位置:{' '}
          {sm.positions.length > 0 ? sm.positions.join('、') : '指定なし'}
        </Text>
        {sm.note ? <Text style={s.noteText}>メモ: {sm.note}</Text> : null}
      </>
    )

    if (pr.computed.rows.length === 0) {
      return [
        <Page key={`p${pr.number}`} size="A4" style={s.page}>
          {head}
          <Text style={s.partInfo}>（段がありません）</Text>
          {pageNo}
        </Page>,
      ]
    }

    const compact = pr.computed.rows.length <= 12
    const chart = (
      <View style={s.chartBox}>
        <PdfChart
          geometry={pr.geometry}
          size={compact ? 260 : 340}
          fontFamily={fontFamily}
        />
      </View>
    )
    const legend = <Legend kinds={legendKindsOf([pr.geometry])} s={s} />

    if (compact) {
      return [
        <Page key={`p${pr.number}`} size="A4" style={s.page}>
          {head}
          {chart}
          {legend}
          <Text style={s.h2b}>編み方</Text>
          <RowsTable computed={pr.computed} s={s} fixed={false} />
          {pageNo}
        </Page>,
      ]
    }
    return [
      <Page key={`p${pr.number}a`} size="A4" style={s.page}>
        {head}
        {chart}
        {legend}
        {pageNo}
      </Page>,
      <Page key={`p${pr.number}b`} size="A4" style={s.page}>
        <Text style={s.h2}>
          パーツ {pr.number}　{pr.part.name}　編み方
        </Text>
        <RowsTable computed={pr.computed} s={s} fixed />
        {pageNo}
      </Page>,
    ]
  }

  return (
    <Document title={title} author="帽子編み図ジェネレーター">
      {/* 1枚目: 編み図（別パーツの接続マーカー入り） */}
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.sub}>作成日: {formatJaDate(project.createdAt)}</Text>

        <Text style={s.chartTitle}>編み図（上から見た図。数字は段番号）</Text>
        <View style={s.chartBox}>
          <PdfChart
            geometry={geometry}
            size={480}
            fontFamily={fontFamily}
            markers={markers}
          />
        </View>

        <Legend kinds={allKinds} s={s} />
        {markers.length > 0 && (
          <Text style={s.markerNote}>
            色つきの丸の番号は、別パーツの接続位置です（「別パーツ」の番号と同じ）。
          </Text>
        )}
        {pageNo}
      </Page>

      {/* 2枚目以降: 編み方の表、材料・仕様、別パーツの一覧 */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>編み方</Text>
        <RowsTable computed={computed} s={s} fixed />

        <View wrap={false} style={s.specBlock}>
          <Text style={s.h2}>材料・仕様</Text>
          <View style={s.specGrid}>
            {specItems(project, computed).map(([k, v]) => (
              <View key={k} style={s.specCell}>
                <Text style={s.specKey}>{k}</Text>
                <Text style={s.specVal}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {summaries.length > 0 && (
          <View wrap={false} style={s.specBlock}>
            <Text style={s.h2}>別パーツ</Text>
            {summaries.map((p) => (
              <View key={p.number} style={s.partRow}>
                <Text style={s.partKey}>
                  {p.number}　{p.name}
                  {p.quantity > 1 ? ` ×${p.quantity}` : ''}
                </Text>
                <Text style={s.partVal}>
                  接続位置: {p.positions.length > 0 ? p.positions.join('、') : '指定なし'}
                  {p.note ? `\nメモ: ${p.note}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
        {pageNo}
      </Page>

      {/* パーツごとのページ */}
      {parts.flatMap(partPages)}
    </Document>
  )
}