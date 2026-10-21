# Lunas proxy (Cloudflare Worker)

Satu-satunya jalan aplikasi ke Claude API. HP tidak pernah memegang kunci API. Proxy memeriksa lisensi,
tanda tangan kunci perangkat, laju, dan kuota, lalu meneruskan permintaan ke model sesuai tugasnya:

| Endpoint | Model | Isi |
| --- | --- | --- |
| `POST /v1/extract` | `claude-haiku-5-5` | Kalimat bebas jadi isian pinjaman atau pembayaran (JSON) |
| `POST /v1/summary` | `claude-haiku-5-5` | Ringkasan snapshot keuangan, atau catatan memori satu sesi chat |
| `POST /v1/suggest` | `claude-haiku-5-5` | Tiga kartu saran harian, sekali per hari |
| `POST /v1/chat` | `claude-sonnet-5-5`, effort `medium` | Teman Tenang, dikirim sebagai server-sent events |
| `POST /v1/challenge`, `/v1/activate` | tidak ada | Aktivasi lisensi dan ikatan satu perangkat |
| `POST /v1/reset` | tidak ada | Lepas HP lama, sekali secara mandiri |
| `GET /v1/quota` | tidak ada | Sisa kuota |
| `POST /v1/admin/licenses`, `/revoke`, `/unbind` | tidak ada | Daftarkan kode, cabut (refund), lepas ikatan (bukti invoice) |

Tidak ada endpoint yang menerima nama model dari klien, dan tidak ada fallback ke model lain (PRD: dua model saja).
Jika model menolak, HP mendapat pesan jujur dan kuota tidak berkurang.

## Yang disimpan di server

KV `lic:<HMAC kode>`: status, hash kunci publik perangkat, tanggal aktivasi, jumlah reset, penghitung kuota,
jumlah token, dan hash pendek jaringan satu jam terakhir. Tidak ada kode asli, kunci publik utuh, IP,
data utang, atau isi chat. Log berisi rute, status, durasi, 12 karakter awal hash lisensi, model, dan jumlah token saja.

## Pertama kali deploy

```bash
cd proxy
npm install
npx wrangler login
npx wrangler kv namespace create LUNAS_KV     # salin id ke wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put LICENSE_PEPPER        # acak, panjang; JANGAN diganti setelah kode dibuat
npx wrangler secret put TOKEN_SECRET          # acak, panjang
npx wrangler secret put ADMIN_TOKEN           # acak, panjang
```

Ubah `ALLOWED_ORIGINS` di `wrangler.toml` ke alamat PWA produksi, lalu `npm run deploy`.
Di aplikasi, isi `VITE_PROXY_URL` (misalnya di `.env.production.local`) dengan alamat Worker sebelum `npm run build`.

## Kode lisensi untuk Lynk.id

```bash
npm run codes -- 200
```

Membuat `codes-<tanggal>.csv` (unggah ke pengiriman produk digital Lynk.id, satu kode per pembeli) dan
`codes-<tanggal>.csv.json` untuk didaftarkan ke proxy dengan perintah curl yang dicetak skrip. Kedua file
diabaikan git; simpan CSV di tempat aman dan hapus JSON-nya setelah terdaftar.

Refund: `POST /v1/admin/revoke` dengan `{"codes": ["XXXX-XXXX-XXXX-XXXX"]}`. Ganti HP setelah reset mandiri
terpakai: cek invoice, lalu `POST /v1/admin/unbind` dengan format yang sama.

## Pengembangan lokal

Buat `proxy/.dev.vars` (diabaikan git) berisi `ANTHROPIC_API_KEY`, `LICENSE_PEPPER`, `TOKEN_SECRET`, dan `ADMIN_TOKEN`, lalu:

```bash
npm run dev                                         # Worker di http://localhost:8787
VITE_PROXY_URL=http://localhost:8787 npm run dev    # dari folder root, aplikasi
npm test                                            # 28 tes: aktivasi, tanda tangan, kuota, laju, log, gateway, klien
```

## Angka awal (ubah lewat `[vars]`, tanpa mengubah kode)

| Variabel | Bawaan | Catatan |
| --- | --- | --- |
| `SONNET_MESSAGES_TOTAL` | 300 | Paket pesan Teman Tenang seumur lisensi |
| `HAIKU_CALLS_PER_DAY` | 40 | Isian, ringkasan, dan saran per hari |
| `RATE_PER_MINUTE` | 12 | Permintaan AI per lisensi per menit |
| `TOKEN_TTL_HOURS` | 168 | Umur token; diperbarui otomatis dari HP yang sama |

Ini usulan. PRD meminta kuota ditetapkan dari pengukuran token nyata saat beta (log mencatat jumlah token per permintaan).

## Batas yang diketahui

- KV konsisten-akhirnya: dua permintaan yang benar-benar bersamaan bisa terhitung satu. Jika perlu presisi, pindahkan penghitung ke Durable Object.
- Tanda tangan permintaan berlaku 5 menit; permintaan yang sama bisa diulang dalam jendela itu (dibatasi laju dan kuota).
- System prompt yang pendek mungkin di bawah batas minimum cache, jadi `cache_read` bisa nol sampai prompt Fase 4 lebih panjang.
