/**
 * Uang disimpan sebagai bilangan bulat rupiah. Format dibuat manual (bukan Intl) supaya hasilnya
 * sama di semua HP: 'Rp2.400.000', tanpa spasi.
 */

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatRupiah(amount: number): string {
  const n = Math.round(amount)
  const sign = n < 0 ? '-' : ''
  return `${sign}Rp${groupThousands(Math.abs(n))}`
}

/** Bentuk pendek untuk ruang sempit: Rp950rb, Rp2,4jt, Rp1,25M. */
export function formatRupiahShort(amount: number): string {
  const n = Math.round(amount)
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  // Dibulatkan ke bawah (dua desimal) supaya angka pendek tidak pernah terlihat lebih besar.
  const unit = (divisor: number, suffix: string) =>
    `${sign}Rp${String(Math.floor((abs * 100) / divisor) / 100).replace('.', ',')}${suffix}`
  if (abs >= 1_000_000_000) return unit(1_000_000_000, 'M')
  if (abs >= 1_000_000) return unit(1_000_000, 'jt')
  if (abs >= 1_000) return unit(1_000, 'rb')
  return formatRupiah(n)
}

const SUFFIX: Record<string, number> = {
  rb: 1_000,
  ribu: 1_000,
  k: 1_000,
  jt: 1_000_000,
  juta: 1_000_000,
  m: 1_000_000_000,
  miliar: 1_000_000_000,
}

/**
 * Membaca nominal yang diketik pengguna: '2.400.000', 'Rp 2,400,000', '500rb', '2,5 jt', '1.5juta'.
 * Mengembalikan null jika tidak bisa dibaca atau negatif.
 */
export function parseRupiah(input: string): number | null {
  const text = input.trim().toLowerCase().replace(/^rp\.?/, '').replace(/\s+/g, '')
  if (!text) return null

  const withSuffix = /^(\d+(?:[.,]\d+)?)(rb|ribu|k|jt|juta|m|miliar)$/.exec(text)
  if (withSuffix) {
    const value = Number(withSuffix[1].replace(',', '.')) * SUFFIX[withSuffix[2]]
    return Number.isFinite(value) ? Math.round(value) : null
  }

  // Tanpa satuan: titik dan koma dianggap pemisah ribuan. Sen tidak dipakai di aplikasi ini.
  if (!/^\d{1,3}([.,]?\d{3})*$/.test(text) && !/^\d+$/.test(text)) return null
  return Number(text.replace(/[.,]/g, ''))
}
