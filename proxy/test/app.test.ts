import { describe, expect, it } from 'vitest'
import { activationSigningPayload } from '../../src/domain/signing'
import { CODE, makeDevice, readEvents, setup, SNAPSHOT, ADMIN } from './helpers'

const chatBody = (content = 'Gue capek ditelepon penagih terus') => ({
  snapshot: SNAPSHOT,
  memory: ['Sesi lalu: cemas soal penagih.'],
  messages: [{ role: 'user', content }],
})

describe('aktivasi lisensi', () => {
  it('kode valid terikat ke satu HP dan mengembalikan token serta kuota', async () => {
    const t = setup()
    await t.seed()
    const res = await t.activate(await makeDevice(), 'abcd efgh jkmn pqrs')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { token: string; quota: { sonnetLeft: number; haikuLeftToday: number } }
    expect(body.token).toMatch(/\./)
    expect(body.quota).toMatchObject({ sonnetLeft: 300, haikuLeftToday: 40, suggestAvailable: true })
  })

  it('HP kedua ditolak, HP yang sama boleh aktivasi ulang', async () => {
    const t = setup()
    await t.seed()
    const first = await makeDevice()
    expect((await t.activate(first)).status).toBe(200)
    const second = await t.activate(await makeDevice())
    expect(second.status).toBe(409)
    expect(((await second.json()) as { error: string }).error).toBe('bound_elsewhere')
    expect((await t.activate(first)).status).toBe(200)
  })

  it('menolak kode tak dikenal, kode dicabut, tanda tangan palsu, dan tantangan bekas', async () => {
    const t = setup()
    await t.seed()
    const device = await makeDevice()
    expect((await t.activate(device, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ')).status).toBe(404)

    // Tanda tangan dari kunci lain.
    const other = await makeDevice()
    const ch = (await (await t.call('POST', '/v1/challenge')).json()) as { challengeId: string; nonce: string }
    const forged = await other.sign(activationSigningPayload(ch.nonce, CODE))
    const bad = await t.call('POST', '/v1/activate', { code: CODE, publicKey: device.publicKey, challengeId: ch.challengeId, signature: forged })
    expect(bad.status).toBe(401)

    // Tantangan yang sudah dipakai tidak bisa dipakai lagi.
    const reuse = await t.call('POST', '/v1/activate', {
      code: CODE,
      publicKey: other.publicKey,
      challengeId: ch.challengeId,
      signature: forged,
    })
    expect(((await reuse.json()) as { error: string }).error).toBe('challenge_expired')

    await t.call('POST', '/v1/admin/revoke', { codes: [CODE] }, { authorization: `Bearer ${ADMIN}` })
    expect((await t.activate(device)).status).toBe(403)
  })

  it('reset mandiri sekali saja, lalu HP baru bisa aktivasi', async () => {
    const t = setup()
    await t.seed()
    await t.activate(await makeDevice())
    expect((await t.call('POST', '/v1/reset', { code: CODE })).status).toBe(200)
    expect((await t.activate(await makeDevice())).status).toBe(200)
    const again = await t.call('POST', '/v1/reset', { code: CODE })
    expect(again.status).toBe(403)
    expect(((await again.json()) as { error: string }).error).toBe('reset_limit')
  })

  it('endpoint admin menolak tanpa token yang benar', async () => {
    const t = setup()
    expect((await t.call('POST', '/v1/admin/licenses', { codes: [CODE] }, { authorization: 'Bearer salah' })).status).toBe(403)
    expect((await t.call('POST', '/v1/admin/licenses', { codes: [CODE] })).status).toBe(403)
  })

  it('server hanya menyimpan hash: kode dan kunci publik tidak ada di KV', async () => {
    const t = setup()
    await t.seed()
    const device = await makeDevice()
    await t.activate(device)
    const dump = t.kv.dump()
    expect(dump).not.toContain(CODE)
    expect(dump).not.toContain(CODE.replace(/-/g, ''))
    expect(dump).not.toContain(device.publicKey)
    expect(dump).not.toContain('182.253')
  })
})

describe('permintaan AI bertanda tangan', () => {
  it('tanpa token, token palsu, atau kunci lain ditolak', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    expect((await t.call('POST', '/v1/chat', chatBody())).status).toBe(401)
    const forgedToken = await t.signed({ ...session, token: `${session.token}x` }, 'POST', '/v1/chat', chatBody())
    expect(forgedToken.status).toBe(401)
    const otherKey = await t.signed({ device: await makeDevice(), token: session.token }, 'POST', '/v1/chat', chatBody())
    expect(otherKey.status).toBe(401)
    expect(t.fake.calls).toHaveLength(0)
  })

  it('isi yang diubah setelah ditandatangani ditolak', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    const res = await t.signed(session, 'POST', '/v1/chat', chatBody(), (b) => b.replace('capek', 'senang'))
    expect(res.status).toBe(401)
    expect(((await res.json()) as { error: string }).error).toBe('bad_signature')
  })

  it('token kedaluwarsa dan jam HP yang meleset ditolak', async () => {
    const t = setup({ tokenTtlMs: 60_000 })
    await t.seed()
    const session = await t.activatedDevice()
    t.advance(61_000)
    expect((await t.signed(session, 'GET', '/v1/quota')).status).toBe(401)
  })

  it('setelah reset, token lama dari HP lama tidak berlaku lagi', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    await t.call('POST', '/v1/reset', { code: CODE })
    const res = await t.signed(session, 'GET', '/v1/quota')
    expect(((await res.json()) as { error: string }).error).toBe('reactivate')
  })
})

