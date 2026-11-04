type FontApi = (typeof import('@react-pdf/renderer'))['Font']

const HOSTS = [
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/',
]
// いずれも静的TTF（react-pdf は可変フォントを扱えない）
const FAMILIES = [
  { family: 'BIZUDPGothic', path: 'bizudpgothic/BIZUDPGothic-Regular.ttf' },
  { family: 'MPLUS1p', path: 'mplus1p/MPLUS1p-Regular.ttf' },
  { family: 'SawarabiGothic', path: 'sawarabigothic/SawarabiGothic-Regular.ttf' },
]

interface Candidate {
  family: string
  url: string
}

const CANDIDATES: Candidate[] = [
  // 自分でフォントを置いたとき用（public/fonts/JP-Regular.ttf）。最優先
  { family: 'LocalJP', url: `${import.meta.env.BASE_URL}fonts/JP-Regular.ttf` },
  ...FAMILIES.flatMap((f) =>
    HOSTS.map((h) => ({ family: f.family, url: h + f.path })),
  ),
]

const STORE_KEY = 'hatchart:v1:jpfont'

function loadStored(): Candidate | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null
    if (!raw) return null
    const c = JSON.parse(raw) as Partial<Candidate>
    return typeof c.family === 'string' && typeof c.url === 'string'
      ? { family: c.family, url: c.url }
      : null
  } catch {
    return null
  }
}

function saveStored(c: Candidate): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(c))
  } catch {
    /* 保存できなくても動く */
  }
}

/** そのURLにフォントが実在するか（SPAのindex.htmlが返ってくる場合は不可） */
async function probe(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' })
    if (!r.ok) return false
    return !(r.headers.get('content-type') ?? '').includes('text/html')
  } catch {
    return false
  }
}

let cached: Promise<string> | null = null

/** 覚えているフォントを忘れ、次回は探し直す（失敗時・テスト用） */
export function forgetJapaneseFont(): void {
  cached = null
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    /* noop */
  }
}

/** 日本語フォントを探して登録し、フォントファミリー名を返す（結果は使い回す） */
export function ensureJapaneseFont(Font: FontApi): Promise<string> {
  if (!cached) {
    const register = (c: Candidate) => {
      Font.register({ family: c.family, src: c.url })
      // 日本語を英語の規則でハイフン分割しない
      Font.registerHyphenationCallback((word) => [word])
    }
    cached = (async () => {
      // 前回使えたものは、通信で確認せずそのまま使う（オフラインでもキャッシュから読める）
      const stored = loadStored()
      if (stored) {
        register(stored)
        return stored.family
      }
      for (const c of CANDIDATES) {
        if (await probe(c.url)) {
          register(c)
          saveStored(c)
          return c.family
        }
      }
      throw new Error(
        '日本語フォントを読み込めませんでした。ネットワークを確認してください',
      )
    })()
    cached.catch(() => {
      cached = null // 失敗したら次回やり直せるようにする
    })
  }
  return cached
}