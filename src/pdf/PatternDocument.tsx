import {
  Document,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ChartGeometry } from '../chart/geometry';
import type { Project, ProjectComputed } from '../domain/types';
import PdfChart, { Glyph } from './PdfChart';
import { LEGEND_LABEL, legendKinds, specItems } from './patternInfo';
import { formatJaDate, patternBody } from './printText';

const makeStyles = (font: string) =>
  StyleSheet.create({
    page: {
      padding: 34,
      paddingBottom: 40,
      fontFamily: font,
      fontSize: 10,
      color: '#111111',
    },
    title: { fontSize: 20 },
    sub: { fontSize: 9, color: '#555555', marginTop: 2, marginBottom: 14 },
    chartTitle: { fontSize: 11, marginBottom: 6 },
    chartBox: { alignItems: 'center' },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 10,
      fontSize: 9,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 14,
      marginBottom: 4,
    },
    h2: { fontSize: 14, marginBottom: 8 },
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
    pageNo: {
      position: 'absolute',
      bottom: 16,
      right: 34,
      fontSize: 8,
      color: '#777777',
    },
  });

interface Props {
  project: Project;
  computed: ProjectComputed;
  geometry: ChartGeometry;
  fontFamily: string;
}

export default function PatternDocument({
  project,
  computed,
  geometry,
  fontFamily,
}: Props) {
  const s = makeStyles(fontFamily);
  const title = project.meta.title || '無題';
  const kinds = legendKinds(geometry);

  const pageNo = (
    <Text
      fixed
      style={s.pageNo}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  );

  return (
    <Document title={title} author="帽子編み図ジェネレーター">
      {/* 1枚目: 編み図 */}
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.sub}>作成日: {formatJaDate(project.createdAt)}</Text>

        <Text style={s.chartTitle}>編み図（上から見た図。数字は段番号）</Text>
        <View style={s.chartBox}>
          <PdfChart geometry={geometry} size={480} fontFamily={fontFamily} />
        </View>

        <View style={s.legend}>
          {kinds.map((k) => (
            <View key={k} style={s.legendItem}>
              <Svg width={14} height={14} viewBox="-8 -8 16 16">
                <Glyph
                  kind={k}
                  x={0}
                  y={0}
                  angle={-Math.PI / 2}
                  color="#111111"
                />
              </Svg>
              <Text style={{ marginLeft: 4 }}>{LEGEND_LABEL[k]}</Text>
            </View>
          ))}
        </View>
        {pageNo}
      </Page>

      {/* 2枚目以降: 編み方の表、そのあとに材料・仕様 */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>編み方</Text>
        <View fixed style={s.thead}>
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
        {pageNo}
      </Page>
    </Document>
  );
}
