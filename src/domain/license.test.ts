import { describe, expect, it } from 'vitest'
import { normalizeLicenseCode } from './license'

describe('kode lisensi', () => {
  it('menerima kode dengan atau tanpa pemisah, huruf kecil juga', () => {
    expect(normalizeLicenseCode('abcd efgh jkmn pqrs')).toBe('ABCD-EFGH-JKMN-PQRS')
    expect(normalizeLicenseCode('ABCD-EFGH-JKMN-PQRS')).toBe('ABCD-EFGH-JKMN-PQRS')
    expect(normalizeLicenseCode(' 2345678923456789 ')).toBe('2345-6789-2345-6789')
  })

  it('membaca huruf yang sering tertukar sebagai angka', () => {
    expect(normalizeLicenseCode('OOOO-IIII-LLLL-2222')).toBe('0000-1111-1111-2222')
  })

  it('menolak panjang atau huruf yang salah', () => {
    expect(normalizeLicenseCode('ABCD-EFGH-JKMN')).toBeNull()
    expect(normalizeLicenseCode('ABCD-EFGH-JKMN-PQRSX')).toBeNull()
    expect(normalizeLicenseCode('ABCD-EFGH-JKMN-PQRU')).toBeNull()
    expect(normalizeLicenseCode('')).toBeNull()
  })
})
