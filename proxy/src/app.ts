import type Anthropic from '@anthropic-ai/sdk'
import type * as z from 'zod/v4'
import { normalizeLicenseCode } from '../../src/domain/license'
import { scrubPII } from '../../src/domain/pii'
import {
  activationSigningPayload,
  fromBase64Url,
  HEADER_KEY,
  HEADER_SIG,
  HEADER_TIME,
  MAX_CLOCK_SKEW_MS,
  requestSigningPayload,
  SIGN_ALGORITHM,
  SIGN_PARAMS,
  toBase64Url,
  utf8,
} from '../../src/domain/signing'
import { HAIKU, SONNET, type Limits } from './config'
import { BadOutputError, RefusalError, type ModelGateway, type Usage } from './gateway'
import { getJSON, putJSON, type KVLike } from './kv'
import {
  hashLicenseCode,
  hashNetwork,
  hashPublicKey,
  issueToken,
  loadLicense,
  newLicenseRecord,
  saveLicense,
  verifyToken,
  type LicenseRecord,
} from './license'
import { CHAT_SYSTEM, CONVERSATION_SYSTEM, EXTRACT_SYSTEM, SNAPSHOT_SYSTEM, SUGGEST_SYSTEM } from './prompts'
import {
  ActivateBody,
  ChatBody,
  ConversationNote,
  DailyCards,
  ExtractBody,
  LoanExtraction,
  PaymentExtraction,
  ResetBody,
  SnapshotSummary,
  SuggestBody,
  SummaryBody,
} from './schemas'

/**
 * Satu baris log per permintaan. Sengaja tidak ada tempat untuk isi permintaan atau jawaban:
 * hanya hash lisensi yang dipotong, jenis tugas, status, model, dan jumlah token.
 */
export type LogEntry = {
  route: string
  status: number
  ms: number
  lic?: string
  error?: string
  model?: string
  inTok?: number
  outTok?: number
  cacheRead?: number
}

export type Secrets = { LICENSE_PEPPER: string; TOKEN_SECRET: string; ADMIN_TOKEN: string; ALLOWED_ORIGINS?: string }

export type Deps = {
  kv: KVLike
  gateway: ModelGateway
  secrets: Secrets
  limits: Limits
  now?: () => number
  log?: (entry: LogEntry) => void
  /** Cloudflare `ctx.waitUntil`, untuk pekerjaan setelah jawaban selesai dikirim. */
  waitUntil?: (p: Promise<unknown>) => void
}

const MESSAGES = {
  invalid_request: 'Permintaan tidak lengkap atau formatnya salah.',
  too_large: 'Permintaan terlalu besar.',
  not_found: 'Alamat ini tidak ada.',
  invalid_code: 'Kode lisensi tidak dikenal. Cek lagi 16 huruf dan angkanya.',
  revoked: 'Lisensi ini sudah dicabut.',
  bound_elsewhere: 'Kode ini sudah aktif di HP lain. Kalau lu ganti HP, pakai reset perangkat.',
  challenge_expired: 'Waktu aktivasi habis. Coba lagi.',
  bad_signature: 'Tanda tangan perangkat tidak cocok.',
  unauthorized: 'Sesi perlu diperbarui. Buka lagi aplikasinya saat online.',
  reactivate: 'Lisensi perlu diaktifkan ulang di HP ini.',
  clock_skew: 'Jam di HP lu beda jauh dari jam server. Cek pengaturan tanggal dan jam.',
  frozen: 'Kode ini terlihat dipakai dari banyak jaringan sekaligus. Fitur AI dijeda sementara; aktifkan ulang dari HP lu untuk konfirmasi.',
  rate_limited: 'Pelan-pelan dulu ya. Coba lagi sebentar lagi.',
  quota_sonnet: 'Kuota Teman Tenang lu sudah habis. Catatan utang, kalender, dan rencana tetap jalan seperti biasa.',
  quota_daily: 'Kuota AI hari ini sudah habis. Besok terisi lagi; fitur lain tetap jalan.',
  suggest_done: 'Saran hari ini sudah dibuat.',
  reset_limit: 'Reset mandiri sudah terpakai. Hubungi kami dengan nomor invoice Lynk.id.',
  ai_refused: 'AI nggak bisa menjawab pesan ini. Coba ubah kalimatnya.',
  ai_bad_output: 'Jawaban AI nggak terbaca. Coba lagi.',
  ai_unavailable: 'AI lagi nggak bisa dihubungi. Data lu aman dan fitur lain tetap jalan; coba lagi nanti.',
  forbidden: 'Tidak diizinkan.',
} as const

