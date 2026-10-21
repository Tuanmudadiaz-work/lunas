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
