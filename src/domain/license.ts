/**
 * Kode lisensi: 16 karakter Crockford base32 (tanpa I, L, O, U), ditampilkan dalam empat kelompok
 * 'ABCD-EFGH-JKMN-PQRS' supaya mudah disalin. Huruf yang sering tertukar dibaca sebagai angka.
 * Fase 2 hanya memeriksa format; aktivasi ke server dan ikatan perangkat dibuat di Fase 3.
 */
const ALPHABET = /^[0-9A-HJKMNP-TV-Z]{16}$/

export function normalizeLicenseCode(input: string): string | null {
  const raw = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
  if (!ALPHABET.test(raw)) return null
  return raw.match(/.{4}/g)!.join('-')
}