describe('kuota hanya memblokir AI', () => {
  it('kuota Sonnet habis: chat ditolak dengan pesan jujur, Haiku, kuota, dan aktivasi tetap jalan', async () => {
    const t = setup({ sonnetMessagesTotal: 2 })
    await t.seed()
    const session = await t.activatedDevice()

    for (let i = 0; i < 2; i++) {
      const res = await t.signed(session, 'POST', '/v1/chat', chatBody())
      expect(res.status).toBe(200)
      const events = await readEvents(res)
      expect(events.at(-1)).toMatchObject({ type: 'done', quota: { sonnetLeft: 1 - i } })
    }

    const blocked = await t.signed(session, 'POST', '/v1/chat', chatBody())
    expect(blocked.status).toBe(402)
    expect(await blocked.json()).toEqual({
      error: 'quota_sonnet',
      message: 'Kuota Teman Tenang lu sudah habis. Catatan utang, kalender, dan rencana tetap jalan seperti biasa.',
    })
    expect(t.fake.calls.filter((c) => c.kind === 'chat')).toHaveLength(2)

    const extract = await t.signed(session, 'POST', '/v1/extract', { kind: 'loan', text: 'pinjam 2 juta jatuh tempo tgl 25', today: '2026-10-21' })
    expect(extract.status).toBe(200)
    const quota = await t.signed(session, 'GET', '/v1/quota')
    expect(((await quota.json()) as { quota: { sonnetLeft: number } }).quota.sonnetLeft).toBe(0)
    expect((await t.activate(session.device)).status).toBe(200)
  })

  it('kuota Haiku harian habis: isian ditolak, chat tetap jalan, besok terisi lagi', async () => {
    const t = setup({ haikuCallsPerDay: 1 })
    await t.seed()
    const session = await t.activatedDevice()
    const body = { kind: 'payment', text: 'bayar Pinjaman B 500rb', today: '2026-10-21', aliases: ['Pinjaman B'] }
    expect((await t.signed(session, 'POST', '/v1/extract', body)).status).toBe(200)
    const blocked = await t.signed(session, 'POST', '/v1/extract', body)
    expect(blocked.status).toBe(402)
    expect(((await blocked.json()) as { error: string }).error).toBe('quota_daily')
    expect((await t.signed(session, 'POST', '/v1/chat', chatBody())).status).toBe(200)
    t.advance(24 * 3_600_000)
    expect((await t.signed(session, 'POST', '/v1/extract', body)).status).toBe(200)
  })

  it('saran harian hanya sekali per hari', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    const first = await t.signed(session, 'POST', '/v1/suggest', { snapshot: SNAPSHOT, mood: 'cemas' })
    expect(first.status).toBe(200)
    const { cards } = (await first.json()) as { cards: { category: string }[] }
    expect(cards.map((c) => c.category)).toEqual(['tenang', 'rencana', 'hak'])
    expect((await t.signed(session, 'POST', '/v1/suggest', { snapshot: SNAPSHOT, mood: 'cemas' })).status).toBe(409)
  })

  it('jawaban yang gagal atau ditolak tidak mengurangi kuota dan dijawab jujur', async () => {
    const t = setup({ sonnetMessagesTotal: 1 })
    await t.seed()
    const session = await t.activatedDevice()

    t.fake.setChat({ failBeforeFirst: true })
    const down = await t.signed(session, 'POST', '/v1/chat', chatBody())
    expect(down.status).toBe(502)
    expect(((await down.json()) as { message: string }).message).toContain('Data lu aman')

    t.fake.setChat({ failMidway: true })
    const cut = await readEvents(await t.signed(session, 'POST', '/v1/chat', chatBody()))
    expect(cut.at(-1)).toMatchObject({ type: 'error', error: 'ai_unavailable' })

    t.fake.setChat({ stopReason: 'refusal' })
    const refused = await readEvents(await t.signed(session, 'POST', '/v1/chat', chatBody()))
    expect(refused.at(-1)).toMatchObject({ type: 'error', error: 'ai_refused' })

    t.fake.setChat({})
    const ok = await readEvents(await t.signed(session, 'POST', '/v1/chat', chatBody()))
    expect(ok.map((e) => e.type)).toEqual(['text', 'text', 'done'])
    expect(ok.at(-1)).toMatchObject({ quota: { sonnetLeft: 0 } })

    t.fake.failStructured(new Error('upstream'))
    const extract = await t.signed(session, 'POST', '/v1/extract', { kind: 'loan', text: 'pinjam 2 juta', today: '2026-10-21' })
    expect(extract.status).toBe(502)
    const quota = (await (await t.signed(session, 'GET', '/v1/quota')).json()) as { quota: { haikuLeftToday: number } }
    expect(quota.quota.haikuLeftToday).toBe(40)
  })
})

