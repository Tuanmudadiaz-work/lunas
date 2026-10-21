import type { OjkStatus } from '../components'

/**
 * Data contoh untuk halaman komponen saja. Angka ditulis langsung, bukan dihitung:
 * fungsi persentase lunas dan format rupiah dibuat (dengan tes) di Fase 1.
 */
export type SampleLoan = {
  name: string
  /** Alias huruf untuk avatar. */
  alias: string
  remaining: number
  remainingText: string
  due: string
  paidPct: number
  status: OjkStatus
}

export const sampleLoans: SampleLoan[] = [
  { name: 'Pinjaman A', alias: 'A', remaining: 2_400_000, remainingText: 'Rp2.400.000', due: '24 Okt', paidPct: 40, status: 'registered' },
  { name: 'Pinjaman B', alias: 'B', remaining: 300_000, remainingText: 'Rp300.000', due: '26 Okt', paidPct: 85, status: 'registered' },
  { name: 'Pinjaman C', alias: 'C', remaining: 1_750_000, remainingText: 'Rp1.750.000', due: '2 Nov', paidPct: 30, status: 'unregistered' },
  { name: 'Pinjaman D', alias: 'D', remaining: 900_000, remainingText: 'Rp900.000', due: '8 Nov', paidPct: 55, status: 'registered' },
  { name: 'Pinjaman E', alias: 'E', remaining: 650_000, remainingText: 'Rp650.000', due: '15 Nov', paidPct: 15, status: 'unregistered' },
]

export const sampleTotalText = 'Rp6.000.000'
export const samplePaidText = '42% terbayar'
