/** Dua model saja. Klien tidak pernah bisa memilih model. */
export const HAIKU = 'claude-haiku-5-5'
export const SONNET = 'claude-sonnet-5-5'

/** Variabel lingkungan Worker. Nilai rahasia diisi lewat `wrangler secret put`. */
export type Env = {
  LUNAS_KV: import('./kv').KVLike
  ANTHROPIC_API_KEY: string
  /** Kunci HMAC untuk hash kode lisensi dan IP. Tidak boleh berubah setelah kode dibuat. */
  LICENSE_PEPPER: string
  /** Kunci HMAC untuk token akses. Mengganti ini memaksa semua HP memperbarui token. */
  TOKEN_SECRET: string
  /** Token untuk endpoint admin (cabut dan reset lisensi). */
  ADMIN_TOKEN: string
  /** Asal yang boleh memanggil proxy, dipisah koma. */
  ALLOWED_ORIGINS?: string
  SONNET_MESSAGES_TOTAL?: string
  HAIKU_CALLS_PER_DAY?: string
  RATE_PER_MINUTE?: string
  TOKEN_TTL_HOURS?: string
}

export type Limits = {
  /** Paket pesan Teman Tenang per lisensi, seumur lisensi. */
  sonnetMessagesTotal: number
  /** Panggilan Haiku per hari (isian, ringkasan, saran). */
  haikuCallsPerDay: number
  /** Saran harian: satu set per hari. */
  suggestPerDay: number
  ratePerMinute: number
  tokenTtlMs: number
  /** Jaringan berbeda dalam satu jam sebelum kuota dibekukan sementara. */
  networksPerHour: number
  freezeMs: number
  maxBodyBytes: number
}

const int = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

/**
 * Angka awal ini usulan; PRD meminta kuota ditetapkan dari pengukuran token nyata saat beta.
 * Semua bisa diubah lewat variabel lingkungan tanpa mengubah kode.
 */
export function limitsFrom(env: Partial<Env>): Limits {
  return {
    sonnetMessagesTotal: int(env.SONNET_MESSAGES_TOTAL, 300),
    haikuCallsPerDay: int(env.HAIKU_CALLS_PER_DAY, 40),
    suggestPerDay: 1,
    ratePerMinute: int(env.RATE_PER_MINUTE, 12),
    tokenTtlMs: int(env.TOKEN_TTL_HOURS, 24 * 7) * 3_600_000,
    networksPerHour: 6,
    freezeMs: 60 * 60_000,
    maxBodyBytes: 32 * 1024,
  }
}
