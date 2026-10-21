# Lunas: panduan untuk Claude Code

PWA local-first berbayar sekali (Rp50.000 via Lynk.id) untuk membantu orang keluar dari jeratan pinjol.
Spesifikasi lengkap: [PRD.md](PRD.md). Status per fase: [README.md](README.md). Proxy dan deploy: [proxy/README.md](proxy/README.md).
Baca bagian **Safety** dan **Desain** di PRD sebelum menyentuh kode AI atau UI.

## Status (per 21 Okt 2026)

- Fase 0 sampai 3 selesai. Branch terbaru: `fase-3/proxy-lisensi` (berisi semua fase sebelumnya).
  `master` masih berisi Fase 0 saja; branch fase disusun berantai dan belum di-merge.
- Fase berikutnya: **Fase 4, integrasi AI**. Buat branch `fase-4/integrasi-ai` dari `fase-3/proxy-lisensi`.
- Pemilik repo bicara bahasa Indonesia santai (lu/gue). Jawab dengan gaya yang sama.

## Menyiapkan di PC baru

```bash
git switch fase-3/proxy-lisensi
npm install
npm install --prefix proxy
npm test                  # tes aplikasi (Vitest)
npm test --prefix proxy   # tes proxy
npm run dev               # aplikasi di http://localhost:5173 (tanpa proxy: aktivasi cukup cek format, hanya mode dev)
```

Untuk proxy lokal: buat `proxy/.dev.vars` (diabaikan git) berisi `ANTHROPIC_API_KEY`, `LICENSE_PEPPER`, `TOKEN_SECRET`,
`ADMIN_TOKEN` (nilai acak untuk tes), jalankan `npm run dev --prefix proxy` (port 8787), lalu aplikasi dengan
`VITE_PROXY_URL=http://localhost:8787 npm run dev`. Kode lisensi tes: `npm run codes --prefix proxy -- 1`, daftarkan
lewat `POST /v1/admin/licenses` (perintah curl dicetak skrip), lalu hapus file `codes-*` hasilnya.
Jika git menolak commit karena identitas, atur `user.name` dan `user.email` untuk repo ini dulu.

## Aturan yang tidak boleh dilanggar (dari PRD)

- **Dua model saja**: `claude-haiku-5-5` (isian, ringkasan, saran harian; keluaran selalu JSON) dan `claude-sonnet-5-5`
  effort `medium` (Teman Tenang, streaming). Tidak ada model ketiga dan **tidak ada fallback** ke model lain, walaupun
  dokumentasi Claude menyarankan `fallbacks` untuk Sonnet 5.5. Penolakan model dijawab dengan pesan jujur.
- **Angka dihitung kode, bukan AI.** Semua angka berasal dari `src/domain`. AI hanya membaca snapshot.
- **Insight, bukan keputusan.** AI tidak menyuruh bayar/tidak bayar, tidak memberi rekomendasi tunggal, tidak menjamin hasil hukum.
- **Local-first.** Data utang hanya di IndexedDB. Ke AI hanya snapshot anonim (`buildSnapshot`, alias Pinjaman A, B, ...)
  dan teks yang sudah melewati `scrubPII`. Nama platform tidak pernah dikirim.
- **Tidak ada kunci API di klien.** Semua AI lewat proxy (`src/api/` ke `proxy/`). Klien tidak bisa memilih model.
- **Nomor bantuan krisis jangan diisi dari ingatan atau tebakan.** Tunggu nomor yang sudah diverifikasi pemilik repo.
- Setiap perubahan prompt di `proxy/src/prompts.ts` yang menyentuh Safety harus lolos uji 30 percakapan.
- Tulis tes bersama kode untuk logika dan proxy. Status legal selalu berupa teks, bukan warna saja.

## Peta kode

| Tempat | Isi |
| --- | --- |
| `src/domain/` | Logika murni dengan tes: persentase, prioritas, rencana bayar, jadwal, rupiah, tanggal, form, PII, snapshot, tanda tangan, lisensi |
| `src/db/` | Dexie (IndexedDB) versi 2 dan `repo` tervalidasi |
| `src/api/` | Kunci perangkat (WebCrypto, tidak bisa diekspor) dan klien proxy bertanda tangan |
| `src/app/` | Hook data reaktif, navigasi hash (`#/utang`), tipe lembar |
| `src/screens/`, `src/sheets/` | Layar (Beranda, Utang, Kalender, Rencana, Tenang, Onboarding) dan lembar bawah (tambah, form, bayar, rincian) |
| `src/components/` | Komponen Fase 0 + `Sheet` (`<dialog>`), `Field`, `ScreenHeader` |
| `proxy/src/` | Worker: `app.ts` (rute, auth, kuota, log), `gateway.ts` (SDK Anthropic), `prompts.ts`, `schemas.ts` (Zod v4) |
| `src/pages/Showcase.tsx` | Halaman komponen di `#/komponen` |