type ErrorCode = keyof typeof MESSAGES

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  too_large: 413,
  not_found: 404,
  invalid_code: 404,
  revoked: 403,
  bound_elsewhere: 409,
  challenge_expired: 400,
  bad_signature: 401,
  unauthorized: 401,
  reactivate: 401,
  clock_skew: 401,
  frozen: 423,
  rate_limited: 429,
  quota_sonnet: 402,
  quota_daily: 402,
  suggest_done: 409,
  reset_limit: 403,
  ai_refused: 422,
  ai_bad_output: 502,
  ai_unavailable: 502,
  forbidden: 403,
}

class HttpError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

const errorResponse = (code: ErrorCode) => json(STATUS[code], { error: code, message: MESSAGES[code] })

/** Hari (UTC) untuk penghitung harian. */
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

type Ctx = {
  req: Request
  started: number
  body: string
  ip: string | null
  log: Omit<LogEntry, 'route' | 'status' | 'ms'>
}

type Authed = { lic: string; record: LicenseRecord }

export function createApp(deps: Deps) {
  const now = deps.now ?? Date.now
  const log = deps.log ?? ((e: LogEntry) => console.log(JSON.stringify(e)))
  const { kv, gateway, secrets, limits } = deps
  const allowedOrigins = (secrets.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  // Kuota

  function rollDay(record: LicenseRecord) {
    const day = utcDay(now())
    if (record.haikuDay !== day) {
      record.haikuDay = day
      record.haikuUsed = 0
      record.suggestUsed = 0
    }
  }

  function quotaOf(record: LicenseRecord) {
    rollDay(record)
    return {
      sonnetLeft: Math.max(0, limits.sonnetMessagesTotal - record.sonnetUsed),
      sonnetTotal: limits.sonnetMessagesTotal,
      haikuLeftToday: Math.max(0, limits.haikuCallsPerDay - record.haikuUsed),
      suggestAvailable: record.suggestUsed < limits.suggestPerDay,
    }
  }

  function addUsage(record: LicenseRecord, usage: Usage, ctx: Ctx, model: string) {
    record.tokensIn += usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    record.tokensOut += usage.outputTokens
    ctx.log.model = model
    ctx.log.inTok = usage.inputTokens + usage.cacheWriteTokens
    ctx.log.outTok = usage.outputTokens
    ctx.log.cacheRead = usage.cacheReadTokens
  }

  // Pembatas laju, per kunci (lisensi atau jaringan) per menit.

  async function rateLimit(scope: string, max: number) {
    const key = `rl:${scope}:${Math.floor(now() / 60_000)}`
    const count = Number((await kv.get(key)) ?? 0)
    if (count >= max) throw new HttpError('rate_limited')
    await kv.put(key, String(count + 1), { expirationTtl: 120 })
  }

  /** Batas per jaringan, terpisah per rute (tantangan, aktivasi, reset). */
  async function ipScope(ctx: Ctx, name: string) {
    return `ip:${name}:${(await hashNetwork(secrets.LICENSE_PEPPER, ctx.ip)) ?? 'unknown'}`
  }

  // Autentikasi permintaan AI: token berumur pendek + tanda tangan kunci perangkat atas isi permintaan.

  async function authenticate(ctx: Ctx): Promise<Authed> {
    const { req } = ctx
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const keyText = req.headers.get(HEADER_KEY)
    const time = req.headers.get(HEADER_TIME)
    const sig = req.headers.get(HEADER_SIG)
    if (!token || !keyText || !time || !sig) throw new HttpError('unauthorized')

    const payload = await verifyToken(secrets.TOKEN_SECRET, token, now())
    if (!payload) throw new HttpError('unauthorized')
    ctx.log.lic = payload.l.slice(0, 12)

    let rawKey: Uint8Array<ArrayBuffer>
    try {
      rawKey = fromBase64Url(keyText)
    } catch {
      throw new HttpError('unauthorized')
    }
    if ((await hashPublicKey(rawKey)) !== payload.k) throw new HttpError('unauthorized')
    if (!Number.isFinite(Number(time)) || Math.abs(now() - Number(time)) > MAX_CLOCK_SKEW_MS) throw new HttpError('clock_skew')

    const path = new URL(req.url).pathname
    if (!(await verifySignature(rawKey, sig, await requestSigningPayload(req.method, path, time, ctx.body)))) {
      throw new HttpError('bad_signature')
    }

    const record = await loadLicense(kv, payload.l)
    if (!record) throw new HttpError('unauthorized')
    if (record.status === 'revoked') throw new HttpError('revoked')
    if (record.keyHash !== payload.k) throw new HttpError('reactivate')
    return { lic: payload.l, record }
  }

  /**
   * IP hanya sinyal anomali, bukan kunci: HP sering ganti jaringan. Jika satu kode terlihat dari
   * terlalu banyak jaringan berbeda dalam satu jam, fitur AI dibekukan sampai HP itu aktivasi ulang.
   */
  async function checkNetworks(authed: Authed, ctx: Ctx) {
    const { record } = authed
    if (record.frozenUntil > now()) throw new HttpError('frozen')
    const net = await hashNetwork(secrets.LICENSE_PEPPER, ctx.ip)
    if (!net) return
    const hourAgo = now() - 3_600_000
    record.networks = record.networks.filter((n) => n.t > hourAgo && n.h !== net).concat({ h: net, t: now() })
    if (record.networks.length >= limits.networksPerHour) {
      record.frozenUntil = now() + limits.freezeMs
      await saveLicense(kv, authed.lic, record)
      throw new HttpError('frozen')
    }
  }

  async function aiPreamble(ctx: Ctx): Promise<Authed> {
    const authed = await authenticate(ctx)
    await rateLimit(`lic:${authed.lic}`, limits.ratePerMinute)
    await checkNetworks(authed, ctx)
    rollDay(authed.record)
    return authed
  }

  function parseBody<T extends z.ZodType>(schema: T, ctx: Ctx): z.infer<T> {
    let raw: unknown
    try {
      raw = JSON.parse(ctx.body || 'null')
    } catch {
      throw new HttpError('invalid_request')
    }
    const result = schema.safeParse(raw)
    if (!result.success) throw new HttpError('invalid_request')
    return result.data
  }

  async function callHaiku<T extends z.ZodType>(
    authed: Authed,
    ctx: Ctx,
    req: { system: string; user: string; schema: T; maxTokens: number },
  ): Promise<z.infer<T>> {
    if (authed.record.haikuUsed >= limits.haikuCallsPerDay) throw new HttpError('quota_daily')
    try {
      const { output, usage } = await gateway.structured(req)
      authed.record.haikuUsed += 1
      addUsage(authed.record, usage, ctx, HAIKU)
      return output
    } catch (e) {
      throw mapAiError(e)
    } finally {
      // Penghitung disimpan juga saat gagal; kuota hanya bertambah jika berhasil.
      await saveLicense(kv, authed.lic, authed.record)
    }
  }

  // Rute

  const routes: Record<string, (ctx: Ctx) => Promise<Response>> = {
    'GET /v1/health': async () => json(200, { ok: true }),

    'POST /v1/challenge': async (ctx) => {
      await rateLimit(await ipScope(ctx, 'challenge'), 20)
      const id = toBase64Url(crypto.getRandomValues(new Uint8Array(18)))
      const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(24)))
      const ttl = 300
      await putJSON(kv, `ch:${id}`, { nonce }, ttl)
      return json(200, { challengeId: id, nonce, expiresAt: now() + ttl * 1000 })
    },

    'POST /v1/activate': async (ctx) => {
      await rateLimit(await ipScope(ctx, 'activate'), 20)
      const body = parseBody(ActivateBody, ctx)
      const code = normalizeLicenseCode(body.code)
      if (!code) throw new HttpError('invalid_code')

      const challenge = await getJSON<{ nonce: string }>(kv, `ch:${body.challengeId}`)
      if (!challenge) throw new HttpError('challenge_expired')
      await kv.delete(`ch:${body.challengeId}`)

      const rawKey = fromBase64Url(body.publicKey)
      if (!(await verifySignature(rawKey, body.signature, activationSigningPayload(challenge.nonce, code)))) {
        throw new HttpError('bad_signature')
      }

      const lic = await hashLicenseCode(secrets.LICENSE_PEPPER, code)
      ctx.log.lic = lic.slice(0, 12)
      const record = await loadLicense(kv, lic)
      if (!record) throw new HttpError('invalid_code')
      if (record.status === 'revoked') throw new HttpError('revoked')

      const keyHash = await hashPublicKey(rawKey)
      if (record.keyHash && record.keyHash !== keyHash) throw new HttpError('bound_elsewhere')
      record.keyHash = keyHash
      record.activatedAt ??= now()
      // Aktivasi ulang dari HP yang sama adalah konfirmasi: lepaskan pembekuan.
      record.frozenUntil = 0
      record.networks = []
      await saveLicense(kv, lic, record)

      const expiresAt = now() + limits.tokenTtlMs
      const token = await issueToken(secrets.TOKEN_SECRET, { l: lic, k: keyHash, e: expiresAt })
      return json(200, { token, expiresAt, quota: quotaOf(record) })
    },

    'POST /v1/reset': async (ctx) => {
      await rateLimit(await ipScope(ctx, 'reset'), 5)
      const code = normalizeLicenseCode(parseBody(ResetBody, ctx).code)
      if (!code) throw new HttpError('invalid_code')
      const lic = await hashLicenseCode(secrets.LICENSE_PEPPER, code)
      ctx.log.lic = lic.slice(0, 12)
      const record = await loadLicense(kv, lic)
      if (!record) throw new HttpError('invalid_code')
      if (record.status === 'revoked') throw new HttpError('revoked')
      if (record.keyHash) {
        if (record.resets >= 1) throw new HttpError('reset_limit')
        record.keyHash = null
        record.resets += 1
        await saveLicense(kv, lic, record)
      }
      return json(200, { ok: true })
    },

    'GET /v1/quota': async (ctx) => {
      const authed = await authenticate(ctx)
      return json(200, { quota: quotaOf(authed.record) })
    },

    'POST /v1/extract': async (ctx) => {
      const body = parseBody(ExtractBody, ctx)
      const authed = await aiPreamble(ctx)
      const data = [`Hari ini: ${body.today}`, `Alias yang ada: ${body.aliases.join(', ') || '-'}`, `Kalimat: ${scrubPII(body.text)}`]
      const output = await callHaiku(authed, ctx, {
        system: EXTRACT_SYSTEM,
        user: `Jenis isian: ${body.kind === 'loan' ? 'pinjaman baru' : 'pembayaran'}\n<data>\n${data.join('\n')}\n</data>`,
        schema: body.kind === 'loan' ? LoanExtraction : PaymentExtraction,
        maxTokens: 2048,
      })
      if ('loanAlias' in output && output.loanAlias && !body.aliases.includes(output.loanAlias)) output.loanAlias = null
      return json(200, { fields: output, quota: quotaOf(authed.record) })
    },

    'POST /v1/summary': async (ctx) => {
      const body = parseBody(SummaryBody, ctx)
      const authed = await aiPreamble(ctx)
      if (body.kind === 'snapshot') {
        const out = await callHaiku(authed, ctx, {
          system: SNAPSHOT_SYSTEM,
          user: `<data>\n${JSON.stringify(body.snapshot)}\n</data>`,
          schema: SnapshotSummary,
          maxTokens: 2048,
        })
        const summary = { text: clip(scrubPII(out.text), 800), highlights: out.highlights.slice(0, 3).map((h) => clip(scrubPII(h), 160)) }
        return json(200, { summary, quota: quotaOf(authed.record) })
      }
      const transcript = body.messages.map((m) => `${m.role === 'user' ? 'Pengguna' : 'Teman Tenang'}: ${scrubPII(m.content)}`).join('\n')
      const out = await callHaiku(authed, ctx, {
        system: CONVERSATION_SYSTEM,
        user: `<data>\n${transcript}\n</data>`,
        schema: ConversationNote,
        maxTokens: 2048,
      })
      return json(200, { note: clip(scrubPII(out.note), 600), quota: quotaOf(authed.record) })
    },

    'POST /v1/suggest': async (ctx) => {
      const body = parseBody(SuggestBody, ctx)
      const authed = await aiPreamble(ctx)
      if (authed.record.suggestUsed >= limits.suggestPerDay) throw new HttpError('suggest_done')
      const out = await callHaiku(authed, ctx, {
        system: SUGGEST_SYSTEM,
        user: `<data>\n${JSON.stringify({ perasaan_hari_ini: body.mood, keuangan: body.snapshot })}\n</data>`,
        schema: DailyCards,
        maxTokens: 2048,
      })
      authed.record.suggestUsed += 1
      await saveLicense(kv, authed.lic, authed.record)
      const card = (category: 'tenang' | 'rencana' | 'hak') => ({
        category,
        title: clip(scrubPII(out[category].title), 80),
        body: clip(scrubPII(out[category].body), 220),
      })
      return json(200, { cards: [card('tenang'), card('rencana'), card('hak')], quota: quotaOf(authed.record) })
    },

    'POST /v1/chat': async (ctx) => {
      const body = parseBody(ChatBody, ctx)
      const authed = await aiPreamble(ctx)
      if (authed.record.sonnetUsed >= limits.sonnetMessagesTotal) throw new HttpError('quota_sonnet')
      return streamChat(authed, ctx, body)
    },

    'POST /v1/admin/licenses': async (ctx) => {
      requireAdmin(ctx)
      const codes = parseAdminCodes(ctx)
      let created = 0
      for (const code of codes) {
        const lic = await hashLicenseCode(secrets.LICENSE_PEPPER, code)
        if (await loadLicense(kv, lic)) continue
        await saveLicense(kv, lic, newLicenseRecord())
        created += 1
      }
      return json(200, { created, skipped: codes.length - created })
    },

    'POST /v1/admin/revoke': async (ctx) => adminUpdate(ctx, (r) => ({ ...r, status: 'revoked', keyHash: null })),
    'POST /v1/admin/unbind': async (ctx) => adminUpdate(ctx, (r) => ({ ...r, keyHash: null, frozenUntil: 0, networks: [] })),
  }

  function requireAdmin(ctx: Ctx) {
    const token = ctx.req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!secrets.ADMIN_TOKEN || token.length !== secrets.ADMIN_TOKEN.length) throw new HttpError('forbidden')
    let diff = 0
    for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ secrets.ADMIN_TOKEN.charCodeAt(i)
    if (diff !== 0) throw new HttpError('forbidden')
  }

  function parseAdminCodes(ctx: Ctx): string[] {
    let raw: unknown
    try {
      raw = JSON.parse(ctx.body)
    } catch {
      throw new HttpError('invalid_request')
    }
    const list = (raw as { codes?: unknown })?.codes
    if (!Array.isArray(list) || list.length === 0 || list.length > 1000) throw new HttpError('invalid_request')
    const codes = list.map((c) => (typeof c === 'string' ? normalizeLicenseCode(c) : null))
    if (codes.some((c) => c === null)) throw new HttpError('invalid_code')
    return codes as string[]
  }

  async function adminUpdate(ctx: Ctx, change: (r: LicenseRecord) => LicenseRecord) {
    requireAdmin(ctx)
    const [code] = parseAdminCodes(ctx)
    const lic = await hashLicenseCode(secrets.LICENSE_PEPPER, code)
    const record = await loadLicense(kv, lic)
    if (!record) throw new HttpError('invalid_code')
    await saveLicense(kv, lic, change(record))
    return json(200, { ok: true })
  }

  /**
   * Chat dengan Sonnet, dikirim sebagai server-sent events. Potongan pertama ditunggu dulu supaya
   * kegagalan di awal (API mati, ditolak) jadi status HTTP yang jujur, bukan aliran kosong.
   */
  async function streamChat(authed: Authed, ctx: Ctx, body: z.infer<typeof ChatBody>): Promise<Response> {
    const turns = body.messages.slice(body.messages.findIndex((m) => m.role === 'user'))
    const context = JSON.stringify({ keuangan: body.snapshot, catatan_sesi_sebelumnya: body.memory.map(scrubPII) })
    const messages: Anthropic.MessageParam[] = turns.map((m, i) => ({
      role: m.role,
      content:
        i === 0
          ? [
              { type: 'text', text: `<data>\n${context}\n</data>` },
              { type: 'text', text: scrubPII(m.content) },
            ]
          : scrubPII(m.content),
    }))

    const chat = gateway.chat({ system: CHAT_SYSTEM, messages, maxTokens: 4096 })
    const iterator = chat.text[Symbol.asyncIterator]()
    let first: IteratorResult<string>
    try {
      first = await iterator.next()
    } catch (e) {
      throw mapAiError(e)
    }

    const encoder = new TextEncoder()
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()
    const send = (event: unknown) => writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

    const pump = (async () => {
      let status = 200
      try {
        if (!first.done) await send({ type: 'text', text: first.value })
        for (let next = await iterator.next(); !next.done; next = await iterator.next()) await send({ type: 'text', text: next.value })
        const { usage, stopReason } = await chat.done
        addUsage(authed.record, usage, ctx, SONNET)
        if (stopReason === 'refusal') {
          // Jawaban parsial dibuang di HP; pesan ini tidak mengurangi kuota.
          status = STATUS.ai_refused
          ctx.log.error = 'ai_refused'
          await send({ type: 'error', error: 'ai_refused', message: MESSAGES.ai_refused })
        } else {
          authed.record.sonnetUsed += 1
          await send({ type: 'done', truncated: stopReason === 'max_tokens', quota: quotaOf(authed.record) })
        }
      } catch {
        status = STATUS.ai_unavailable
        ctx.log.error = 'ai_unavailable'
        await send({ type: 'error', error: 'ai_unavailable', message: MESSAGES.ai_unavailable }).catch(() => {})
      } finally {
        await saveLicense(kv, authed.lic, authed.record)
        log({ route: 'POST /v1/chat', status, ms: now() - ctx.started, ...ctx.log })
        await writer.close().catch(() => {})
      }
    })()
    deps.waitUntil?.(pump)

    return new Response(readable, {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-lunas-streamed': '1' },
    })
  }

  function cors(req: Request, res: Response): Response {
    const origin = req.headers.get('origin')
    if (!origin || !allowedOrigins.includes(origin)) return res
    const headers = new Headers(res.headers)
    headers.set('access-control-allow-origin', origin)
    headers.set('vary', 'origin')
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
    headers.set('access-control-allow-headers', `authorization, content-type, ${HEADER_KEY}, ${HEADER_TIME}, ${HEADER_SIG}`)
    headers.set('access-control-max-age', '600')
    return new Response(res.body, { status: res.status, headers })
  }

  return {
    async fetch(req: Request): Promise<Response> {
      const started = now()
      const url = new URL(req.url)
      const route = `${req.method} ${url.pathname}`
      if (req.method === 'OPTIONS') return cors(req, new Response(null, { status: 204 }))

      const ctx: Ctx = { req, started, body: '', ip: req.headers.get('cf-connecting-ip'), log: {} }
      let res: Response
      try {
        const handler = routes[route]
        if (!handler) throw new HttpError('not_found')
        const declared = Number(req.headers.get('content-length') ?? 0)
        if (declared > limits.maxBodyBytes) throw new HttpError('too_large')
        ctx.body = req.method === 'GET' ? '' : await req.text()
        if (ctx.body.length > limits.maxBodyBytes) throw new HttpError('too_large')
        res = await handler(ctx)
      } catch (e) {
        if (!(e instanceof HttpError)) console.error('unexpected', e instanceof Error ? e.name : 'unknown')
        const code = e instanceof HttpError ? e.code : 'ai_unavailable'
        ctx.log.error = code
        res = errorResponse(code)
      }
      // Chat yang mengalir mencatat lognya sendiri setelah selesai.
      if (!res.headers.has('x-lunas-streamed')) {
        log({ route: routes[route] ? route : 'unknown', status: res.status, ms: now() - started, ...ctx.log })
      }
      return cors(req, res)
    },
  }
}

function mapAiError(e: unknown): HttpError {
  if (e instanceof HttpError) return e
  if (e instanceof RefusalError) return new HttpError('ai_refused')
  if (e instanceof BadOutputError) return new HttpError('ai_bad_output')
  return new HttpError('ai_unavailable')
}

async function verifySignature(rawKey: Uint8Array<ArrayBuffer>, signature: string, message: string): Promise<boolean> {
  try {
    if (rawKey.length !== 65 || rawKey[0] !== 4) return false
    const key = await crypto.subtle.importKey('raw', rawKey, SIGN_ALGORITHM, false, ['verify'])
    return await crypto.subtle.verify(SIGN_PARAMS, key, fromBase64Url(signature), utf8(message))
  } catch {
    return false
  }
}

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)
