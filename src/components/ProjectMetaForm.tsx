import { useState } from 'react';
import { currentBodyHeightCm } from '../domain/gauge';
import { hookDisplay, hookOptions } from '../domain/hooks';
import type { Project, ProjectMeta } from '../domain/types';
import NumberField from './NumberField';
import Sheet from './Sheet';

const input =
  'min-h-11 w-full rounded-lg border border-slate-300 px-2 text-base';

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface Props {
  project: Project;
  onSave: (meta: ProjectMeta) => void;
  onClose: () => void;
}

export default function ProjectMetaForm({ project, onSave, onClose }: Props) {
  const m = project.meta;
  const initialHeight = currentBodyHeightCm(project);
  const options = hookOptions(m.hook);

  const [title, setTitle] = useState(m.title);
  const [yarnName, setYarnName] = useState(m.yarn.name);
  const [weightLabel, setWeightLabel] = useState(m.yarn.weightLabel ?? '');
  const [colorName, setColorName] = useState(m.yarn.colorName ?? '');
  const [hookLabel, setHookLabel] = useState(m.hook.label);
  const [headCm, setHeadCm] = useState(m.target.headCircumferenceCm);
  const [heightCm, setHeightCm] = useState(initialHeight);

  const save = () => {
    onSave({
      ...m,
      title: title.trim() || '無題',
      yarn: {
        name: yarnName.trim(),
        weightLabel: weightLabel.trim() || undefined,
        colorName: colorName.trim() || undefined,
      },
      hook: options.find((h) => h.label === hookLabel) ?? m.hook,
      target: {
        headCircumferenceCm: headCm,
        // 高さを触っていなければ、未指定のまま（段数から逆算）を保つ
        bodyHeightCm:
          heightCm === initialHeight ? m.target.bodyHeightCm : heightCm,
      },
    });
  };

  return (
    <Sheet
      title="作品の設定"
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
            onClick={save}
          >
            保存
          </button>
        </div>
      }
    >
      <Text label="タイトル" value={title} onChange={setTitle} />
      <Text label="糸の名前" value={yarnName} onChange={setYarnName} />
      <div className="grid grid-cols-2 gap-2">
        <Text label="太さ" value={weightLabel} onChange={setWeightLabel} />
        <Text label="色" value={colorName} onChange={setColorName} />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-500">使用針</span>
        <select
          className={`${input} bg-white`}
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

      <NumberField
        label="目標の頭囲"
        value={headCm}
        min={5}
        max={100}
        unit="cm"
        onChange={setHeadCm}
      />
      <NumberField
        label="本体の高さ"
        value={heightCm}
        min={0.5}
        max={50}
        unit="cm"
        onChange={setHeightCm}
      />

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        基準ゲージ: 10cm四方で {m.gauge.stitchesPer10cm}目 ×{' '}
        {m.gauge.rowsPer10cm}段。
        <br />
        頭囲・高さ・糸・針を変えたら、フッターの「ゲージ再計算」で目数・段数に反映します（ここでは段は変わりません）。
      </div>
    </Sheet>
  );
}
