# Lunas

PWA local-first untuk membantu orang keluar dari jeratan pinjol. Spesifikasi lengkap ada di [PRD.md](PRD.md).

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm test         # tes unit (Vitest)
npm run build    # cek tipe + build produksi + service worker
npm run preview  # coba hasil build (PWA aktif)
npm run lint
```

## Status

### Fase 3 (proxy dan lisensi) selesai

- **Proxy Cloudflare Worker** di [`proxy/`](proxy/README.md): endpoint ekstraksi, ringkasan, dan saran harian memakai
  `claude-haiku-5-5` (keluaran JSON terstruktur); chat memakai `claude-sonnet-5-5` effort `medium` dengan streaming.
  System prompt tetap dan di-cache, panjang keluaran dibatasi per tugas, tanpa model ketiga dan tanpa fallback.
- **Lisensi**: kode 16 karakter dibuat duluan (`npm run codes` di `proxy/`) untuk diunggah ke Lynk.id. Server hanya
  menyimpan HMAC kode dan hash kunci publik perangkat. Aktivasi memakai tantangan sekali pakai yang ditandatangani
  kunci ECDSA P-256 perangkat (kunci privat tidak bisa diekspor, disimpan di IndexedDB). Satu kode satu HP; reset mandiri sekali.
- **Setiap permintaan AI** membawa token berumur pendek dan tanda tangan perangkat atas isi permintaan. Kuota (paket
  pesan Sonnet, panggilan Haiku per hari, saran sekali sehari) dan laju dihitung per lisensi di proxy. IP hanya sinyal
  anomali: terlalu banyak jaringan berbeda dalam sejam membekukan AI sampai aktivasi ulang dari HP yang sama.
- **Penyaring PII** (`src/domain/pii.ts`) membuang NIK, nomor HP, email, nomor rekening, dan pola alamat di HP dan sekali
  lagi di proxy. **Snapshot anonim** (`src/domain/snapshot.ts`) mengganti nama platform dengan alias Pinjaman A, B, ...
- **Log tanpa isi**: hanya rute, status, durasi, potongan hash lisensi, model, dan jumlah token.
- **Aplikasi**: onboarding mengaktifkan kode ke proxy (`VITE_PROXY_URL`), dengan tombol lepas HP lama saat kode sudah
  terikat. Klien proxy (`src/api/`) memperbarui token otomatis. 'Hapus semua data' tidak menghapus lisensi dan kunci perangkat.
- **Tes**: 28 tes di `proxy/` (kuota habis hanya memblokir AI, tidak ada isi percakapan di log, tanda tangan palsu dan isi
  yang diubah ditolak, klien HP sungguhan melawan proxy sungguhan) dan 106 tes di aplikasi. Diuji juga di runtime
  Cloudflare lokal (`wrangler dev`) dengan aktivasi dari browser.

### Fase 2 (layar inti tanpa AI) selesai

- **Onboarding** (`src/screens/Onboarding.tsx`): sambutan, lalu kode lisensi 16 karakter (`XXXX-XXXX-XXXX-XXXX`).
  Untuk sementara kode hanya dicek formatnya di HP (`normalizeLicenseCode`); aktivasi ke server dan ikatan satu perangkat di Fase 3.
- **Beranda**: grafik setengah lingkaran sisa pokok per pinjaman, persentase terbayar, denda terpisah, kartu Prioritas hari ini
  (ke Rencana bayar), dua jatuh tempo terdekat, check-in perasaan (tersimpan per hari), tombol tema. Belum ada saran AI.
- **Utang**: filter Semua / Terdaftar / Belum terdaftar, baris per pinjaman dengan sisa pokok, jatuh tempo, bar dan persentase lunas,
  label Hampir lunas mulai 80%, denda ditulis terpisah. Ketuk baris untuk rincian, riwayat pembayaran, ubah, dan hapus.
- **Kalender**: navigasi bulan (Senin di kolom pertama), titik di tanggal jatuh tempo dari aturan pengulangan, rincian dan total
  yang harus disiapkan per tanggal, tombol Catat pembayaran, keadaan kosong dengan ilustrasi.
- **Rencana bayar** (dari Beranda dan Utang, tanpa tab sendiri): pemasukan dan kebutuhan dasar diisi pengguna, urutan dan alokasi
  dari `buildPaymentPlan`, kekurangan atau sisa dana, pinjaman belum terdaftar OJK ditandai 'Cek bantuan dulu'.
- **Tambah data** (tombol +): lembar dari bawah untuk tambah pinjaman dan catat pembayaran (pokok atau denda, dengan pratinjau sisa).
  Isian bebas lewat AI menyusul di Fase 4.
- **Tenang**: masih layar sementara; Teman Tenang, jalur krisis, dan layar bantuan dibuat di Fase 4.
- Navigasi lewat hash (`#/utang`, `#/rencana`), jadi tombol kembali di HP berjalan. Halaman komponen Fase 0 ada di `#/komponen`.
- Diuji di browser: lima pinjaman dimasukkan lewat form, angka di Beranda, Utang, Kalender, dan Rencana cocok dengan hitungan manual,
  termasuk setelah mencatat pembayaran pokok, pembayaran denda, mengubah data, dan menghapus.

