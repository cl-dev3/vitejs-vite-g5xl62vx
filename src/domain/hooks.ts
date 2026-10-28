import type { Hook } from './types';

/** 号数マスタ（目安。メーカーにより差があります） */
export const HOOK_MASTER: Hook[] = [
  { label: '2/0号', mm: 2.0 },
  { label: '3/0号', mm: 2.3 },
  { label: '4/0号', mm: 2.5 },
  { label: '5/0号', mm: 3.0 },
  { label: '6/0号', mm: 3.5 },
  { label: '7/0号', mm: 4.0 },
  { label: '7.5/0号', mm: 4.5 },
  { label: '8/0号', mm: 5.0 },
  { label: '9/0号', mm: 5.5 },
  { label: '10/0号', mm: 6.0 },
];

/** 選択肢。現在の号数がマスタに無ければ先頭に足す */
export function hookOptions(current: Hook): Hook[] {
  return HOOK_MASTER.some((h) => h.label === current.label)
    ? HOOK_MASTER
    : [current, ...HOOK_MASTER];
}

export function hookDisplay(h: Hook): string {
  return `${h.label}（${h.mm.toFixed(1)}mm）`;
}
