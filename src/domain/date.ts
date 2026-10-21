/**
 * Tanggal kalender tanpa jam, format 'YYYY-MM-DD'. Semua hitungan jatuh tempo memakai
 * nomor hari (UTC) supaya tidak bergeser karena zona waktu atau jam musim panas.
 */
export type ISODate = string

const DAY_MS = 86_400_000
const RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseISODate(date: ISODate): { y: number; m: number; d: number } {
  const match = RE.exec(date)
  if (!match) throw new Error(`Tanggal tidak valid: ${date}`)
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) throw new Error(`Tanggal tidak valid: ${date}`)
  return { y, m, d }
}

export function isISODate(value: string): boolean {
  try {
    parseISODate(value)
    return true
  } catch {
    return false
  }
}

export function toISODate(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Tanggal hari ini menurut jam perangkat. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function dayNumber(date: ISODate): number {
  const { y, m, d } = parseISODate(date)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * DAY_MS)
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(dayNumber(date) + days)
}

/** Selisih hari b dikurangi a. Positif jika b sesudah a. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return dayNumber(b) - dayNumber(a)
}

/**
 * Tambah bulan dengan tanggal patokan. Jika bulan tujuan lebih pendek, tanggal dipotong ke akhir
 * bulan (31 Jan + 1 bulan = 28/29 Feb), lalu kembali ke tanggal patokan di bulan berikutnya.
 */
export function addMonths(date: ISODate, months: number, anchorDay?: number): ISODate {
  const { y, m, d } = parseISODate(date)
  const index = y * 12 + (m - 1) + months
  const ny = Math.floor(index / 12)
  const nm = (index % 12) + 1
  return toISODate(ny, nm, Math.min(anchorDay ?? d, daysInMonth(ny, nm)))
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}