### Fase 1 (lapisan data dan logika) selesai

- **Skema IndexedDB** (Dexie, `src/db/db.ts`): tabel `loans`, `payments`, `settings`, `feelings`, `suggestions`, `memoryNotes`.
  Akses lewat `src/db/repo.ts` (validasi sebelum simpan, hapus pinjaman ikut menghapus pembayarannya, `wipeAll` untuk Hapus semua data).
- **Fungsi hitung** di `src/domain` (murni, tanpa React atau IndexedDB):
  - `loanProgress` / `portfolioSummary`: persentase lunas = pokok terbayar dibagi pokok awal, dibulatkan ke bawah,
    baru 100% saat benar-benar lunas. Denda dicatat terpisah dan tidak pernah menurunkan persentase.
  - `rankLoans` / `buildPaymentPlan`: urutan prioritas (lewat jatuh tempo → jatuh tempo ≤7 hari → masih lama; lalu beban
    harian terbesar, jatuh tempo terdekat, sisa terkecil) dan alokasi dari sisa untuk cicilan. Pinjaman belum terdaftar OJK
    ditaruh terpisah dengan tanda 'Cek bantuan dulu' dan tidak mendapat alokasi otomatis.
  - `occurrenceDate` / `nextDue` / `scheduleInRange` / `calendarDays`: jadwal jatuh tempo dari aturan pengulangan
    (sekali, bulanan, mingguan, setiap n hari), termasuk akhir bulan, bayar sebagian, dan tenor habis.
  - `formatRupiah` / `formatRupiahShort` / `parseRupiah`, utilitas tanggal `YYYY-MM-DD`, dan `validateLoan` / `validatePayment`.
- Preferensi tema pindah ke tabel Pengaturan; `localStorage` tinggal salinan untuk tampilan pertama.
- 79 tes unit, termasuk kasus denda yang bertambah.

Asumsi yang dipakai (perlu dicek lagi saat beta):
- Pembayaran dicatat sebagai pokok atau denda. Hanya pembayaran pokok yang menaikkan persentase.
- Denda tercatat diperbarui pengguna sendiri; aplikasi tidak menebak denda dari jumlah hari terlambat.
- Cicilan yang ditagih dihitung dari pembayaran pokok sejak pinjaman didata. Tanpa nominal cicilan, seluruh sisa ditagih di satu jatuh tempo.
- Rencana bayar mengalokasikan tagihan yang jatuh tempo dalam 30 hari ke depan.

### Fase 0 (fondasi) selesai

- Vite + React 19 + TypeScript, Tailwind v4, `vite-plugin-pwa` (manifest, ikon, service worker).
- Token warna terang dan gelap dari PRD di `src/styles/tokens.css`, dipetakan ke kelas Tailwind (`bg-card`, `text-muted`, `text-link`, `bg-nav-active`, ...).
  Tema dipasang lewat atribut `data-theme`, mengikuti HP secara bawaan dan bisa diubah manual (`src/theme/useTheme.ts`).
- Komponen dasar di `src/components`: `Card`, `ListCard`/`ListRow`, `Segmented`, `PillNav`, `Avatar`, `StatusText`, `Badge`,
  `ProgressBar`, `SemiDonut` (+ `DonutLegend`), `Button`/`IconButton`.
- Halaman contoh (`src/pages/Showcase.tsx`) menampilkan semua komponen berdampingan di mode terang dan gelap.
  Tangkapan layar ada di `docs/fase-0/`.
