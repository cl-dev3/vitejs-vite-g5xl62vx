import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ensureJapaneseFont, resetFontCache } from './fonts';

type FontApi = Parameters<typeof ensureJapaneseFont>[0];
const fakeFont = () => ({
  register: vi.fn(),
  registerHyphenationCallback: vi.fn(),
});

function stubFetch(handler: (url: string) => { ok: boolean; type?: string }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const r = handler(url);
      return {
        ok: r.ok,
        headers: new Headers({ 'content-type': r.type ?? 'font/ttf' }),
      };
    })
  );
}

beforeEach(() => resetFontCache());
afterEach(() => vi.unstubAllGlobals());

describe('ensureJapaneseFont', () => {
  test('最初に見つかった候補を登録する', async () => {
    stubFetch((u) => ({ ok: u.includes('mplus1p') }));
    const font = fakeFont();
    const family = await ensureJapaneseFont(font as unknown as FontApi);
    expect(family).toBe('MPLUS1p');
    expect(font.register).toHaveBeenCalledTimes(1);
    expect(font.register).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'MPLUS1p' })
    );
  });

  test('HTMLが返ってくる候補（ファイル無し）は使わない', async () => {
    stubFetch((u) =>
      u.includes('/fonts/JP-')
        ? { ok: true, type: 'text/html' }
        : { ok: true, type: 'font/ttf' }
    );
    const family = await ensureJapaneseFont(fakeFont() as unknown as FontApi);
    expect(family).toBe('BIZUDPGothic');
  });

  test('どれも取れなければエラー。次回はやり直せる', async () => {
    stubFetch(() => ({ ok: false }));
    await expect(
      ensureJapaneseFont(fakeFont() as unknown as FontApi)
    ).rejects.toThrow('日本語フォント');

    stubFetch(() => ({ ok: true }));
    await expect(
      ensureJapaneseFont(fakeFont() as unknown as FontApi)
    ).resolves.toBeTruthy();
  });
});
