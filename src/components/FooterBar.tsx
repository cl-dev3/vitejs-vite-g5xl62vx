interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onGauge: () => void;
  onPdf: () => void;
}

export default function FooterBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onGauge,
  onPdf,
}: Props) {
  const btn = 'min-h-11 rounded-lg bg-slate-100 text-xs disabled:opacity-40';
  return (
    <footer className="grid shrink-0 grid-cols-4 gap-1 border-t border-slate-200 bg-white p-2">
      <button
        type="button"
        className={btn}
        disabled={!canUndo}
        onClick={onUndo}
      >
        戻す
      </button>
      <button
        type="button"
        className={btn}
        disabled={!canRedo}
        onClick={onRedo}
      >
        進む
      </button>
      <button type="button" className={btn} onClick={onGauge}>
        ゲージ再計算
      </button>
      <button
        type="button"
        className="min-h-11 rounded-lg bg-pink-500 text-xs text-white"
        onClick={onPdf}
      >
        PDF出力
      </button>
    </footer>
  );
}
