import { describe, expect, it } from 'vitest'
import { firstWeekdayOfMonth, formatDateLong, formatDateShort, formatDaysUntil, formatMonth } from './format'

describe('format tanggal', () => {
  it('bahasa Indonesia', () => {
    expect(formatDateShort('2026-10-24')).toBe('24 Okt')
    expect(formatDateShort('2026-08-01')).toBe('1 Agu')
    expect(formatDateLong('2026-10-24')).toBe('24 Oktober 2026')
    expect(formatMonth(2026, 11)).toBe('November 2026')
  })

  it('jarak hari dalam bahasa sehari-hari', () => {
    expect(formatDaysUntil(0)).toBe('Hari ini')
    expect(formatDaysUntil(1)).toBe('Besok')
    expect(formatDaysUntil(5)).toBe('5 hari lagi')
    expect(formatDaysUntil(-2)).toBe('Lewat 2 hari')
  })

  it('kolom pertama bulan, Senin = 0', () => {
    expect(firstWeekdayOfMonth(2026, 10)).toBe(3) // 1 Okt 2026 hari Kamis
    expect(firstWeekdayOfMonth(2026, 11)).toBe(6) // 1 Nov 2026 hari Minggu
    expect(firstWeekdayOfMonth(2026, 6)).toBe(0) // 1 Jun 2026 hari Senin
  })
})
