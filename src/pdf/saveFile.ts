/** Blob をダウンロードとして保存する（ボタンのタップ中に呼ぶこと） */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** ファイルの共有（Web Share API）が使えるか */
export function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  );
}

export async function shareFile(file: File, title: string): Promise<void> {
  await navigator.share({ files: [file], title });
}
