import type * as z from 'zod/v4'
import {
  activationSigningPayload,
  HEADER_KEY,
  HEADER_SIG,
  HEADER_TIME,
  requestSigningPayload,
  SIGN_ALGORITHM,
  SIGN_PARAMS,
  toBase64Url,
  utf8,
} from '../../src/domain/signing'
import { normalizeLicenseCode } from '../../src/domain/license'
import { createApp, type LogEntry } from '../src/app'
import { limitsFrom, type Limits } from '../src/config'
import type { ChatRequest, ModelGateway, StructuredRequest, Usage } from '../src/gateway'
import { MemoryKV } from '../src/kv'
import { ConversationNote, DailyCards, LoanExtraction, PaymentExtraction, SnapshotSummary } from '../src/schemas'

export const BASE = 'https://proxy.test'
export const CODE = 'ABCD-EFGH-JKMN-PQRS'
export const ADMIN = 'admin-rahasia-untuk-tes'
export const USAGE: Usage = { inputTokens: 120, outputTokens: 40, cacheReadTokens: 900, cacheWriteTokens: 0 }

/** Satu HP: pasangan kunci ECDSA P-256 sungguhan, kunci privat tidak bisa diekspor. */
export async function makeDevice() {
  const pair = (await crypto.subtle.generateKey(SIGN_ALGORITHM, false, ['sign', 'verify'])) as CryptoKeyPair
  const publicKey = toBase64Url(await crypto.subtle.exportKey('raw', pair.publicKey))
  const sign = async (message: string) => toBase64Url(await crypto.subtle.sign(SIGN_PARAMS, pair.privateKey, utf8(message)))
  return { publicKey, sign }
}

export type Device = Awaited<ReturnType<typeof makeDevice>>

type ChatScript = { chunks?: string[]; stopReason?: string; failBeforeFirst?: boolean; failMidway?: boolean }

/** Model tiruan: mencatat semua masukan, mengembalikan keluaran tetap per skema. */
export function fakeGateway() {
  const calls: { kind: 'structured' | 'chat'; system: string; payload: string }[] = []
  const outputs = new Map<z.ZodType, unknown>([
    [
      LoanExtraction,
      {
        principal: 2_000_000,
        remaining: null,
        repeat: 'once',
        everyDays: null,
        installment: null,
        count: null,
        dueDate: '2026-10-25',
        dailyCharge: 20_000,
        penaltyAccrued: null,
        ojkRegistered: null,
        unclear: [],
      },
    ],
    [PaymentExtraction, { loanAlias: 'Pinjaman Z', amount: 500_000, date: '2026-10-21', allocation: 'principal', unclear: [] }],
    [SnapshotSummary, { text: 'Ada dua pinjaman aktif. Pinjaman A lewat jatuh tempo.', highlights: ['Pinjaman B hampir lunas'] }],
    [ConversationNote, { note: 'Pengguna cemas soal penagih.' }],
    [
      DailyCards,
      {
        tenang: { title: 'Tarik napas dulu', body: 'Satu menit pelan sebelum buka pesan.' },
        rencana: { title: 'Pinjaman B hampir lunas', body: 'Tinggal 15% lagi.' },
        hak: { title: 'Cek status di OJK', body: 'Pinjaman C belum terdaftar. Cek dulu ke OJK.' },
      },
    ],
  ])
  let chatScript: ChatScript = {}
  let structuredError: Error | null = null

  const gateway: ModelGateway = {
    async structured<T extends z.ZodType>(req: StructuredRequest<T>) {
      calls.push({ kind: 'structured', system: req.system, payload: req.user })
      if (structuredError) throw structuredError
      return { output: structuredClone(outputs.get(req.schema)) as z.infer<T>, usage: USAGE }
    },
    chat(req: ChatRequest) {
      calls.push({ kind: 'chat', system: req.system, payload: JSON.stringify(req.messages) })
      const script = chatScript
      const chunks = script.chunks ?? ['Wajar banget ', 'lu ngerasa gitu.']
      let resolve!: (v: { usage: Usage; stopReason: string | null }) => void
      let reject!: (e: unknown) => void
      const done = new Promise<{ usage: Usage; stopReason: string | null }>((res, rej) => {
        resolve = res
        reject = rej
      })
      done.catch(() => {})
      async function* text() {
        if (script.failBeforeFirst) {
          reject(new Error('upstream'))
          throw new Error('upstream')
        }
        for (const [i, c] of chunks.entries()) {
          if (script.failMidway && i === 1) {
            reject(new Error('upstream'))
            throw new Error('upstream')
          }
          yield c
        }
        resolve({ usage: USAGE, stopReason: script.stopReason ?? 'end_turn' })
      }
      return { text: text(), done }
    },
  }

  return {
    gateway,
    calls,
    setChat: (s: ChatScript) => (chatScript = s),
    failStructured: (e: Error | null) => (structuredError = e),
  }
}

