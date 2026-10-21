import { describe, expect, it } from 'vitest'
import { addDays, addMonths, daysBetween, isISODate, parseISODate, todayISO } from './date'

describe('tanggal', () => {
  it('menolak tanggal yang tidak ada', () => {
    expect(isISODate('2026-02-29')).toBe(false)
    expect(isISODate('2028-02-29')).toBe(true)
    expect(isISODate('2026-13-01')).toBe(false)
    expect(isISODate('21/10/2026')).toBe(false)
    expect(() => parseISODate('2026-04-31')).toThrow()
  })

  it('menambah hari melewati bulan dan tahun', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('menghitung selisih hari', () => {
    expect(daysBetween('2026-10-21', '2026-10-24')).toBe(3)
    expect(daysBetween('2026-10-24', '2026-10-21')).toBe(-3)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('menambah bulan dengan memotong ke akhir bulan lalu kembali ke tanggal patokan', () => {
    expect(addMonths('2026-01-31', 1, 31)).toBe('2026-02-28')
    expect(addMonths('2026-01-31', 2, 31)).toBe('2026-03-31')
    expect(addMonths('2026-01-31', 3, 31)).toBe('2026-04-30')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
    expect(addMonths('2028-01-30', 1, 30)).toBe('2028-02-29')
  })

  it('mengambil tanggal lokal perangkat', () => {
    expect(todayISO(new Date(2026, 9, 21, 23, 59))).toBe('2026-10-21')
  })
})