Gaya: komentar dan teks UI dalam bahasa Indonesia, nada santai tanpa menghakimi. Token warna di `src/styles/tokens.css`.
Commit: `Fase N: ringkasan` diakhiri `Co-Authored-By`. Acuan visual: kanvas desain di PRD.

## Keputusan yang sudah diambil (boleh dipertanyakan pemilik, jangan diubah diam-diam)

- Pinjaman belum terdaftar OJK ditandai "Cek bantuan dulu" dan **tidak mendapat alokasi otomatis** di Rencana bayar.
- Pembayaran dicatat sebagai pokok atau denda; hanya pokok yang menaikkan persentase. Denda tercatat diisi pengguna.
- Rencana bayar mengalokasikan tagihan yang jatuh tempo dalam 30 hari.
- Proxy: Cloudflare Workers + KV. Kode lisensi dibuat duluan (`npm run codes`) dan diunggah ke Lynk.id.
- Kuota awal (usulan, ubah di `proxy/wrangler.toml`): 300 pesan Sonnet per lisensi, 40 panggilan Haiku per hari, 1 saran per hari, 12 permintaan per menit, token 7 hari.
- "Hapus semua data" menyimpan lisensi dan kunci perangkat.

## Rencana Fase 4 (integrasi AI)

Kriteria selesai dari PRD: uji 30 percakapan lulus dan jalur krisis muncul pada semua kasus pemicu.

1. **Teman Tenang** (`src/screens/Tenang.tsx`, sekarang layar sementara): chat streaming dari `POST /v1/chat` (event SSE
   `text`, `done`, `error`), kirim snapshot + catatan memori + paling banyak 8 pesan terakhir. Simpan riwayat di IndexedDB
   (perlu tabel baru di Dexie versi 3). Quick reply, catatan privasi, sisa kuota terlihat (`quota.sonnetLeft`), pesan galat jujur dengan coba lagi.
   Ganti alias di jawaban AI kembali ke nama platform hanya di tampilan (`aliasMap`).
2. **Jalur krisis**: deteksi kata kunci di klien sebelum kirim (fungsi murni dengan tes di `src/domain`), layar
   "Butuh bantuan profesional?" yang bisa dibuka tanpa internet dan tanpa kuota, tautan selalu terlihat di Teman Tenang.
   Nomor bantuan: **minta ke pemilik repo**, jangan diisi sendiri.
3. **Saran harian di Beranda**: `POST /v1/suggest` sekali per hari, simpan lewat `repo.saveSuggestion`, carousel tiga kartu
   (Tenang, Rencana, Hak lu) yang membuka Teman Tenang. Tanpa internet atau kuota habis: Beranda tetap utuh.
4. **Isian dari kalimat bebas** di lembar Tambah: `POST /v1/extract`. Sebelum kirim, ganti nama platform yang dikenal
   dengan alias dan jalankan `scrubPII`. Hasil mengisi form; **pengguna wajib konfirmasi sebelum simpan**.
5. **Ringkasan percakapan** jadi catatan memori (`POST /v1/summary` kind `conversation`) saat sesi selesai.
6. **Uji 30 percakapan**: skrip di `proxy/` yang memanggil Sonnet sungguhan (butuh `ANTHROPIC_API_KEY`, minta izin pemilik
   karena memakai biaya) dengan kasus: permintaan keputusan langsung, pertanyaan hukum, ungkapan putus asa, pancingan
   berhenti bayar, upaya mengeluarkan data pribadi. Nilai dengan aturan tabel Safety PRD; simpan hasilnya.

## Jebakan yang sudah ditemui

- Alat screenshot di browser pane kadang memotong atau memperbesar gambar (skala layar Windows). Verifikasi tata letak
  lewat DOM (`getBoundingClientRect`, `innerText`), bukan screenshot saja.
- Setelah menambah dependency baru, server Vite yang sedang jalan bisa memuat dua salinan React ("Invalid hook call").
  Muat ulang halaman atau restart server dev.
- Di StrictMode, `<dialog>` dibuka-tutup dua kali; `Sheet.tsx` sudah menangani event `close` yang datang terlambat.
- `client.messages.parse` di SDK melempar galat parsing pada jawaban yang ditolak; `gateway.ts` sengaja memakai `create`
  lalu memeriksa `stop_reason` sebelum memvalidasi JSON dengan Zod.
- Heredoc panjang di Git Bash kadang terpotong; untuk file baru pakai tool Write.
