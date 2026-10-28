import { useMemo, useState } from 'react';
import type { PdfState } from '../pdf/exportPdf';
import { canShareFile, downloadBlob, shareFile } from '../pdf/saveFile';
import Sheet from './Sheet';

interface Props {
  state: Exclude<PdfState, { status: 'idle' }>;
  onClose: () => void;
  onPrint: () => void; // うまくいかないとき用: 印刷方式で保存
}

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`;

export default function PdfExportDialog({ state, onClose, onPrint }: Props) {
  const file = useMemo(
    () =>
      state.status === 'done'
        ? new File([state.blob], state.fileName, { type: 'application/pdf' })
        : null,
    [state]
  );
  const [note, setNote] = useState('');

  const share = async () => {
    if (!file) return;
    try {
      await shareFile(file, file.name);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setNote('共有できませんでした。「保存する」を使ってください');
      }
    }
  };

  const btn = 'min-h-11 flex-1 rounded-lg bg-slate-100 text-sm';
  const primary = 'min-h-11 flex-1 rounded-lg bg-pink-500 text-sm text-white';

  return (
    <Sheet
      title="PDF出力"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {state.status === 'done' && file && (
            <>
              <button
                type="button"
                className={primary}
                onClick={() => downloadBlob(state.blob, state.fileName)}
              >
                保存する
              </button>
              {canShareFile(file) && (
                <button type="button" className={btn} onClick={share}>
                  共有する
                </button>
              )}
            </>
          )}
          {state.status === 'error' && (
            <button type="button" className={primary} onClick={onPrint}>
              印刷方式で保存
            </button>
          )}
          <button type="button" className={btn} onClick={onClose}>
            {state.status === 'working' ? 'キャンセル' : '閉じる'}
          </button>
        </div>
      }
    >
      {state.status === 'working' && (
        <div className="space-y-2 text-sm">
          <div>PDFを作成しています…</div>
          <div className="text-xs text-slate-500">
            初回は、日本語フォントのダウンロードで数十秒かかることがあります。
          </div>
        </div>
      )}

      {state.status === 'done' && (
        <div className="space-y-2 text-sm">
          <div>PDFができました。</div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            {state.fileName}（{sizeText(state.blob.size)}）
            <br />
            日本語フォント: {state.fontFamily}
          </div>
          {note && <div className="text-xs text-red-600">{note}</div>}
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-2 text-sm">
          <div className="text-red-600">PDFを作成できませんでした。</div>
          <div className="break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            {state.message}
          </div>
          <div className="text-xs text-slate-500">
            ネットワークに接続されているか確認してください。代わりに、印刷方式（PDFに保存）で出力できます。
          </div>
        </div>
      )}
    </Sheet>
  );
}
