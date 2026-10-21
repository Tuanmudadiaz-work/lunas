import { parseISODate, type ISODate } from './date'

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
/** Senin lebih dulu, sesuai kalender yang umum dipakai di Indonesia. */
export const WEEKDAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/** '24 Okt' */
export function formatDateShort(date: ISODate): string {
  const { m, d } = parseISODate(date)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

/** '24 Oktober 2026' */
export function formatDateLong(date: ISODate): string {
  const { y, m, d } = parseISODate(date)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** 'Oktober 2026' */
export function formatMonth(y: number, m: number): string {
  return `${MONTHS[m - 1]} ${y}`
}

/** Kapan jatuh tempo, dalam bahasa sehari-hari: 'Hari ini', 'Besok', '3 hari lagi', 'Lewat 2 hari'. */
export function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return 'Hari ini'
  if (daysUntil === 1) return 'Besok'
  if (daysUntil > 1) return `${daysUntil} hari lagi`
  return `Lewat ${-daysUntil} hari`
}

/** Indeks kolom (0 = Senin) untuk tanggal 1 bulan itu. */
export function firstWeekdayOfMonth(y: number, m: number): number {
  return (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
}
