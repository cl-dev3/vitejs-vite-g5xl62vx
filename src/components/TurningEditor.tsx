import { TURNING_MAX } from '../domain/stitchTable';
import type { Turning } from '../domain/types';
import Stepper from './Stepper';

interface Props {
  turning: Turning | undefined;
  counted: boolean; // 1目に数えるか（省略時の既定も反映済み）
  standard: Turning | undefined; // 編み目から決まる標準の立ち上がり
  hint: string;
  onChange: (t: Turning | undefined) => void;
}

export default function TurningEditor({
  turning,
  counted,
  standard,
  hint,
  onChange,
}: Props) {
  const tab = (active: boolean) =>
    `min-h-11 flex-1 rounded-lg text-sm ${
      active ? 'bg-pink-500 text-white' : 'bg-slate-100'
    }`;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        <span className="w-28 text-sm">立ち上がり</span>
        <div className="flex flex-1 gap-2">
          <button
            type="button"
            className={tab(!turning)}
            onClick={() => onChange(undefined)}
          >
            なし
          </button>
          <button
            type="button"
            className={tab(!!turning)}
            onClick={() => onChange(turning ?? standard ?? { chains: 1 })}
          >
            つける
          </button>
        </div>
      </div>

      {turning && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-28 text-sm">鎖の目数</span>
            <Stepper
              label="立ち上がりの鎖"
              value={turning.chains}
              min={1}
              max={TURNING_MAX}
              onChange={(chains) => onChange({ ...turning, chains })}
            />
            <button
              type="button"
              disabled={!standard}
              className="min-h-11 rounded-lg bg-slate-100 px-3 text-sm disabled:opacity-35"
              onClick={() =>
                standard && onChange({ ...turning, chains: standard.chains })
              }
            >
              標準
            </button>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={counted}
              onChange={(e) =>
                onChange({ ...turning, counted: e.target.checked })
              }
            />
            立ち上がりを1目に数える
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={!!turning.join}
              onChange={(e) => onChange({ ...turning, join: e.target.checked })}
            />
            最後に引き抜き編みで輪にする
          </label>
          <div className="text-xs text-slate-500">{hint}</div>
        </>
      )}
    </div>
  );
}
