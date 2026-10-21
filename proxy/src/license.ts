import { fromBase64Url, sha256Hex, toBase64Url, utf8 } from '../../src/domain/signing'
import { getJSON, putJSON, type KVLike } from './kv'

/**
 * Satu catatan per kode lisensi, disimpan di KV dengan kunci `lic:<hash kode>`.
 * Isinya hanya status, hash kunci perangkat, dan penghitung. Tidak ada data utang, nama, atau isi chat.
 */
export type LicenseRecord = {
  v: 1
  status: 'active' | 'revoked'
  /** Hash kunci publik perangkat yang terikat. Kosong jika belum diaktifkan atau sudah direset. */
  keyHash: string | null
  activatedAt: number | null
  /** Reset mandiri yang sudah dipakai. */
  resets: number
  sonnetUsed: number
  /** Tanggal (UTC) penghitung harian Haiku. */
  haikuDay: string
  haikuUsed: number
  suggestUsed: number
  tokensIn: number
  tokensOut: number
  /** Jaringan kasar (hash pendek) yang terlihat dalam satu jam terakhir, untuk deteksi berbagi kode. */
  networks: { h: string; t: number }[]
  frozenUntil: number
}

export function newLicenseRecord(): LicenseRecord {
  return {
    v: 1,
    status: 'active',
    keyHash: null,
    activatedAt: null,
    resets: 0,
    sonnetUsed: 0,
    haikuDay: '',
    haikuUsed: 0,
    suggestUsed: 0,
    tokensIn: 0,
    tokensOut: 0,
    networks: [],
    frozenUntil: 0,
  }
}

async function hmac(secret: string, message: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(message)))
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Hash kode lisensi (yang sudah dinormalkan). Dibuat dengan pepper supaya isi KV tidak bisa ditebak balik. */
export async function hashLicenseCode(pepper: string, normalizedCode: string): Promise<string> {
  return hex(await hmac(pepper, `code:${normalizedCode.replace(/-/g, '')}`))
}

/** Hash pendek jaringan (bukan IP utuh): IPv4 dua oktet pertama, IPv6 tiga kelompok pertama. */
export async function hashNetwork(pepper: string, ip: string | null): Promise<string | null> {
  if (!ip) return null
  const coarse = ip.includes(':') ? ip.split(':').slice(0, 3).join(':') : ip.split('.').slice(0, 2).join('.')
  return hex(await hmac(pepper, `net:${coarse}`)).slice(0, 12)
}

export async function hashPublicKey(rawPublicKey: Uint8Array<ArrayBuffer>): Promise<string> {
  return sha256Hex(rawPublicKey)
}

export const licenseKey = (hash: string) => `lic:${hash}`

export function loadLicense(kv: KVLike, hash: string) {
  return getJSON<LicenseRecord>(kv, licenseKey(hash))
}

export function saveLicense(kv: KVLike, hash: string, record: LicenseRecord) {
  return putJSON(kv, licenseKey(hash), record)
}

// Token akses: payload base64url + HMAC. Berumur pendek, diperbarui dengan aktivasi ulang dari HP yang sama.

export type TokenPayload = { l: string; k: string; e: number }

export async function issueToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = toBase64Url(utf8(JSON.stringify(payload)))
  return `${body}.${toBase64Url(await hmac(secret, body))}`
}

export async function verifyToken(secret: string, token: string, now: number): Promise<TokenPayload | null> {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = toBase64Url(await hmac(secret, body))
  if (!timingSafeEqual(expected, sig)) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as TokenPayload
    return typeof payload.e === 'number' && payload.e > now ? payload : null
  } catch {
    return null
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
