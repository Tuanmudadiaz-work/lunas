import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { fromBase64Url, SIGN_ALGORITHM, SIGN_PARAMS, utf8 } from '../domain/signing'
import { deviceSigner } from './device'

describe('kunci perangkat', () => {
  it('dibuat sekali, disimpan, kunci privat tidak bisa diekspor, dan tanda tangannya bisa diverifikasi', async () => {
    const a = await deviceSigner()
    const b = await deviceSigner()
    expect(b.publicKey).toBe(a.publicKey)
    expect(fromBase64Url(a.publicKey)).toHaveLength(65)

    const row = (await db.device.get('main'))!
    expect(row.privateKey.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('pkcs8', row.privateKey)).rejects.toThrow()

    const sig = await a.sign('halo')
    const key = await crypto.subtle.importKey('raw', fromBase64Url(a.publicKey), SIGN_ALGORITHM, false, ['verify'])
    expect(await crypto.subtle.verify(SIGN_PARAMS, key, fromBase64Url(sig), utf8('halo'))).toBe(true)
    expect(await crypto.subtle.verify(SIGN_PARAMS, key, fromBase64Url(sig), utf8('halo!'))).toBe(false)
  })
})
