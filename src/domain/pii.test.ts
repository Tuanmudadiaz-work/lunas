import { describe, expect, it } from 'vitest'
import { containsPII, scrubPII } from './pii'

describe('penyaring data pribadi', () => {
  it.each([
    ['NIK gue 3174012345678901 ya', 'NIK gue [NIK] ya'],
    ['nik 3174 0123 4567 8901', 'nik [NIK]'],
    ['WA 0812-3456-7890 aja', 'WA [NOMOR] aja'],
    ['telp +62 812 3456 7890', 'telp [NOMOR]'],
    ['hubungi 6281234567890', 'hubungi [NOMOR]'],
    ['email budi.s@contoh.co.id', 'email [EMAIL]'],
    ['rek BCA 1234567890', 'rek BCA [NOMOR]'],
    ['rumah di Jl. Melati Raya No 5, Bekasi', 'rumah di [ALAMAT], Bekasi'],
    ['RT 03/RW 07 kelurahan', '[ALAMAT] kelurahan'],
  ])('%s', (input, expected) => {
    expect(scrubPII(input)).toBe(expected)
  })

  it('tidak menutup nominal, tanggal, atau angka biasa', () => {
    const text = 'pinjam 2.400.000, denda 20rb/hari, jatuh tempo 24 Okt 2026, tenor 3 bulan, sisa Rp1.250.000'
    expect(scrubPII(text)).toBe(text)
    expect(containsPII(text)).toBe(false)
  })
})
