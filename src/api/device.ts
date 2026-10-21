import { db } from '../db/db'
import { SIGN_ALGORITHM, SIGN_PARAMS, toBase64Url, utf8 } from '../domain/signing'
import type { DeviceSigner } from './proxyClient'

/**
 * Kunci perangkat dibuat sekali saat pertama dibutuhkan. Kunci privat disimpan di IndexedDB sebagai
 * CryptoKey yang tidak bisa diekspor: kode JavaScript pun tidak bisa membaca isinya, hanya memakainya.
 * Menghapus data browser berarti kunci hilang, dan lisensi perlu reset perangkat.
 */
let cached: Promise<DeviceSigner> | null = null

export function deviceSigner(): Promise<DeviceSigner> {
  cached ??= load().catch((e) => {
    cached = null
    throw e
  })
  return cached
}

async function load(): Promise<DeviceSigner> {
  let row = await db.device.get('main')
  if (!row) {
    const pair = (await crypto.subtle.generateKey(SIGN_ALGORITHM, false, ['sign', 'verify'])) as CryptoKeyPair
    const publicKey = toBase64Url(await crypto.subtle.exportKey('raw', pair.publicKey))
    row = { id: 'main', privateKey: pair.privateKey, publicKey, createdAt: Date.now() }
    // Jika dua tab membuat kunci bersamaan, yang pertama tersimpan yang dipakai.
    await db.device.add(row).catch(async () => {
      row = (await db.device.get('main'))!
    })
  }
  const { privateKey, publicKey } = row
  return {
    publicKey,
    sign: async (message) => toBase64Url(await crypto.subtle.sign(SIGN_PARAMS, privateKey, utf8(message))),
  }
}
