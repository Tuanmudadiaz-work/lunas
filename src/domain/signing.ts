/**
 * Tanda tangan perangkat, dipakai bersama oleh HP dan proxy. Kunci ECDSA P-256 dibuat di HP lewat
 * WebCrypto (kunci privat tidak bisa diekspor). Server hanya menyimpan hash kunci publik.
 * Tanda tangan WebCrypto berformat IEEE P1363 (r||s, 64 byte) di browser, Node, dan Workers.
 */

export const SIGN_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const
export const SIGN_PARAMS = { name: 'ECDSA', hash: 'SHA-256' } as const

/** Selisih jam HP dan server yang masih diterima. */
export const MAX_CLOCK_SKEW_MS = 5 * 60_000

export const HEADER_KEY = 'x-lunas-key'
export const HEADER_TIME = 'x-lunas-time'
export const HEADER_SIG = 'x-lunas-sig'

const encoder = new TextEncoder()

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const b of view) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export async function sha256Hex(data: string | Uint8Array<ArrayBuffer>): Promise<string> {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Teks yang ditandatangani untuk setiap permintaan AI. Isi body diwakili hash-nya saja. */
export async function requestSigningPayload(method: string, path: string, time: string, body: string): Promise<string> {
  return `${method.toUpperCase()}\n${path}\n${time}\n${await sha256Hex(body)}`
}

/** Teks yang ditandatangani saat aktivasi: mengikat tantangan server ke kode lisensi. */
export function activationSigningPayload(nonce: string, code: string): string {
  return `activate\n${nonce}\n${code}`
}

export function utf8(text: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(text)
}
