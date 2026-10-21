/**
 * Bagian dari Cloudflare KV yang dipakai proxy. Di produksi ini KVNamespace asli; di tes, MemoryKV.
 * Catatan: KV konsisten-akhirnya, jadi hitungan kuota dan laju bisa meleset sedikit saat permintaan
 * datang bersamaan. Untuk produk Rp50.000 ini cukup; jika perlu presisi, pindahkan ke Durable Object.
 */
export interface KVLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export async function getJSON<T>(kv: KVLike, key: string): Promise<T | null> {
  const raw = await kv.get(key)
  return raw === null ? null : (JSON.parse(raw) as T)
}

export function putJSON(kv: KVLike, key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  // KV menolak TTL di bawah 60 detik.
  return kv.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: Math.max(60, Math.ceil(ttlSeconds)) } : undefined)
}

export class MemoryKV implements KVLike {
  private store = new Map<string, { value: string; expiresAt: number | null }>()
  constructor(private now: () => number = Date.now) {}

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, { value, expiresAt: options?.expirationTtl ? this.now() + options.expirationTtl * 1000 : null })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  /** Untuk tes: semua isi yang tersimpan, termasuk kunci. */
  dump(): string {
    return JSON.stringify([...this.store.entries()])
  }
}
