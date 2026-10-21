/**
 * Membuat kode lisensi acak untuk diunggah ke pengiriman produk digital Lynk.id.
 *
 *   npm run codes -- 200
 *
 * Hasil: file codes-<tanggal>.csv (satu kode per baris, untuk Lynk.id) dan perintah curl untuk
 * mendaftarkan kode ke proxy lewat endpoint admin. Kode asli tidak pernah disimpan di server;
 * server hanya menyimpan hash-nya. Simpan CSV di tempat aman dan jangan di-commit.
 */
import { writeFileSync } from 'node:fs'
import { normalizeLicenseCode } from '../../src/domain/license.ts'

// Crockford base32: tanpa I, L, O, U supaya tidak tertukar saat diketik.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  // 16 karakter x 5 bit = 80 bit acak. 256 habis dibagi 32, jadi tidak ada bias.
  const raw = [...bytes].map((b) => ALPHABET[b % 32]).join('')
  return normalizeLicenseCode(raw)!
}

const count = Number(process.argv[2] ?? 50)
if (!Number.isInteger(count) || count < 1 || count > 1000) {
  console.error('Jumlah kode harus 1 sampai 1000.')
  process.exit(1)
}

const codes = new Set<string>()
while (codes.size < count) codes.add(randomCode())

const file = `codes-${new Date().toISOString().slice(0, 10)}-${Date.now()}.csv`
writeFileSync(file, ['kode', ...codes].join('\n') + '\n')
writeFileSync(`${file}.json`, JSON.stringify({ codes: [...codes] }))

console.log(`${codes.size} kode ditulis ke ${file}`)
console.log('Daftarkan ke proxy (ganti URL dan token admin):')
console.log(`  curl -X POST https://<proxy>/v1/admin/licenses -H "authorization: Bearer <ADMIN_TOKEN>" -H "content-type: application/json" --data @${file}.json`)
console.log(`Lalu hapus ${file}.json setelah berhasil.`)
