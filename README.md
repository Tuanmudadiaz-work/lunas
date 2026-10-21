# Lunas

PWA local-first untuk membantu orang keluar dari jeratan pinjol. Spesifikasi lengkap ada di [PRD.md](PRD.md).

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm run build    # cek tipe + build produksi + service worker
npm run preview  # coba hasil build (PWA aktif)
npm run lint
```

## Status: Fase 0 (fondasi) selesai

- Vite + React 19 + TypeScript, Tailwind v4, `vite-plugin-pwa` (manifest, ikon, service worker, precache ±340 KB).
- Token warna terang dan gelap dari PRD di `src/styles/tokens.css`, dipetakan ke kelas Tailwind (`bg-card`, `text-muted`, `text-link`, `bg-nav-active`, ...).
  Tema dipasang lewat atribut `data-theme`, mengikuti HP secara bawaan dan bisa diubah manual (`src/theme/useTheme.ts`).
- Komponen dasar di `src/components`: `Card`, `ListCard`/`ListRow`, `Segmented`, `PillNav`, `Avatar`, `StatusText`, `Badge`,
  `ProgressBar`, `SemiDonut` (+ `DonutLegend`), `Button`/`IconButton`.
- Halaman contoh (`src/pages/Showcase.tsx`) menampilkan semua komponen berdampingan di mode terang dan gelap.
  Tangkapan layar ada di `docs/fase-0/`.

Catatan untuk fase berikutnya:
- Angka di halaman contoh ditulis langsung di `src/demo/sampleLoans.ts`. Fungsi persentase, prioritas, dan format rupiah dibuat dengan tes di Fase 1.
- Preferensi tema sementara disimpan di `localStorage`; Fase 1 memindahkannya ke tabel Pengaturan (IndexedDB).