describe('pembatas laju dan anomali jaringan', () => {
  it('terlalu banyak permintaan per menit ditolak, lalu pulih di menit berikutnya', async () => {
    const t = setup({ ratePerMinute: 3 })
    await t.seed()
    const session = await t.activatedDevice()
    const body = { snapshot: SNAPSHOT, mood: null }
    const statuses = []
    for (let i = 0; i < 4; i++) statuses.push((await t.signed(session, 'POST', '/v1/summary', { kind: 'snapshot', ...body })).status)
    expect(statuses).toEqual([200, 200, 200, 429])
    t.advance(60_000)
    expect((await t.signed(session, 'POST', '/v1/summary', { kind: 'snapshot', snapshot: SNAPSHOT })).status).toBe(200)
  })

  it('banyak jaringan berbeda dalam sejam membekukan AI sampai aktivasi ulang dari HP yang sama', async () => {
    const t = setup({ networksPerHour: 3 })
    await t.seed()
    const session = await t.activatedDevice()
    const statuses = []
    for (const ip of ['36.70.1.1', '110.137.2.2', '125.160.3.3']) {
      t.setIp(ip)
      statuses.push((await t.signed(session, 'GET', '/v1/quota')).status)
      statuses.push((await t.signed(session, 'POST', '/v1/summary', { kind: 'snapshot', snapshot: SNAPSHOT })).status)
    }
    expect(statuses.slice(-1)).toEqual([423])
    // Pindah jaringan sesekali (Wi-Fi ke data seluler) tidak apa-apa.
    expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200])
    expect((await t.activate(session.device)).status).toBe(200)
    expect((await t.signed(session, 'POST', '/v1/summary', { kind: 'snapshot', snapshot: SNAPSHOT })).status).toBe(200)
  })
})