export function setup(overrides: Partial<Limits> = {}) {
  let clock = Date.UTC(2026, 9, 21, 3, 0, 0)
  const kv = new MemoryKV(() => clock)
  const logs: LogEntry[] = []
  const fake = fakeGateway()
  const pending: Promise<unknown>[] = []
  const app = createApp({
    kv,
    gateway: fake.gateway,
    secrets: { LICENSE_PEPPER: 'pepper-tes', TOKEN_SECRET: 'token-tes', ADMIN_TOKEN: ADMIN, ALLOWED_ORIGINS: 'https://lunas.test' },
    limits: { ...limitsFrom({}), ...overrides },
    now: () => clock,
    log: (e) => logs.push(e),
    waitUntil: (p) => pending.push(p),
  })

  let ip = '182.253.10.20'
  const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    app.fetch(
      new Request(`${BASE}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      }),
    )

  async function seed(...codes: string[]) {
    const res = await call('POST', '/v1/admin/licenses', { codes: codes.length ? codes : [CODE] }, { authorization: `Bearer ${ADMIN}` })
    if (res.status !== 200) throw new Error(`seed gagal ${res.status}`)
  }

  async function activate(device: Device, code = CODE) {
    const ch = (await (await call('POST', '/v1/challenge')).json()) as { challengeId: string; nonce: string }
    const signature = await device.sign(activationSigningPayload(ch.nonce, normalizeLicenseCode(code) ?? code))
    return call('POST', '/v1/activate', { code, publicKey: device.publicKey, challengeId: ch.challengeId, signature })
  }

  async function activatedDevice(code = CODE) {
    const device = await makeDevice()
    const res = await activate(device, code)
    if (res.status !== 200) throw new Error(`aktivasi gagal ${res.status}`)
    const { token } = (await res.json()) as { token: string }
    return { device, token }
  }

  /** Permintaan AI bertanda tangan, persis seperti yang nanti dikirim HP. */
  async function signed(session: { device: Device; token: string }, method: string, path: string, body?: unknown, tamper?: (b: string) => string) {
    const text = body === undefined ? '' : JSON.stringify(body)
    const time = String(clock)
    const sig = await session.device.sign(await requestSigningPayload(method, path, time, text))
    return app.fetch(
      new Request(`${BASE}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ip,
          authorization: `Bearer ${session.token}`,
          [HEADER_KEY]: session.device.publicKey,
          [HEADER_TIME]: time,
          [HEADER_SIG]: sig,
        },
        body: method === 'GET' ? undefined : tamper ? tamper(text) : text,
      }),
    )
  }

  return {
    app,
    kv,
    logs,
    fake,
    pending,
    call,
    seed,
    activate,
    activatedDevice,
    signed,
    advance: (ms: number) => (clock += ms),
    setIp: (next: string) => (ip = next),
  }
}

/** Membaca seluruh aliran SSE menjadi daftar event. */
export async function readEvents(res: Response): Promise<{ type: string; [k: string]: unknown }[]> {
  const text = await res.text()
  return text
    .split('\n\n')
    .filter((b) => b.startsWith('data: '))
    .map((b) => JSON.parse(b.slice(6)))
}

export const SNAPSHOT = {
  loans: [
    {
      alias: 'Pinjaman A',
      remaining: 1_750_000,
      paidPercent: 30,
      penalty: 150_000,
      dailyCharge: 50_000,
      daysUntilDue: -3,
      nextAmount: 1_900_000,
      ojkRegistered: false,
    },
    { alias: 'Pinjaman B', remaining: 300_000, paidPercent: 85, penalty: 0, dailyCharge: 5_000, daysUntilDue: 5, nextAmount: 300_000, ojkRegistered: true },
  ],
  activeCount: 2,
  paidOffCount: 0,
  remainingTotal: 2_050_000,
  penaltyTotal: 150_000,
  paidPercent: 46,
  dailyChargeTotal: 55_000,
  monthlyAvailable: 800_000,
}
