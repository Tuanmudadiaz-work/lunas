/**
 * Penyaring data pribadi untuk teks bebas sebelum dikirim ke AI. Dijalankan di HP (sebelum kirim)
 * dan sekali lagi di proxy. Sengaja agak rakus: lebih baik ada kata yang ikut tertutup daripada NIK bocor.
 * Nominal rupiah ('2.400.000', '500rb') dan tanggal tidak ikut tertutup.
 */

type Rule = { label: string; pattern: RegExp }

const RULES: Rule[] = [
  // Email lebih dulu supaya angka di dalamnya tidak terbaca sebagai nomor telepon.
  { label: '[EMAIL]', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // NIK dan nomor KK: 16 digit, boleh dipisah spasi, titik, atau strip di antara digit.
  { label: '[NIK]', pattern: /(?<!\d)\d(?:[\s.-]?\d){15}(?!\d)/g },
  // Nomor HP Indonesia: 08.., 62 8.., +62 8.., dengan pemisah spasi atau strip.
  { label: '[NOMOR]', pattern: /(?<![\d+])(?:\+?62[\s-]?|0)8\d{1,3}(?:[\s-]?\d{3,4}){2,3}(?!\d)/g },
  // Nomor rekening atau kartu: 10 digit atau lebih tanpa pemisah ribuan.
  { label: '[NOMOR]', pattern: /(?<![\d.,])\d{10,}(?![\d.,])/g },
  // Alamat: kata penanda jalan sampai koma, titik, atau akhir baris.
  {
    label: '[ALAMAT]',
    pattern: /\b(?:jl|jln|jalan|gg|gang|komplek|kompleks|perum|perumahan|blok)\b\.?\s+[^,.\n]{2,60}/gi,
  },
  { label: '[ALAMAT]', pattern: /\bRT\.?\s*\d{1,3}\s*\/?\s*RW\.?\s*\d{1,3}\b/gi },
]

export function scrubPII(text: string): string {
  return RULES.reduce((out, rule) => out.replace(rule.pattern, rule.label), text)
}

/** true jika teks masih mengandung pola data pribadi (dipakai tes dan pemeriksaan proxy). */
export function containsPII(text: string): boolean {
  return scrubPII(text) !== text
}
