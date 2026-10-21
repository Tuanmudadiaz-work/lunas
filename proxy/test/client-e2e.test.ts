import { describe, expect, it } from 'vitest'
import { createProxyClient, ProxyError, type TokenStore } from '../../src/api/proxyClient'
import { BASE, CODE, makeDevice, setup, SNAPSHOT } from './helpers'

/** Klien HP sungguhan (src/api/proxyClient.ts) yang memanggil proxy sungguhan di proses yang sama. */
async function clientFor(t: ReturnType<typeof setup>, code = CODE) {
  const device = await makeDevice()
  let stored: { token: string; expiresAt: number } | null = null
  const tokens: TokenStore = { get: async () => stored, set: async (v) => void (stored = v), code: async () => code }
  const client = createProxyClient({
    baseUrl: BASE,
    device: async () => device,
    tokens,
    fetch: (input, init) => t.app.fetch(new Request(input, init)),
    now: () => Date.UTC(2026, 9, 21, 3, 0, 0),
  })
  return { client, tokens, stored: () => stored }
}

describe('klien HP dengan proxy', () => {
  it('aktivasi, lalu permintaan bertanda tangan diterima', async () => {
    const t = setup()
    await t.seed()
    const { client, stored } = await clientFor(t)
    const quota = await client.activate('abcd-efgh-jkmn-pqrs')
    expect(quota.sonnetLeft).toBe(300)
    expect(stored()?.token).toBeTruthy()

    const res = await client.signed('POST', '/v1/summary', { kind: 'snapshot', snapshot: SNAPSHOT })
    expect(((await res.json()) as { summary: { text: string } }).summary.text).toContain('Pinjaman A')
    expect((await client.quota()).haikuLeftToday).toBe(39)
  })

  it('token kosong atau ditolak diperbarui otomatis dengan aktivasi ulang dari HP yang sama', async () => {
    const t = setup()
    await t.seed()
    const { client, tokens } = await clientFor(t)
    await client.activate(CODE)
    await tokens.set({ token: 'rusak.token', expiresAt: Date.UTC(2027, 0, 1) })
    expect((await client.quota()).sonnetLeft).toBe(300)
    await tokens.set(null)
    expect((await client.quota()).sonnetLeft).toBe(300)
  })

  it('galat dari proxy sampai ke HP dengan pesan yang bisa ditampilkan', async () => {
    const t = setup()
    await t.seed()
    const first = await clientFor(t)
    await first.client.activate(CODE)
    const second = await clientFor(t)
    const err = await second.client.activate(CODE).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ProxyError)
    expect(err).toMatchObject({ code: 'bound_elsewhere', status: 409 })
    expect((err as Error).message).toContain('sudah aktif di HP lain')

    const offline = createProxyClient({
      baseUrl: BASE,
      device: async () => makeDevice(),
      tokens: { get: async () => null, set: async () => {}, code: async () => CODE },
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    await expect(offline.activate(CODE)).rejects.toMatchObject({ code: 'offline' })
  })

  it('reset perangkat lalu aktivasi di HP baru', async () => {
    const t = setup()
    await t.seed()
    const oldPhone = await clientFor(t)
    await oldPhone.client.activate(CODE)
    const newPhone = await clientFor(t)
    await newPhone.client.resetDevice(CODE)
    expect((await newPhone.client.activate(CODE)).sonnetLeft).toBe(300)
  })
})
