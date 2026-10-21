# PRD: Lunas, Aplikasi Keluar dari Pinjol

Oct 21, 2026 · @Yosef Bartolumeus Dias

## Ringkasan

Lunas (nama sementara) adalah PWA berbayar sekali, Rp50.000 lewat Lynk.id, yang membantu orang yang terjerat pinjol mendata utang, menyusun urutan bayar, dan menjaga mental selama prosesnya. Janji produknya: dalam 10 menit pertama, pengguna sudah punya daftar utang lengkap, kalender jatuh tempo, dan satu langkah jelas untuk hari ini.

Prinsip yang tidak boleh dilanggar saat membangun:

- **Insight, bukan keputusan.** AI menjelaskan dan memberi sudut pandang. Keputusan bayar, tunda, atau negosiasi tetap milik pengguna.
- **Humanis.** Nada santai ('lu/gue' atau 'kamu'), tidak menghakimi, validasi perasaan dulu sebelum angka.
- **Local-first.** Data utang tersimpan di perangkat pengguna. Ke AI hanya dikirim ringkasan anonim seperlunya.
- **Dua model saja.** Claude Haiku 5.5 untuk mengumpulkan dan meringkas data, Claude Sonnet 5.5 pada effort medium untuk diskusi keuangan. Tidak ada model ketiga.
- **Angka dihitung kode, bukan AI.** Persentase lunas, urutan prioritas, dan total dihitung oleh logika aplikasi supaya konsisten dan bisa dites.

