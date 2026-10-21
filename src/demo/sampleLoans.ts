import { formatRupiah, type OjkStatus } from '../domain'

/**
 * Data contoh untuk halaman komponen saja. Teks rupiah sudah memakai `formatRupiah`;
 * layar sungguhan (Fase 2) menghitung sisa dan persentase dari data IndexedDB.
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

const rows: Omit<SampleLoan, 'remainingText'>[] = [
  { name: 'Pinjaman A', alias: 'A', remaining: 2_400_000, due: '24 Okt', paidPct: 40, status: 'registered' },
  { name: 'Pinjaman B', alias: 'B', remaining: 300_000, due: '26 Okt', paidPct: 85, status: 'registered' },
  { name: 'Pinjaman C', alias: 'C', remaining: 1_750_000, due: '2 Nov', paidPct: 30, status: 'unregistered' },
  { name: 'Pinjaman D', alias: 'D', remaining: 900_000, due: '8 Nov', paidPct: 55, status: 'registered' },
  { name: 'Pinjaman E', alias: 'E', remaining: 650_000, due: '15 Nov', paidPct: 15, status: 'unregistered' },
]

export const sampleLoans: SampleLoan[] = rows.map((r) => ({ ...r, remainingText: formatRupiah(r.remaining) }))

export const sampleTotalText = formatRupiah(sampleLoans.reduce((s, l) => s + l.remaining, 0))
export const samplePaidText = '42% terbayar'
