import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ensureJapaneseFont, forgetJapaneseFont } from './fonts'

type FontApi = Parameters<typeof ensureJapaneseFont>[0]
const KEY = 'hatchart:v1:jpfont'

const fakeFont = () => ({
  register: vi.fn(),
  registerHyphenationCallback: vi.fn(),
})

function stubFetch(handler: (url: string) => { ok: boolean; type?: string }) {
  const f = vi.fn(async (url: string) => {
    const r = handler(url)
    return {
      ok: r.ok,
      headers: new Headers({ 'content-type': r.type ?? 'font/ttf' }),
    }
  })
  vi.stubGlobal('fetch', f)
  return f
}

function stubStorage(initial?: string) {
  const m = new Map<string, string>()
  if (initial) m.set(KEY, initial)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  })
  return m
}

beforeEach(() => {
  forgetJapaneseFont()
})
afterEach(() => vi.unstubAllGlobals())

describe('ensureJapaneseFont', () => {
  test('最初に見つかった候補を登録し、覚えておく', async () => {
    const mem = stubStorage()
    stubFetch((u) => ({ ok: u.includes('mplus1p') }))
    const font = fakeFont()
    const family = await ensureJapaneseFont(font as unknown as FontApi)
    expect(family).toBe('MPLUS1p')
    expect(font.register).toHaveBeenCalledTimes(1)
    expect(font.register).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'MPLUS1p' }),
    )
    expect(mem.get(KEY)).toContain('MPLUS1p')
  })

  test('HTMLが返ってくる候補（ファイル無し）は使わない', async () => {
    stubStorage()
    stubFetch((u) =>
      u.includes('/fonts/JP-')
        ? { ok: true, type: 'text/html' }
        : { ok: true, type: 'font/ttf' },
    )
    const family = await ensureJapaneseFont(fakeFont() as unknown as FontApi)
    expect(family).toBe('BIZUDPGothic')
  })

  test('覚えているフォントは、通信で確認せずに使う', async () => {
    stubStorage(JSON.stringify({ family: 'MPLUS1p', url: 'https://example.com/a.ttf' }))
    const f = stubFetch(() => ({ ok: false }))
    const font = fakeFont()
    const family = await ensureJapaneseFont(font as unknown as FontApi)
    expect(family).toBe('MPLUS1p')
    expect(f).not.toHaveBeenCalled()
    expect(font.register).toHaveBeenCalledWith({
      family: 'MPLUS1p',
      src: 'https://example.com/a.ttf',
    })
  })

  test('forget すると覚えていたフォントが消える', async () => {
    const mem = stubStorage(
      JSON.stringify({ family: 'MPLUS1p', url: 'https://example.com/a.ttf' }),
    )
    stubFetch(() => ({ ok: false }))
    await ensureJapaneseFont(fakeFont() as unknown as FontApi)
    forgetJapaneseFont()
    expect(mem.size).toBe(0)
  })

  test('どれも取れなければエラー。次回はやり直せる', async () => {
    stubStorage()
    stubFetch(() => ({ ok: false }))
    await expect(
      ensureJapaneseFont(fakeFont() as unknown as FontApi),
    ).rejects.toThrow('日本語フォント')

    stubFetch(() => ({ ok: true }))
    await expect(
      ensureJapaneseFont(fakeFont() as unknown as FontApi),
    ).resolves.toBeTruthy()
  })
})