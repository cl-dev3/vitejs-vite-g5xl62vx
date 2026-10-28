import { useMemo, useState } from 'react';
import { recalcForGauge } from '../domain/gauge';
import { hookDisplay, hookOptions } from '../domain/hooks';
import type { Project } from '../domain/types';
import Sheet from './Sheet';
import Stepper from './Stepper';

interface Props {
  project: Project;
  onApply: (next: Project) => void;
  onClose: () => void;
}

const fmt = (n: number) => n.toFixed(1);

export default function GaugeDialog({ project, onApply, onClose }: Props) {
  const { gauge, hook, target } = project.meta;
  const options = hookOptions(hook);

  const [hookLabel, setHookLabel] = useState(hook.label);
  const [stitches, setStitches] = useState(gauge.stitchesPer10cm);
  const [rows10, setRows10] = useState(gauge.rowsPer10cm);

  const newHook = options.find((h) => h.label === hookLabel) ?? hook;
  const result = useMemo(
    () =>
      recalcForGauge(
        project,
        { stitchesPer10cm: stitches, rowsPer10cm: rows10 },
        newHook
      ),
    [project, stitches, rows10, newHook]
  );
  const { before, after } = result;
  const diff = after.circumferenceCm - target.headCircumferenceCm;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';

  const cell = 'px-2 py-1.5 text-right';
  return (
    <Sheet
      title="ゲージ再計算"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-lg bg-slate-100 text-sm"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-lg bg-pink-500 text-sm text-white"
            onClick={() => onApply(result.next)}
          >
            この内容で適用
          </button>
        </div>
      }
    >
      <div className="text-sm text-slate-600">
        現在: {hookDisplay(hook)} ／ 10cm四方で {gauge.stitchesPer10cm}目 ×{' '}
        {gauge.rowsPer10cm}段
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">
          試し編みの実測値を入力（目標の頭囲 {target.headCircumferenceCm}cm）
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0">使用針</span>
          <select
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base"
            value={hookLabel}
            onChange={(e) => setHookLabel(e.target.value)}
          >
            {options.map((h) => (
              <option key={h.label} value={h.label}>
                {hookDisplay(h)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0">10cmの目数</span>
          <Stepper
            label="10cmの目数"
            value={stitches}
            min={1}
            max={99}
            onChange={setStitches}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0">10cmの段数</span>
          <Stepper
            label="10cmの段数"
            value={rows10}
            min={1}
            max={99}
            onChange={setRows10}
          />
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="px-2 py-1 text-left font-normal">差分プレビュー</th>
            <th className={`${cell} font-normal`}>適用前</th>
            <th className={`${cell} font-normal`}>適用後</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="px-2 py-1.5">周囲(cm)</td>
            <td className={cell}>{fmt(before.circumferenceCm)}</td>
            <td className={cell}>{fmt(after.circumferenceCm)}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="px-2 py-1.5">最大目数</td>
            <td className={cell}>{before.maxStitches}</td>
            <td className={cell}>{after.maxStitches}</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5">総段数</td>
            <td className={cell}>{before.totalRows}</td>
            <td className={cell}>{after.totalRows}</td>
          </tr>
        </tbody>
      </table>
      <div className="text-xs text-slate-600">
        目標との差: {sign}
        {fmt(Math.abs(diff))}cm（周囲は{result.targetStitches}目に丸めています）
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {result.warnings.map((w) => (
            <div key={w}>⚠ {w}</div>
          ))}
        </div>
      )}
      <div className="text-xs text-slate-500">
        適用後も「戻す」で元に戻せます。
      </div>
    </Sheet>
  );
}
