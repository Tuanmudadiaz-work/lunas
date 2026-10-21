import { normalizeLicenseCode } from '../domain/license'
import {
  activationSigningPayload,
  HEADER_KEY,
  HEADER_SIG,
  HEADER_TIME,
  requestSigningPayload,
} from '../domain/signing'

/** Kunci perangkat: kunci publik (base64url, mentah) dan fungsi tanda tangan dengan kunci privat yang tidak bisa diekspor. */
export type DeviceSigner = { publicKey: string; sign: (message: string) => Promise<string> }

/** Tempat token disimpan (di aplikasi: tabel Pengaturan). */
export type TokenStore = {
  get: () => Promise<{ token: string; expiresAt: number } | null>
  set: (value: { token: string; expiresAt: number } | null) => Promise<void>
  /** Kode lisensi yang tersimpan, untuk memperbarui token otomatis. */
  code: () => Promise<string>
}

export type Quota = { sonnetLeft: number; sonnetTotal: number; haikuLeftToday: number; suggestAvailable: boolean }

/** Galat dari proxy dengan pesan yang siap ditampilkan apa adanya. */
export class ProxyError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ProxyError'
    this.code = code
    this.status = status
  }
}

const OFFLINE = 'Lagi offline atau server nggak bisa dihubungi. Fitur lain tetap jalan; coba lagi nanti.'

/** Perbarui token jika sisa umurnya kurang dari ini. */
const REFRESH_BEFORE_MS = 24 * 3_600_000

type Options = {
  baseUrl: string
  device: () => Promise<DeviceSigner>
  tokens: TokenStore
  fetch?: typeof fetch
  now?: () => number
}

/**
 * Satu-satunya jalan HP ke AI. Tidak ada kunci API di sini: setiap permintaan membawa token berumur
 * pendek dan tanda tangan kunci perangkat atas isi permintaan.
 */
export function createProxyClient(opts: Options) {
  const doFetch = opts.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const now = opts.now ?? Date.now

  async function request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(`${opts.baseUrl}${path}`, init)
    } catch {
      throw new ProxyError('offline', OFFLINE, 0)
    }
  }

  async function failure(res: Response): Promise<ProxyError> {
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      return new ProxyError(body.error ?? 'unknown', body.message ?? OFFLINE, res.status)
    } catch {
      return new ProxyError('unknown', OFFLINE, res.status)
    }
  }

  const post = (path: string, body: unknown) =>
    request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

  /** Aktivasi (atau aktivasi ulang dari HP yang sama, yang sekaligus memperbarui token). */
  async function activate(rawCode: string): Promise<Quota> {
    const code = normalizeLicenseCode(rawCode)
    if (!code) throw new ProxyError('invalid_code', 'Kodenya belum pas. Cek lagi 16 huruf dan angkanya, ya.', 400)
    const device = await opts.device()
    const chRes = await post('/v1/challenge', {})
    if (!chRes.ok) throw await failure(chRes)
    const challenge = (await chRes.json()) as { challengeId: string; nonce: string }
    const signature = await device.sign(activationSigningPayload(challenge.nonce, code))
    const res = await post('/v1/activate', { code, publicKey: device.publicKey, challengeId: challenge.challengeId, signature })
    if (!res.ok) throw await failure(res)
    const body = (await res.json()) as { token: string; expiresAt: number; quota: Quota }
    await opts.tokens.set({ token: body.token, expiresAt: body.expiresAt })
    return body.quota
  }

  async function currentToken(): Promise<string> {
    const stored = await opts.tokens.get()
    if (stored && stored.expiresAt - now() > REFRESH_BEFORE_MS) return stored.token
    await activate(await opts.tokens.code())
    return (await opts.tokens.get())!.token
  }

  async function send(method: 'GET' | 'POST', path: string, body: unknown, token: string): Promise<Response> {
    const device = await opts.device()
    const text = body === undefined ? '' : JSON.stringify(body)
    const time = String(now())
    const sig = await device.sign(await requestSigningPayload(method, path, time, text))
    return request(path, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        [HEADER_KEY]: device.publicKey,
        [HEADER_TIME]: time,
        [HEADER_SIG]: sig,
      },
      body: method === 'GET' ? undefined : text,
    })
  }

  /** Permintaan bertanda tangan. Token yang ditolak diperbarui sekali secara otomatis. */
  async function signed(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
    let res = await send(method, path, body, await currentToken())
    if (res.status === 401) {
      const err = await failure(res.clone())
      if (err.code === 'unauthorized') {
        await opts.tokens.set(null)
        res = await send(method, path, body, await currentToken())
      }
    }
    if (!res.ok) throw await failure(res)
    return res
  }

  return {
    activate,
    signed,
    async quota(): Promise<Quota> {
      return ((await (await signed('GET', '/v1/quota')).json()) as { quota: Quota }).quota
    },
    async resetDevice(rawCode: string): Promise<void> {
      const res = await post('/v1/reset', { code: normalizeLicenseCode(rawCode) ?? rawCode })
      if (!res.ok) throw await failure(res)
      await opts.tokens.set(null)
    },
  }
}

export type ProxyClient = ReturnType<typeof createProxyClient>