describe('penyaring data pribadi dan routing model', () => {
  it('NIK, nomor HP, dan email dibuang sebelum sampai ke model', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    await t.signed(session, 'POST', '/v1/extract', {
      kind: 'loan',
      text: 'pinjam 2 juta, NIK 3174012345678901, WA 0812-3456-7890, email a@b.co',
      today: '2026-10-21',
    })
    await readEvents(await t.signed(session, 'POST', '/v1/chat', chatBody('nomor gue 081234567890, tolong bantu')))
    const sent = t.fake.calls.map((c) => c.payload).join('\n')
    for (const secret of ['3174012345678901', '0812-3456-7890', '081234567890', 'a@b.co']) expect(sent).not.toContain(secret)
    expect(sent).toContain('[NIK]')
  })

  it('alias pembayaran di luar daftar diganti null; konteks chat ada di tag data pesan pertama', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    const res = await t.signed(session, 'POST', '/v1/extract', {
      kind: 'payment',
      text: 'bayar 500rb',
      today: '2026-10-21',
      aliases: ['Pinjaman A'],
    })
    expect(((await res.json()) as { fields: { loanAlias: string | null } }).fields.loanAlias).toBeNull()

    await readEvents(await t.signed(session, 'POST', '/v1/chat', chatBody()))
    const chat = t.fake.calls.find((c) => c.kind === 'chat')!
    const messages = JSON.parse(chat.payload)
    expect(messages[0].content[0].text).toMatch(/^<data>\n\{"keuangan"/)
    expect(chat.system).toContain('Teman Tenang')
  })

  it('isian yang tidak sesuai skema ditolak tanpa memanggil model', async () => {
    const t = setup()
    await t.seed()
    const session = await t.activatedDevice()
    const res = await t.signed(session, 'POST', '/v1/chat', { snapshot: SNAPSHOT, messages: [{ role: 'assistant', content: 'halo' }] })
    expect(res.status).toBe(400)
    const model = await t.signed(session, 'POST', '/v1/chat', { ...chatBody(), model: 'claude-opus-5-5' })
    expect(model.status).toBe(200)
    await readEvents(model)
    expect(t.fake.calls).toHaveLength(1)
  })
})

describe('log tanpa isi', () => {
  it('tidak ada isi permintaan, jawaban, kode, atau IP di log; hanya kolom yang diizinkan', async () => {
    const t = setup()
    await t.seed()
    const SECRET = 'RAHASIA-ISI-PESAN-XYZ'
    const session = await t.activatedDevice()
    await t.signed(session, 'POST', '/v1/extract', { kind: 'loan', text: `pinjam 2 juta ${SECRET}`, today: '2026-10-21' })
    await t.signed(session, 'POST', '/v1/summary', { kind: 'conversation', messages: [{ role: 'user', content: SECRET }] })
    await t.signed(session, 'POST', '/v1/suggest', { snapshot: SNAPSHOT, mood: 'berat' })
    await readEvents(await t.signed(session, 'POST', '/v1/chat', chatBody(SECRET)))
    await t.signed(session, 'POST', '/v1/chat', chatBody(SECRET), (b) => b.replace('XYZ', 'ABC'))
    await t.activate(await makeDevice())

    const text = JSON.stringify(t.logs)
    for (const forbidden of [SECRET, 'Wajar banget', 'Tarik napas', CODE, CODE.replace(/-/g, ''), session.token, '182.253']) {
      expect(text).not.toContain(forbidden)
    }
    const allowed = new Set(['route', 'status', 'ms', 'lic', 'error', 'model', 'inTok', 'outTok', 'cacheRead'])
    for (const entry of t.logs) for (const key of Object.keys(entry)) expect(allowed).toContain(key)

    const chatLog = t.logs.find((l) => l.route === 'POST /v1/chat' && l.status === 200)!
    expect(chatLog).toMatchObject({ model: 'claude-sonnet-5-5', inTok: 120, outTok: 40, cacheRead: 900 })
    expect(t.logs.find((l) => l.route === 'POST /v1/extract')).toMatchObject({ model: 'claude-haiku-5-5' })
    expect(chatLog.lic).toHaveLength(12)
  })
})

describe('lain-lain', () => {
  it('CORS hanya untuk asal yang diizinkan, body besar ditolak, rute tak dikenal 404', async () => {
    const t = setup()
    const ok = await t.call('OPTIONS', '/v1/chat', undefined, { origin: 'https://lunas.test' })
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://lunas.test')
    const other = await t.call('GET', '/v1/health', undefined, { origin: 'https://jahat.test' })
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
    expect((await t.call('POST', '/v1/activate', 'x'.repeat(40_000))).status).toBe(413)
    expect((await t.call('GET', '/v1/models')).status).toBe(404)
  })
})
