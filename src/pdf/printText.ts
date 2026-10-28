/** 「第3段：（細編み1目、増し目）を6回繰り返す（計18目）」→ 本文だけ取り出す。
 *  段ラベルと総目数は、表の別の列に出すため取り除く */
export function patternBody(text: string): string {
  return text
    .replace(/^[^：]*：/, '')
    .replace(/（(?:各段 )?計\d+目）/, ' ')
    .trim();
}

/** 「2026年10月26日」形式。不正な日付は空文字 */
export function formatJaDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** PDFのファイル名（拡張子なし）: {title}_{YYYYMMDD} */
export function fileBaseName(title: string, date: Date): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '_').trim() || '無題';
  const ymd =
    String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  return `${safe}_${ymd}`;
}
