import { describe, expect, it } from 'vitest'
import { formatRupiah, formatRupiahShort, parseRupiah } from './money'

describe('format rupiah', () => {
  it('memakai titik sebagai pemisah ribuan tanpa spasi', () => {
    expect(formatRupiah(0)).toBe('Rp0')
    expect(formatRupiah(950)).toBe('Rp950')
    expect(formatRupiah(2_400_000)).toBe('Rp2.400.000')
    expect(formatRupiah(1_234_567_890)).toBe('Rp1.234.567.890')
    expect(formatRupiah(-15_000)).toBe('-Rp15.000')
    expect(formatRupiah(1499.6)).toBe('Rp1.500')
  })

  it('bentuk pendek dibulatkan ke bawah', () => {
    expect(formatRupiahShort(950)).toBe('Rp950')
    expect(formatRupiahShort(950_000)).toBe('Rp950rb')
    expect(formatRupiahShort(2_400_000)).toBe('Rp2,4jt')
    expect(formatRupiahShort(1_290_000)).toBe('Rp1,29jt')
    expect(formatRupiahShort(1_999_999)).toBe('Rp1,99jt')
    expect(formatRupiahShort(1_250_000_000)).toBe('Rp1,25M')
  })
})

describe('baca nominal', () => {
  it.each([
    ['2.400.000', 2_400_000],
    ['Rp 2.400.000', 2_400_000],
    ['rp2,400,000', 2_400_000],
    ['500000', 500_000],
    ['500rb', 500_000],
    ['500 ribu', 500_000],
    ['2,5 jt', 2_500_000],
    ['1.5juta', 1_500_000],
    ['300k', 300_000],
  ])('%s → %d', (input, expected) => {
    expect(parseRupiah(input)).toBe(expected)
  })

  it.each(['', 'abc', '-50000', '1.2345', '2,5'])('menolak %j', (input) => {
    expect(parseRupiah(input)).toBeNull()
  })
})