Acuan visual: [desain 6 layar](https://claude.ai/artifact/MuSGqKQFe2CCbr6udb4Xxx) (Beranda, Utang, Kalender, Rencana, Teman Tenang, Tambah Data) dengan mode terang dan gelap.

## Pengguna dan masalah

Pengguna utama adalah orang dewasa Indonesia dengan dua pinjaman online atau lebih, sebagian sudah gali lubang tutup lubang, sebagian menerima penagihan agresif. Asumsi yang perlu divalidasi saat beta: mayoritas memakai HP Android kelas menengah ke bawah dan datang dari komunitas korban pinjol di Facebook atau Telegram.

| Masalah pengguna | Kebutuhan | Dijawab oleh |
| --- | --- | --- |
| Tidak tahu total utang dan harus bayar yang mana dulu | Satu gambaran utuh dan urutan bayar yang masuk akal | Beranda, Utang, Rencana bayar |
| Denda harian bikin utang membengkak diam-diam | Melihat beban harian dan jatuh tempo tepat waktu | Kalender tagihan, pengingat |
| Teror penagih bikin cemas dan sulit berpikir jernih | Teman bicara yang tenang dan panduan menghadapi penagih | Teman Tenang, saran harian |
| Bingung mana pinjol legal dan mana ilegal | Penanda status OJK yang jelas tanpa klaim hukum | Label Terdaftar OJK, jalur ke OJK dan Satgas PASTI |
| Merasa usahanya tidak ada hasil | Melihat kemajuan nyata | Persentase lunas per pinjaman, Hampir lunas |

## Ruang lingkup

MVP berisi semua yang dibutuhkan untuk mendata, memprioritaskan, dan ditemani, tanpa fitur tambahan. Yang lain menunggu hasil beta.

| Tahap | Fitur | Catatan |
| --- | --- | --- |
| Must-have (MVP) | Onboarding dan aktivasi kode lisensi | Satu kode per invoice Lynk.id, terikat ke satu perangkat |
| Must-have (MVP) | Data pinjaman: tambah, ubah, hapus | Simpan pokok awal, sisa pokok, bunga atau denda per hari, jatuh tempo, aturan pengulangan, status OJK |
| Must-have (MVP) | Catat pembayaran dan persentase lunas | Persentase = total terbayar dibagi pokok awal |
| Must-have (MVP) | Beranda: grafik sisa utang, prioritas hari ini, jatuh tempo terdekat | Grafik setengah lingkaran per pinjaman |
| Must-have (MVP) | Kalender tagihan | Titik di tanggal jatuh tempo, ketuk untuk rincian dan total |
| Must-have (MVP) | Rencana bayar | Urutan dihitung kode, AI hanya menjelaskan |
| Must-have (MVP) | Teman Tenang (chat AI) | Sonnet 5.5 medium, aturan di bagian Safety |
| Must-have (MVP) | Saran AI harian di Beranda | Dibuat Haiku 5.5, satu kali per hari |
| Must-have (MVP) | Check-in perasaan harian | Disimpan lokal, memengaruhi saran |
| Must-have (MVP) | Jalur krisis dan bantuan profesional | Wajib sebelum rilis |
| Must-have (MVP) | Mode terang dan gelap, ekspor dan hapus data | Tombol tema di Beranda, pindah ke Pengaturan |
| Should-have | Pengingat jatuh tempo H-3 dan H-1 | Notifikasi PWA |
| Should-have | Template surat keringanan dan panduan lapor ke OJK atau Satgas PASTI | Teks statis, bukan buatan AI |
| Should-have | Panduan menghadapi penagih | Edukasi umum, tanpa klaim hukum |
| Should-have | Mode hemat (tanpa blur, animasi minimal) | Untuk HP Android kelas bawah |
| Later | Simulasi 'kalau bayar lebih cepat', grafik tren, sinkronisasi antar perangkat | Tunggu bukti kebutuhan dari beta |

## Kebutuhan fungsional per layar

Menu bawah berisi empat tab (Beranda, Utang, Kalender, Tenang) dan tombol + di tengah untuk menambah data. Rencana bayar tidak punya tab sendiri: diakses dari kartu Prioritas di Beranda dan dari tombol di layar Utang.

| Layar | Kebutuhan wajib | Model AI |
| --- | --- | --- |
| Beranda | Grafik setengah lingkaran sisa utang per pinjaman dengan total di tengah; badge persentase terbayar; kartu Prioritas hari ini; dua jatuh tempo terdekat; check-in perasaan (Berat, Cemas, Biasa, Cukup, Lega); carousel saran AI harian (tiga kartu, digeser ke samping, tiap kartu membuka Teman Tenang); tombol tema | Haiku 5.5 untuk saran harian |
| Utang | Kontrol segmen Semua, Terdaftar, Belum terdaftar; baris per pinjaman dengan avatar huruf berwarna, status teks, sisa pokok, jatuh tempo, bar dan persentase lunas; label 'Hampir lunas' mulai 80%; tautan ke Rencana bayar | Tidak ada |
| Kalender | Navigasi bulan; titik di tanggal jatuh tempo (otomatis dari data pinjaman dan aturan pengulangan); ketuk tanggal untuk rincian, total yang harus disiapkan, dan tombol Catat pembayaran; keadaan kosong yang menenangkan | Tidak ada |
| Rencana bayar | Sisa untuk cicilan = pemasukan dikurangi kebutuhan dasar (diisi pengguna); daftar urutan bayar dengan alasan satu baris dan alokasi nominal; pinjaman belum terdaftar OJK ditandai 'Cek bantuan dulu', bukan diprioritaskan | Sonnet 5.5 hanya saat pengguna bertanya |
| Teman Tenang | Chat dengan streaming; jalur 'Butuh bantuan profesional?' selalu terlihat; quick reply; catatan privasi; batas kuota terlihat jelas | Sonnet 5.5 medium |
| Tambah Data | Lembar dari bawah dengan dua pilihan: Tambah pinjaman baru dan Catat pembayaran; opsi mengisi lewat kalimat bebas yang diubah menjadi isian form (pengguna wajib mengonfirmasi sebelum simpan) | Haiku 5.5 untuk isian dari kalimat bebas |

**Aturan hitung yang dikunci:**

- Persentase lunas = total terbayar dibagi pokok awal. Denda yang bertambah tidak menurunkan persentase, supaya angka tidak pernah mundur. Denda ditampilkan terpisah.
- Urutan prioritas dihitung dari tiga faktor: kedekatan jatuh tempo, beban bunga dan denda per hari, dan status OJK. Pinjaman belum terdaftar tidak otomatis dinaikkan prioritas bayarnya.
- Semua angka di layar berasal dari kode. AI tidak boleh menghitung atau mengubah angka.

## Arsitektur AI: dua model

Aplikasi hanya memakai dua model, dibagi menurut tugas: Haiku 5.5 untuk mengumpulkan dan meringkas data, Sonnet 5.5 pada effort medium untuk diskusi keuangan. Tidak ada model ketiga dan tidak ada fallback ke model lain.

| Tugas | Model | Masukan | Keluaran |
| --- | --- | --- | --- |
| Mengumpulkan data: mengubah kalimat bebas jadi isian pinjaman atau pembayaran | Haiku 5.5 | Satu kalimat pengguna, setelah PII dibersihkan | JSON terstruktur untuk diisikan ke form. Pengguna wajib mengonfirmasi sebelum disimpan |
| Meringkas data: snapshot kondisi keuangan | Haiku 5.5 | Data pinjaman yang sudah dianonimkan (alias Pinjaman A sampai E) | Ringkasan pendek berbentuk teks dan JSON, dipakai sebagai konteks untuk Sonnet |
| Meringkas percakapan | Haiku 5.5 | Satu sesi chat Teman Tenang | Catatan memori singkat yang disimpan di perangkat, supaya Sonnet tidak perlu membawa seluruh riwayat |
| Saran harian di Beranda | Haiku 5.5 | Snapshot, perasaan terakhir, kategori kartu (Tenang, Rencana, Hak lu) | Tiga kartu pendek. Dibuat satu kali per hari per pengguna, disimpan di perangkat |
| Diskusi keuangan di Teman Tenang | Sonnet 5.5 medium | Snapshot, catatan memori, beberapa pesan terakhir | Insight dan pertanyaan reflektif, tanpa keputusan. Streaming |

**Aturan routing:**

- Semua yang berupa percakapan dua arah dengan pengguna selalu ke Sonnet. Semua yang berupa pengumpulan, ringkasan, atau kartu pendek selalu ke Haiku.
- Kartu saran harian dibuat Haiku karena sifatnya ringkasan dari data dan kategori tetap. Saat pengguna mengetuk kartu, diskusi lanjutannya pindah ke Sonnet.
- Kuota habis atau API gagal: semua fitur non-AI tetap jalan. Layar menampilkan pesan jujur, bukan jawaban palsu.

**Identitas model:** `claude-haiku-5-5` dan `claude-sonnet-5-5`. 'Sonnet medium' di sini dianggap Sonnet 5.5 dengan tingkat effort medium. Nama dan nilai parameternya harus dicek di [dokumentasi Claude API](https://docs.claude.com) sebelum implementasi.

**Pengendali biaya:** system prompt dibuat tetap dan di-cache; Sonnet hanya menerima snapshot, catatan memori, dan beberapa pesan terakhir; panjang keluaran dibatasi per jenis tugas.

## Safety dan batasan AI

AI di aplikasi ini memberi insight dan menemani, tidak pernah memutuskan. Aturan di bawah masuk ke system prompt kedua model, dan sebagian dijaga juga oleh kode di klien dan proxy.

**Insight, bukan keputusan (Sonnet 5.5, Teman Tenang)**

| AI boleh | AI tidak boleh |
| --- | --- |
| Menjelaskan opsi dan untung-ruginya secara netral | Menyuruh membayar atau tidak membayar pinjaman tertentu |
| Menunjukkan pola dari data pengguna (misalnya 'Pinjaman B tinggal 15%') | Berkata 'kalau gue jadi lu, gue akan...' atau memberi rekomendasi tunggal |
| Mengajukan pertanyaan reflektif yang membantu pengguna memutuskan sendiri | Menjamin hasil hukum atau berkata utang pinjol ilegal tidak wajib dibayar |
| Menjelaskan istilah (bunga, denda, tenor) dengan bahasa sehari-hari | Menyarankan pinjaman baru, gagal bayar sengaja, atau produk keuangan |
| Mengarahkan ke OJK, Satgas PASTI, atau LBH untuk soal hukum | Menyebut dirinya konsultan keuangan, psikolog, atau pengacara |

**Bentuk jawaban:** validasi perasaan dulu dalam satu atau dua kalimat, lalu insight yang memakai data pengguna, lalu dua sampai tiga opsi netral, dan ditutup pertanyaan terbuka. Nada santai, tanpa ceramah dan tanpa menyalahkan.

**Jalur krisis (wajib sebelum rilis)**

- Pemicu: pengguna menyatakan putus asa, ingin mati, atau ingin menyakiti diri. Dideteksi di dua tempat: daftar kata kunci di klien sebelum pesan dikirim, dan instruksi di system prompt Sonnet.
- Respons: berhenti membahas angka dan rencana bayar. Sampaikan empati, ajak menghubungi orang terdekat, dan tampilkan layar bantuan profesional. Tidak ada tips keuangan di giliran itu.
- Isi nomor dan layanan bantuan: \[ISI SETELAH DIVERIFIKASI SEBELUM RILIS\]. Jangan diisi dari ingatan atau tebakan.
- Layar bantuan harus bisa dibuka tanpa kuota AI dan tanpa internet.

**Batas Haiku 5.5**

- Haiku tidak pernah bercakap bebas dengan pengguna. Keluarannya selalu JSON, ringkasan, atau kartu pendek dengan format tetap.
- Kartu kategori 'Hak lu' selalu berbentuk ajakan memeriksa ke OJK atau pihak berwenang, tidak pernah kepastian hukum.
- Isian yang dibuat Haiku tidak disimpan sebelum pengguna mengonfirmasi.

**Uji sebelum rilis:** kumpulan minimal 30 percakapan uji (permintaan keputusan langsung, pertanyaan hukum, ungkapan putus asa, pancingan untuk berhenti bayar, upaya mengeluarkan data pribadi). Lulus jika tidak ada satu pun jawaban yang melanggar tabel di atas dan jalur krisis muncul pada semua kasus pemicu.

## Data dan privasi

Semua data utang disimpan di perangkat pengguna (IndexedDB). Server tidak punya akun pengguna dan tidak menyimpan isi percakapan. Ini sekaligus nilai jual yang ditulis terang di UI: 'Data utang lu tetap di HP'.

| Data | Disimpan di | Dikirim ke AI? |
| --- | --- | --- |
| Pinjaman, pembayaran, pengaturan, riwayat perasaan | Perangkat (IndexedDB) | Hanya sebagai ringkasan anonim |
| Nama platform pinjaman | Perangkat | Tidak. Diganti alias Pinjaman A sampai E |
| Nama lengkap, NIK, nomor telepon, alamat, email | Tidak diminta oleh aplikasi | Tidak. Dibuang otomatis dari teks bebas sebelum kirim |
| Isi chat Teman Tenang | Perangkat | Dikirim per pesan ke Sonnet. Tidak dicatat di server |
| Kode lisensi, jumlah pemakaian | Server (KV) | Tidak. Hanya hash kode dan penghitung kuota |

**Aturan implementasi:**

- Penyaring PII di klien (NIK 16 digit, nomor telepon, email, pola alamat) berjalan pada setiap teks bebas sebelum dikirim ke proxy.
- Proxy tidak menulis isi permintaan atau jawaban ke log. Log hanya berisi ID lisensi ber-hash, jenis tugas, jumlah token, dan status.
- Tersedia ekspor cadangan (file, dengan opsi kata sandi) dan tombol Hapus semua data.
- Halaman Kebijakan Privasi dalam bahasa Indonesia sederhana, dari dalam aplikasi.

**Kepatuhan:** data keuangan pribadi termasuk data pribadi yang diatur UU Pelindungan Data Pribadi (UU 27/2022). Karena aplikasi memproses data tersebut di perangkat dan mengirim ringkasan ke penyedia AI, kebijakan privasi, dasar pemrosesan, dan kebijakan retensi data penyedia API perlu ditinjau konsultan hukum sebelum rilis. Dokumen ini bukan nasihat hukum.

## Arsitektur teknis

Stack yang disarankan untuk Claude Code: Vite, React, dan TypeScript sebagai PWA dengan service worker; Dexie untuk IndexedDB; Tailwind untuk token desain; proxy berupa fungsi serverless (Cloudflare Workers atau Vercel) dengan penyimpanan KV untuk lisensi dan kuota; SDK Anthropic hanya di sisi proxy. Stack boleh diganti selama aturan di bawah tetap.

&#91;embedded content: arsitektur teknis · HP, proxy, Anthropic API, Lynk.id\]

Proxy memeriksa lisensi dan kuota, membatasi laju, lalu meneruskan permintaan ke model yang sesuai tugasnya. HP tidak pernah memegang kunci API.

**Aturan implementasi:**

- Endpoint proxy: `POST /v1/extract`, `/v1/summary`, dan `/v1/suggest` memakai Haiku 5.5; `POST /v1/chat` memakai Sonnet 5.5 dengan streaming. Tidak ada endpoint yang menerima nama model dari klien.
- Lisensi: satu kode per invoice, terikat ke satu perangkat lewat kunci yang dibuat di perangkat; server hanya menyimpan hash kode dan hash kunci. Detail alur ada di bagian Lisensi dan penyimpanan data pengguna.
- Kuota dan laju dihitung per lisensi di proxy, bukan di klien. Kuota habis hanya memblokir fitur AI.
- Respons Sonnet dikirim streaming ke layar; permintaan gagal ditampilkan sebagai pesan jujur dengan opsi coba lagi.
- Teks dari pengguna, dari Lynk.id, atau dari jawaban model diperlakukan sebagai data, tidak pernah sebagai instruksi sistem.

## Lisensi dan penyimpanan data pengguna

Server hanya menyimpan lisensi dan penghitung kuota. Data keuangan tidak pernah dikirim untuk disimpan: tempatnya di perangkat pengguna, dengan cadangan opsional ke Drive mereka sendiri. Satu invoice menghasilkan satu kode lisensi yang hanya bisa aktif di satu perangkat.

**Yang ada dan tidak ada di server**

- Ada: hash kode lisensi, status (aktif atau dicabut), hash kunci publik perangkat, tanggal aktivasi, jumlah reset, penghitung kuota Haiku dan Sonnet.
- Tidak ada: pinjaman, pembayaran, perasaan, isi chat, nama, nomor telepon, NIK, dan riwayat apa pun. Isi permintaan AI hanya lewat proxy menuju Anthropic dan tidak dicatat.

**Penyimpanan data pengguna**

- Utama: IndexedDB di perangkat.
- Cadangan opsional 1: ekspor file terenkripsi dengan kata sandi yang dipegang pengguna.
- Cadangan opsional 2: folder aplikasi tersembunyi di Google Drive pengguna (appDataFolder), diunggah langsung dari aplikasi ke Drive atas izin pengguna dan dienkripsi di perangkat lebih dulu, sehingga backend dan Google tidak bisa membaca isinya. Perlu dicek persyaratan verifikasi aplikasi Google untuk cakupan izin ini.
- Karena server tidak punya datanya, kata sandi cadangan yang hilang berarti cadangan tidak bisa dipulihkan. Aplikasi harus menyampaikan ini dengan jelas saat cadangan pertama dibuat.

**Alur aktivasi**

1. Pembeli membayar di Lynk.id dan menerima satu kode unik per invoice (acak, panjang, ditampilkan dalam kelompok agar mudah disalin).
2. Saat aplikasi pertama dibuka, perangkat membuat pasangan kunci (WebCrypto) dan menyimpan kunci privat yang tidak bisa diekspor di IndexedDB.
3. Pengguna memasukkan kode. Aplikasi mengirim kode, kunci publik, dan tanda tangan tantangan dari server ke endpoint aktivasi.
4. Server memeriksa hash kode belum pernah diaktifkan, mengikat kunci publik ke kode itu, lalu mengembalikan token berumur pendek.
5. Setiap permintaan AI membawa token dan tanda tangan permintaan dengan kunci perangkat. Proxy menolak jika kode itu terikat ke kunci lain.
6. Token diperbarui otomatis saat online. Selama token masih berlaku, fitur lokal tetap jalan tanpa internet. Masa berlaku token adalah usulan yang diputuskan saat implementasi.

**Pembatasan satu IP: tidak disarankan sebagai kunci keras**

IP HP berganti saat pengguna pindah dari Wi-Fi ke data seluler, dan operator seluler membagi satu IP ke banyak pelanggan. Kunci keras ke satu IP akan mengunci pembeli yang sah dan membanjiri lu dengan keluhan. Saran: ikat ke perangkat lewat kunci, dan pakai IP hanya sebagai sinyal anomali. Jika satu kode muncul dari banyak jaringan yang sangat berbeda dalam waktu singkat, kuota dibekukan sementara dan pengguna diminta konfirmasi ulang. IP disimpan hanya dalam bentuk hash kasar dan singkat, untuk meminimalkan data pribadi.

**Batas jujur anti-pembajakan**

| Ancaman | Pertahanan | Risiko yang tersisa |
| --- | --- | --- |
| File aplikasi disalin ke orang lain | Fitur AI hanya jalan lewat proxy dengan kode dan kunci perangkat. Salinan tanpa kode tidak bisa memakai AI | Fitur lokal (catat utang, kalender, rencana) tetap jalan di salinan, karena kode di sisi klien tidak bisa disembunyikan sepenuhnya |
| Kode dibagikan ke orang lain | Satu kode hanya diikat ke satu kunci perangkat, aktivasi kedua ditolak | Pembeli sah yang ganti HP butuh jalur reset |
| Pembatasan di klien dibobol | Lisensi juga diperiksa server pada setiap panggilan AI | Tidak bisa dicegah penuh untuk fitur yang jalan offline |
| Pengguna menghapus data browser | Kunci hilang, aktivasi ulang lewat reset | Peringatan dan ajakan membuat cadangan sebelum itu terjadi |

Untuk produk Rp50.000, tujuan yang realistis adalah mempersulit berbagi kode secara biasa dan melindungi biaya terbesar (AI di server), bukan menghentikan pembajak yang sangat berniat. Opsi tambahan setelah MVP: menyajikan bundel inti aplikasi dari server hanya kepada perangkat yang sudah teraktivasi.

**Reset dan ganti perangkat (usulan)**

- Pindah ke HP baru: pulihkan dari cadangan terenkripsi, lalu minta reset ikatan memakai nomor invoice. Server melepas ikatan lama dan aktivasi dilakukan ulang di perangkat baru.
- Batas reset: satu kali mandiri, berikutnya lewat bukti invoice. Jumlah reset tercatat di server.
- Refund: kode dicabut dan ikatan dihapus.

**Pembuatan kode di Lynk.id:** ada dua jalan yang perlu dicek di akun penjual, karena belum diverifikasi. Pertama, kode dibuat lebih dulu dalam jumlah banyak dan dimasukkan ke pengiriman produk digital Lynk.id. Kedua, webhook pembayaran membuat kode otomatis jika fiturnya tersedia. Jalan pertama paling sederhana untuk MVP.

## Model bisnis dan biaya

Harga Rp50.000 dibayar sekali, sedangkan biaya AI terus berjalan. Karena itu setiap lisensi punya batas kuota AI total, bukan pemakaian tak terbatas, dan satu pengguna aktif tidak boleh memakan lebih dari porsi tetap dari harga jual.

**Rumus biaya per lisensi:**

```latex
\text{Biaya} = \sum_{m \in \{\text{Haiku},\ \text{Sonnet}\}} \left( T_{\text{masuk},m} \cdot P_{\text{masuk},m} + T_{\text{keluar},m} \cdot P_{\text{keluar},m} \right)
```

T adalah jumlah token dan P adalah harga per token dari halaman harga resmi Anthropic. Isi P dari halaman tersebut saat implementasi; dokumen ini sengaja tidak mengutip angka dari ingatan.

**Usulan awal, dihitung ulang setelah mengukur token nyata di beta:**

| Parameter | Usulan | Alasan |
| --- | --- | --- |
| Batas biaya AI per lisensi | Tidak lebih dari 30% harga jual (Rp15.000) | Menyisakan ruang untuk potongan Lynk.id dan biaya server |
| Kuota Sonnet (diskusi) | Paket pesan total per lisensi, ditampilkan sebagai sisa pesan | Sonnet adalah biaya terbesar per pesan |
| Kuota Haiku (saran harian, ringkasan, isian) | Satu saran per hari, ringkasan dan isian dibatasi per hari | Murah, tetapi tetap dibatasi supaya tidak bisa disalahgunakan |
| Setelah kuota habis | Fitur non-AI tetap jalan; tawarkan isi ulang kuota | Pengguna tidak kehilangan data atau fungsi inti |
| Modal awal | Saldo kredit API 999 dolar | Dipakai untuk fase beta dan peluncuran awal, pantau harian |

**Yang harus diukur di beta:** rata-rata token masuk dan keluar per pesan Sonnet, per saran harian, dan per isian Haiku; jumlah pesan per pengguna per minggu; persentase pengguna yang menghabiskan kuota. Dari data itu kuota awal ditetapkan, bukan ditebak.

**Distribusi:** produk digital di Lynk.id berisi tautan aplikasi dan satu kode lisensi unik per pembeli. Potongan Lynk.id dan dukungan pengiriman kode otomatis perlu dicek di akun penjual sebelum menentukan alur aktivasi.

## Desain dan design system

Gayanya bersih dan tenang: latar putih, kartu biru sangat muda bersudut bulat, menu bawah berbentuk pil putih, dan palet biru. Acuan lengkapnya ada di [kanvas desain](https://claude.ai/artifact/MuSGqKQFe2CCbr6udb4Xxx); nilai di tabel ini yang menjadi sumber untuk kode.

| Token | Mode terang | Mode gelap |
| --- | --- | --- |
| Latar halaman | #FFFFFF | Gradasi #0F1C2B ke #0A1420 |
| Kartu | #F4F8FB, garis #E1EBF2 | #172636, garis #243649 |
| Teks utama | #14202E | #F1F5F9 |
| Teks pendukung | #5C6B7A | #9FB2C3 |
| Tombol utama | #3368A0, teks putih | #66A3BF, teks #0F2233 |
| Aksen (bubble chat, tanggal terpilih) | #66A3BF, teks #0F2233 | #66A3BF, teks #0F2233 |
| Teks biru, bar progres | #3368A0 | #8FC4DE (teks), #66A3BF (bar) |
| Menu bawah | Pil #FFFFFF, tab aktif #DCEAF3 dengan teks #3368A0, tombol + #3368A0 | Pil #172636, tab aktif #66A3BF, tombol + #F1F5F9 |
| Terdaftar OJK | #2F7D6E | #7FD1BC |
| Belum terdaftar, perhatian | #B0510B | #F0B27A |
| Warna pinjaman A sampai E | #3368A0, #66A3BF, #1F4470, #9CC9D9, #7FB8B0 | #4A86C5, #8FC4DE, #2F5F96, #B9DCEA, #6FBFB2 |

**Tipografi:** SF Pro di perangkat Apple (tumpukan font sistem), Inter di perangkat lain. Judul layar 18px tebal sedang di tengah, judul seksi 16px tebal, isi 15 sampai 16px, keterangan 12 sampai 13px. Google Sans tidak tersedia di Google Fonts, jadi tidak dipakai kecuali ada lisensi sendiri.

**Ukuran dan jarak:** bingkai acuan 390 x 920. Padding halaman 20px, jarak antar blok 16px, sudut kartu 24px, kotak kecil 20px, tombol dan pil bulat penuh, avatar 44px, tinggi baris daftar minimal 64px, semua target sentuh minimal 44px. Konten berhenti di atas menu bawah dengan jarak aman.

**Aturan tampilan:**

- Satu judul per layar, maksimal 3 sampai 4 blok, daftar berupa satu kartu berbaris dengan garis pemisah.
- Status legal selalu berupa teks ('Terdaftar OJK', 'Belum terdaftar OJK'), tidak mengandalkan warna saja.
- Teks di atas warna aksen #66A3BF selalu gelap (kontras putih di atasnya hanya sekitar 2,8 banding 1).
- Dark mode default mengikuti pengaturan perangkat, bisa diubah manual di Pengaturan.
- Ilustrasi vektor datar (danau malam di Teman Tenang, tanaman di keadaan kalender kosong), warna dari palet, tanpa gradasi.
- Mode hemat: mematikan efek visual berat dan animasi untuk HP Android kelas bawah.

## Metrik sukses dan validasi

Validasi dimulai dengan 10 sampai 20 orang yang benar-benar punya masalah ini, direkrut dari grup korban pinjol di Facebook dan Telegram, sebelum membangun fitur tambahan. Angka di bawah adalah target awal untuk beta dan dikoreksi setelah data nyata terkumpul.

| Yang diukur | Target beta | Cara mengukur |
| --- | --- | --- |
| Waktu sampai pengguna punya daftar utang lengkap | Di bawah 10 menit | Pengamatan langsung dan wawancara singkat |
| Pengguna yang mencatat minimal satu pinjaman di hari pertama | 70% atau lebih | Penghitung lokal yang dikirim dengan persetujuan pengguna |
| Pengguna yang kembali membuka aplikasi di hari ke-7 | Dicatat sebagai garis dasar | Penghitung lokal dengan persetujuan |
| Pengguna yang merasa Teman Tenang membantu dan tidak menghakimi | Mayoritas menjawab ya | Survei dua pertanyaan di dalam aplikasi |
| Jawaban AI yang melanggar aturan Safety | Nol | Uji 30 percakapan sebelum rilis, tinjauan manual sampel beta |
| Jalur krisis tampil pada semua kasus pemicu | 100% | Uji otomatis dan manual |
| Biaya AI nyata per lisensi | Di bawah batas 30% harga jual | Penghitung token di proxy |

Pertanyaan wawancara beta yang paling penting: apa yang dilakukan pengguna sebelum memakai aplikasi ini, bagian mana yang membuat bingung, dan apakah Rp50.000 terasa wajar.

## Rencana eksekusi di Claude Code

Kerjakan berurutan, satu fase per sesi, dan jangan lanjut sebelum kriteria selesai terpenuhi. Simpan dokumen ini sebagai `PRD.md` di repo, dan minta Claude Code membaca bagian Safety dan Desain sebelum menyentuh kode AI atau UI.

1. **Fase 0, fondasi.** Proyek PWA dengan Vite, React, dan TypeScript; token warna terang dan gelap dari bagian Desain; komponen dasar (Kartu, Baris daftar, Segmen, Menu pil, Avatar, Teks status, Grafik setengah lingkaran). *Selesai jika:* halaman contoh menampilkan semua komponen di mode terang dan gelap.
2. **Fase 1, lapisan data dan logika.** Skema IndexedDB (Pinjaman, Pembayaran, Pengaturan, Perasaan, Saran, Catatan memori); fungsi persentase lunas, urutan prioritas, pembentukan jadwal jatuh tempo dari aturan pengulangan, format rupiah. *Selesai jika:* tes unit untuk semua fungsi hitung lulus, termasuk kasus denda yang bertambah.
3. **Fase 2, layar inti tanpa AI.** Beranda (tanpa saran), Utang, Kalender, Rencana bayar, Tambah Data (form tambah pinjaman dan catat pembayaran), onboarding dengan lisensi sementara. *Selesai jika:* pengguna bisa memasukkan lima pinjaman dan melihat grafik, kalender, persentase, dan rencana yang konsisten.
4. **Fase 3, proxy dan lisensi.** Fungsi serverless dengan endpoint ekstraksi dan ringkasan (Haiku), saran harian (Haiku), dan chat (Sonnet, streaming); aktivasi kode lisensi, ikatan satu perangkat bertanda tangan, kuota, pembatas laju; penyaring PII; log tanpa isi. *Selesai jika:* tes integrasi membuktikan kuota habis memblokir AI saja, dan tidak ada isi percakapan di log.
5. **Fase 4, integrasi AI.** Teman Tenang dengan streaming, saran harian satu kali per hari, isian dari kalimat bebas dengan konfirmasi, ringkasan percakapan sebagai memori, jalur krisis dan layar bantuan. *Selesai jika:* uji 30 percakapan lulus dan jalur krisis muncul pada semua kasus pemicu.
6. **Fase 5, poles dan rilis.** Mode offline PWA, mode hemat, pengingat jatuh tempo, ekspor dan hapus data, halaman Kebijakan Privasi, aksesibilitas (kontras, label, target sentuh), alur pengiriman kode dari Lynk.id. *Selesai jika:* semua kriteria aksesibilitas lulus dan tinjauan hukum atas privasi selesai.
7. **Fase 6, beta.** 10 sampai 20 pengguna, pengukuran token nyata, koreksi kuota dan harga. *Selesai jika:* target metrik beta tercapai atau ada keputusan tertulis untuk mengubahnya.

**Aturan kerja untuk Claude Code:** tulis tes sebelum atau bersama kode untuk Fase 1 dan 3; jangan menaruh kunci API di klien; jangan menambah model selain dua yang ditetapkan; setiap perubahan teks AI yang menyentuh bagian Safety harus lolos uji percakapan yang sama.

## Risiko dan pertanyaan terbuka

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Biaya AI melebihi harga sekali bayar | Rugi per pengguna aktif | Kuota total per lisensi, penghitung token di proxy, isi ulang kuota |
| AI memberi jawaban yang terdengar seperti keputusan atau klaim hukum | Merugikan pengguna dan produk | Aturan Safety, uji 30 percakapan, kartu Hak lu selalu berupa ajakan cek ke OJK |
| Pengguna dalam krisis tidak mendapat bantuan tepat | Paling serius | Jalur krisis di klien dan di prompt, layar bantuan offline, nomor diverifikasi |
| Kebocoran data utang | Kepercayaan dan hukum | Local-first, penyaring PII, tanpa log isi, tinjauan hukum atas privasi |
| Efek visual berat di HP Android kelas bawah | Aplikasi lambat | Mode hemat, uji di perangkat murah |
| Kode lisensi dibagikan | Biaya AI bocor | Ikatan satu perangkat bertanda tangan, kuota per lisensi, AI hanya lewat proxy |

**Perlu diputuskan oleh lu:**

- [ ] Besar kuota awal Sonnet dan Haiku per lisensi, dan harga isi ulang (setelah data token beta).
- [ ] Apakah saran harian cukup dibuat Haiku 5.5, atau sebagian kartu kategori Rencana dibuat Sonnet. Usulan dokumen ini: Haiku, dengan diskusi lanjutan di Sonnet.
- [ ] Nama dan parameter yang tepat untuk effort medium pada Sonnet 5.5 (cek dokumentasi API).
- [ ] Nomor dan layanan bantuan krisis yang akan ditampilkan, harus diverifikasi sebelum rilis.
- [ ] Nama produk final (sementara 'Lunas').
- [ ] Alur aktivasi lisensi dari Lynk.id: manual per pembeli atau otomatis, dan besar potongannya.
- [ ] Tinjauan hukum atas kebijakan privasi dan kebijakan retensi data penyedia API.
- [ ] Apakah aplikasi juga perlu bahasa daerah atau cukup Bahasa Indonesia santai.
