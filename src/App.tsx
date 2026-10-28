import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGeometry } from './chart/geometry';
import AppShell from './components/AppShell';
import ChartPreview from './components/ChartPreview';
import FooterBar from './components/FooterBar';
import GaugeDialog from './components/GaugeDialog';
import PdfExportDialog from './components/PdfExportDialog';
import ProjectMetaForm from './components/ProjectMetaForm';
import RowCardList from './components/RowCardList';
import RowEditorSheet from './components/RowEditorSheet';
import { computeProject } from './domain/compute';
import { contextForIndex, createDraft, type EditContext } from './domain/draft';
import type { Row } from './domain/types';
import { exportPdf, type PdfState } from './pdf/exportPdf';
import PrintView from './pdf/PrintView';
import { fileBaseName } from './pdf/printText';
import { useProjectStore } from './store/projectStore';
import { createOvalSampleProject } from './domain/sample';

interface Editing {
  isNew: boolean;
  afterId?: string;
  row: Row;
  context: EditContext;
}

export default function App() {
  const project = useProjectStore((s) => s.project);
  const rows = project.rows;
  const crownIncrement = project.meta.crownIncrementPerRound;
  const selectedRowId = useProjectStore((s) => s.selectedRowId);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const selectRow = useProjectStore((s) => s.selectRow);
  const addRow = useProjectStore((s) => s.addRow);
  const updateRow = useProjectStore((s) => s.updateRow);
  const removeRow = useProjectStore((s) => s.removeRow);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const applyGaugeRecalc = useProjectStore((s) => s.applyGaugeRecalc);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const resetToSample = useProjectStore((s) => s.resetToSample);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [draftRow, setDraftRow] = useState<Row | null>(null);
  const [dialog, setDialog] = useState<'gauge' | 'meta' | null>(null);
  const [printing, setPrinting] = useState(false);
  const [pdf, setPdf] = useState<PdfState>({ status: 'idle' });
  const pdfToken = useRef(0);

  const computed = useMemo(() => computeProject(rows), [rows]);

  // 編集中は、下書きを反映した仮の段リストでチャートを描く
  const previewRows = useMemo(() => {
    if (!editing || !draftRow) return rows;
    if (editing.isNew) {
      const i = editing.afterId
        ? rows.findIndex((r) => r.id === editing.afterId)
        : -1;
      const at = i < 0 ? rows.length : i + 1;
      const next = [...rows];
      next.splice(at, 0, draftRow);
      return next;
    }
    return rows.map((r) => (r.id === draftRow.id ? draftRow : r));
  }, [rows, editing, draftRow]);

  const geometry = useMemo(() => buildGeometry(previewRows), [previewRows]);
  const previewTotals = useMemo(
    () => computeProject(previewRows),
    [previewRows]
  );
  const chartSelectedId = editing ? editing.row.id : selectedRowId;

  // 印刷用の座標（印刷するときだけ計算する）
  const printGeometry = useMemo(
    () => (printing ? buildGeometry(rows) : null),
    [printing, rows]
  );

  // 印刷画面を描画してから、印刷ダイアログを開く（8aの方式。フォールバック用）
  const title = project.meta.title;
  useEffect(() => {
    if (!printing) return;
    const prevTitle = document.title;
    document.title = fileBaseName(title, new Date());
    const done = () => {
      document.title = prevTitle;
      setPrinting(false);
    };
    window.addEventListener('afterprint', done);
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', done);
      document.title = prevTitle;
    };
  }, [printing, title]);

  const confirmInvalid = () => {
    const bad = computed.rows.filter((r) => !r.valid).length;
    return (
      bad === 0 ||
      window.confirm(
        `目数が合わない段が${bad}段あります。このまま出力しますか？`
      )
    );
  };

  const startPdf = async () => {
    if (!confirmInvalid()) return;
    const token = ++pdfToken.current;
    setPdf({ status: 'working' });
    try {
      const r = await exportPdf(project);
      if (pdfToken.current === token) setPdf({ status: 'done', ...r });
    } catch (e) {
      if (pdfToken.current === token) {
        setPdf({
          status: 'error',
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  };

  const closePdf = () => {
    pdfToken.current++; // 作成中の結果は捨てる
    setPdf({ status: 'idle' });
  };

  const printInstead = () => {
    closePdf();
    if (printing) window.print();
    else setPrinting(true);
  };

  const closeEditor = () => {
    setEditing(null);
    setDraftRow(null);
  };

  const openNew = () => {
    const d = createDraft(rows);
    setEditing({ isNew: true, row: d.row, context: d.context });
  };

  const openEdit = (id: string) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return;
    selectRow(id);
    setEditing({
      isNew: false,
      row: rows[i],
      context: contextForIndex(rows, i),
    });
  };

  const handleSave = (row: Row) => {
    if (!editing) return;
    if (editing.isNew) {
      addRow(editing.afterId, {
        kind: row.kind,
        section: row.section,
        units: row.units,
        repeat: row.repeat,
        rowSpan: row.rowSpan,
        note: row.note,
      });
    } else {
      updateRow(editing.row.id, row);
    }
    closeEditor();
  };

  const handleRemove = (id: string) => {
    if (window.confirm('この段を削除しますか？（「戻す」で元に戻せます）')) {
      removeRow(id);
    }
  };

  const handleReset = () => {
    if (
      window.confirm('サンプルの状態に戻しますか？（「戻す」で取り消せます）')
    ) {
      resetToSample();
    }
  };
  const handleOvalSample = () => {
    if (
      window.confirm(
        '楕円（鎖の作り目スタート）のサンプルに切り替えますか？（「戻す」で取り消せます）'
      )
    ) {
      applyGaugeRecalc(createOvalSampleProject());
    }
  };

  const headerBtn = 'min-h-10 px-2 text-xs text-slate-500 underline';

  return (
    <>
      <div className="print:hidden">
        <AppShell
          title={project.meta.title || '無題'}
          headerAction={
            <div className="flex items-center">
              <button
                type="button"
                className={headerBtn}
                onClick={() => setDialog('meta')}
              >
                設定
              </button>
              <button type="button" className={headerBtn} onClick={handleReset}>
                サンプルに戻す
              </button>

              <button
                type="button"
                className={headerBtn}
                onClick={handleOvalSample}
              >
                楕円サンプル
              </button>
            </div>
          }
          preview={
            <ChartPreview
              geometry={geometry}
              selectedRowId={chartSelectedId}
              onSelectRow={selectRow}
              summary={`全${previewTotals.totalRows}段・最大${previewTotals.maxStitchesOut}目`}
            />
          }
          footer={
            <FooterBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onGauge={() => setDialog('gauge')}
              onPdf={startPdf}
            />
          }
        >
          <RowCardList
            rows={computed.rows}
            selectedRowId={selectedRowId}
            onSelect={selectRow}
            onEdit={openEdit}
            onRemove={handleRemove}
            onAdd={openNew}
          />
        </AppShell>

        {editing && (
          <RowEditorSheet
            key={editing.row.id}
            title={
              editing.isNew
                ? '段を追加'
                : `${
                    computed.rows.find((r) => r.rowId === editing.row.id)
                      ?.label ?? ''
                  }を編集`
            }
            initial={editing.row}
            context={editing.context}
            crownIncrement={crownIncrement}
            onDraftChange={setDraftRow}
            onSave={handleSave}
            onCancel={closeEditor}
          />
        )}

        {dialog === 'gauge' && (
          <GaugeDialog
            project={project}
            onApply={(next) => {
              applyGaugeRecalc(next);
              setDialog(null);
            }}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog === 'meta' && (
          <ProjectMetaForm
            project={project}
            onSave={(meta) => {
              updateMeta(meta);
              setDialog(null);
            }}
            onClose={() => setDialog(null)}
          />
        )}

        {pdf.status !== 'idle' && (
          <PdfExportDialog
            state={pdf}
            onClose={closePdf}
            onPrint={printInstead}
          />
        )}
      </div>

      {printing && printGeometry && (
        <div className="hidden print:block">
          <PrintView
            project={project}
            computed={computed}
            geometry={printGeometry}
          />
        </div>
      )}
    </>
  );
}
