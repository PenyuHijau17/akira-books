# IMPLEMENTATION PLAN & QUALITY GATES — LOW LEVEL
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-IMP-001 |
| Versi | 1.1 — Peta Jalan Implementasi Bertahap (Stok Agregat per Judul) |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Status | **Siap Dijadikan Panduan Eksekusi Bertahap** |
| Dasar | `01-requirements.md`, `02-business-rules.md`, `03-project-rules.md` |
| Bahasa Produk | Bahasa Indonesia |

> **Aturan Eksekusi:** Dokumen ini membagi pengembangan **Akira Books** ke dalam **14 tahap berurutan**[cite: 2]. Setiap tahap memiliki lingkup kerja, target keluaran (*deliverable*), kriteria kelulusan (*exit gate*), dan diakhiri dengan **Checkpoint GitHub** sebelum melanjutkan ke tahap berikutnya[cite: 2].

---

## Ringkasan Fase & Gerbang Kelulusan (*Exit Gates*)

| Tahap | Nama Tahap | Deliverable Utama | Gate Kelulusan (*Exit Gate*) |
|---|---|---|---|
| **1** | Analisis & Rancangan | Rancangan arsitektur, ERD/skema Prisma (stok per judul), state machine, keputusan `OD-01` s.d. `OD-04` | Pemilik proyek menyetujui rancangan & seluruh keputusan terbuka[cite: 2] |
| **2** | Persiapan Lingkungan | Verifikasi Next.js + TS, Docker Compose, PostgreSQL, Prisma, `.env.example`, Git | Aplikasi & database terhubung dalam Docker tanpa menghapus data[cite: 2] |
| **3** | Fondasi Aplikasi | Layout tema krem-cokelat Bahasa Indonesia, RBAC helper, API contract, audit *append-only*, worker/outbox, WIB | Fondasi teknis teruji & isolasi field sensitif aktif[cite: 2] |
| **4** | Autentikasi & Hak Akses | Login/register, sesi aman, rate limit, 4 peran, OTP admin, recovery code, sanksi/hapus akun | Uji negatif 4 peran, OTP, pencabutan sesi & audit log lulus[cite: 2] |
| **5** | Buku, Katalog & Toko Libur | CRUD master buku & stok total (`>= 0`), modal (Admin Utama), katalog/filter, Toko Libur (polling 5 detik & riwayat) | Tidak ada kebocoran modal; checkout terblokir saat toko tutup[cite: 1, 2] |
| **6** | Banner Promosi | Pengajuan Admin Biasa (maks. 3 pending), kelola Admin Utama (maks. 7 aktif), carousel | Kuota banner, larangan duplikat gambar+URL & carousel lulus UAT[cite: 2] |
| **7** | Keranjang & Pemesanan | Keranjang, sync jual offline, checkout atomik (*row-level lock*), idempotensi, snapshot | Uji *concurrency* stok terakhir & idempotensi request ganda lulus[cite: 2] |
| **8** | Pembayaran & QRIS | Kelola QRIS (+OTP), upload bukti, verifikasi 2 tahap, tenggat 24 jam, bayar langsung CFD | Alur tolak 2x, jeda timer ubah metode & race upload-vs-due lulus[cite: 2] |
| **9** | Jadwal Pengambilan | Pilih Minggu (tutup 09.00), approval/tolak, usul ubah jadwal, *no-show* manual, gabung jadwal | Validasi Minggu, aturan *no-show* tanpa auto-cancel & gabung jadwal lulus[cite: 2] |
| **10** | Pembatalan & Refund | Batal Customer/Admin/System, rilis stok 1x, modul *Refund* terpisah, koreksi *Selesai* | Stok tidak kembali 2x; status batal & status refund terpisah[cite: 2] |
| **11** | Penjualan Offline & Laporan | Catat jual lapak, koreksi harga offline, kalkulasi laba kotor, dashboard laporan Admin Utama | Laba historis vs hitung ulang terpisah; Admin Biasa terblokir total[cite: 2] |
| **12** | Notifikasi & Pengingat | Inbox notifikasi web, pengelompokan, *retry* gagal kirim, pengingat persisten tiap 2 jam | Pengingat tetap aktif pasca-restart Docker & berhenti saat selesai[cite: 2] |
| **13** | Backup, Keamanan & QA Total | Backup harian (retensi 30 hari) + manual terenkripsi `age`, uji restore & regression UAT | Uji restore DB + file media berhasil; seluruh skenario lulus[cite: 2] |
| **14** | Persiapan Penggunaan | Audit akhir dokumen vs kode, panduan pengguna Customer & Admin, checklist Go-Live | Pemilik proyek menyetujui aplikasi siap digunakan nyata[cite: 2] |

---

## Rincian Pekerjaan per Tahap

### Tahap 1 — Analisis dan Rancangan *(Belum Coding)*
- Membaca `AGENTS.md`, `plans/00` s.d. `04`, dan dokumentasi Next.js lokal (`node_modules/next/dist/docs/`)[cite: 2].
- Memeriksa struktur folder, kode awal, dan konfigurasi Docker yang sudah ada[cite: 2].
- Menyelesaikan sisa daftar keputusan terbuka (`OD-01` s.d. `OD-04` pada `02-business-rules.md`) bersama pemilik proyek[cite: 2].
- Menyusun rancangan struktur folder, skema database Prisma (model master buku dengan stok agregat per judul, pemisahan status, snapshot, audit *append-only*, multi-order payment, banner, Toko Libur), state machine final, dan rencana pengujian[cite: 1, 2].

### Tahap 2 — Persiapan Lingkungan
- Memverifikasi proyek Next.js + TypeScript, Docker & Docker Compose, PostgreSQL, dan koneksi Prisma[cite: 2].
- Menyiapkan `.env` (di-ignore Git), `.env.example` tanpa nilai rahasia, serta memeriksa `.gitignore` dan repositori GitHub[cite: 2].
- *(Mailpit tidak ditambahkan; layanan email ditetapkan terpisah sebelum pengujian fitur email)*[cite: 2].

### Tahap 3 — Fondasi Aplikasi
- Layout dasar & navigasi 100% Bahasa Indonesia dengan identitas visual hangat klasik (krem & cokelat, responsif HP/tablet/desktop)[cite: 2].
- Standar validasi input server, format error & kontrak respons API, serta helper transaksi atomik Prisma[cite: 2].
- Middleware/guard otorisasi server-side dan mekanisme pembersihan/isolasi data modal & laba dari respons Admin Biasa[cite: 2].
- Fondasi tabel & layanan audit administratif *append-only*, penyimpanan file media aman, penanganan waktu server (`Asia/Jakarta`), serta fondasi *worker*/penjadwalan persisten dan *outbox* notifikasi[cite: 2].

### Tahap 4 — Autentikasi dan Hak Akses
- Registrasi Customer, login Customer/Admin, cookie sesi aman, logout, serta *rate limiting* & penguncian sementara percobaan login gagal[cite: 2].
- Penegakan 4 peran (`Pengunjung`, `Customer`, `Admin Biasa`, `Admin Utama` tunggal)[cite: 2].
- Kelola profil Customer (email terkunci, WA opsional) & pemulihan password via tautan email[cite: 2].
- Kelola akun Admin Biasa oleh Admin Utama (buat, ubah peran, nonaktif manual, hapus permanen dengan pencabutan sesi langsung & retensi identitas historis di audit)[cite: 2].
- Pemulihan akun Admin Utama (tautan email + kode pemulihan cadangan ter-hash)[cite: 2].
- Sanksi/penonaktifan Customer (alasan wajib, tetap tampil tanpa login, re-aktivasi manual) & pengajuan penghapusan akun (tunda jika ada order/kewajiban aktif, retensi data transaksi)[cite: 2].
- Verifikasi ulang password & OTP tindakan sensitif + tampilan Audit Log khusus Admin Utama[cite: 2].

### Tahap 5 — Katalog, Pengelolaan Buku, dan Toko Libur
- **Buku & Katalog:** CRUD master buku per judul (kode unik, judul, penulis, penerbit, tahun terbit, kategori, foto, deskripsi, harga jual, **kuantitas stok total `integer >= 0`**, status ketersediaan); pengelolaan & koreksi **modal per unit** khusus Admin Utama (wajib alasan & riwayat, isolasi dari Admin Biasa); pencarian & filter katalog; detail buku; hapus permanen (tanpa riwayat) vs nonaktif (berriwayat); *merge* buku duplikat oleh Admin Utama[cite: 1, 2].
- **Toko Libur:** Buka/tutup manual oleh Admin Utama (alasan wajib maks. 200 karakter, ubah alasan via pratinjau & konfirmasi); polling status tiap 5 detik di halaman toko, katalog, dan checkout (jeda saat tab tidak aktif); pemblokiran checkout di server saat tutup/status tak terverifikasi; riwayat pagination 20/halaman & hapus riwayat satuan/massal secara atomik + audit log[cite: 2].

### Tahap 6 — Sistem Banner Promosi
- Pengajuan banner oleh Admin Biasa (wajib gambar; opsional URL, judul, deskripsi; maks. 3 pending per admin; batal mandiri tanpa notifikasi ke Admin Utama)[cite: 2].
- Persetujuan/penolakan Admin Utama (alasan tolak opsional & tersembunyi dari Admin Biasa; identitas pengaju hanya terlihat Admin Utama)[cite: 2].
- Manajemen banner terbit oleh Admin Utama: buat langsung, pisah daftar aktif/nonaktif, urutkan banner aktif, aktifkan/nonaktifkan, hapus permanen tanpa tempat sampah, maks. **7 banner aktif** (blokir jika penuh, tanpa auto-replace), larangan edit banner terbit, larangan duplikat kombinasi gambar + URL pada banner aktif[cite: 2].
- Tampilan responsif berbagai rasio gambar, teks di dalam gambar dengan blur area kiri otomatis, tanpa CTA, dan carousel autoplay (jeda hover/sentuh, statis jika 1, sembunyi jika 0)[cite: 2].

### Tahap 7 — Keranjang dan Pemesanan
- Keranjang multi-buku beserta kuantitas tanpa menahan stok; penyesuaian/penghapusan otomatis item yang terjual offline bila stok habis/kurang beserta notifikasi dan kewajiban tinjau/konfirmasi ulang sisa keranjang[cite: 1, 2].
- Checkout atomik dengan *row-level locking* stok, pencegahan pesanan ganda via **idempotensi**, penyimpanan **snapshot** (identitas buku, kuantitas, harga, tenggat), dan inisialisasi status pesanan `Menunggu Pembayaran` + jadwal `Menunggu Konfirmasi`[cite: 1, 2].

### Tahap 8 — Pembayaran dan QRIS
- Manajemen satu gambar QRIS toko oleh Admin Utama (konfirmasi + autentikasi ulang + OTP, simpan riwayat QRIS lama, notifikasi pesanan aktif)[cite: 2].
- Unggah bukti bayar Customer (validasi file, riwayat bukti lama, dukungan 1 transfer QRIS untuk beberapa pesanan) & permintaan bukti baru dengan alasan dan tenggat baru[cite: 2].
- Verifikasi dua tahap wajib: pemeriksaan awal Admin Biasa ➔ persetujuan/penolakan final Admin Utama (tolak ke-1 kembali ke pemeriksa sama dengan alasan; tolak ke-2 diambil alih Admin Utama)[cite: 2].
- Tenggat default 24 jam, perpanjangan (web/WA), jeda hitung mundur khusus saat pengajuan ubah metode bayar, auto-cancel atomik saat tenggat lewat tanpa bukti, pengingat setiap 2 jam, pencatatan bayar langsung di CFD, serta koreksi pembayaran oleh Admin Utama (tanpa ubah nominal)[cite: 2].

### Tahap 9 — Jadwal dan Pengambilan
- Pemilihan tanggal hari Minggu di masa depan (tutup tetap pukul 09.00, tanpa pilihan jam) dengan validasi UI & server[cite: 2].
- Persetujuan/penolakan jadwal oleh admin (wajib alasan saat tolak), pengajuan ubah jadwal berulang oleh Customer, usulan ubah jadwal oleh admin (butuh persetujuan Customer), dan pengingat tiap 2 jam[cite: 2].
- Penggabungan jadwal beberapa pesanan tanpa menyatukan status pembayaran/riwayat[cite: 2].
- Penanganan *no-show* lewat pukul 09.00 (tahan buku dengan tenggat baru + alasan tanpa auto-cancel, ubah jadwal, atau batal) dan tombol **Selesai** saat buku diserahkan fisik[cite: 2].

### Tahap 10 — Pembatalan dan Pengembalian Dana (`Refund`)
- Pembatalan oleh Customer (sebelum bayar terverifikasi), Admin Biasa (sebelum persetujuan final Admin Utama, wajib alasan + audit + notifikasi), dan Admin Utama (setelah disetujui final; pengecualian 1 Admin Utama mengusulkan sendiri wajib alasan tambahan)[cite: 2].
- Pengembalian kuantitas stok tertahan secara aman (`1x`, hanya jika buku masih aktif)[cite: 1, 2].
- Modul **Refund** terpisah dari pembatalan (status refund, persetujuan Admin Utama, nominal, waktu, admin, dukungan refund sebagian/bertahap) serta koreksi pesanan `Selesai` oleh Admin Utama ke status sebelumnya yang tercatat[cite: 2].

### Tahap 11 — Penjualan Offline dan Laporan Keuangan
- Pencatatan penjualan langsung di booth (*Offline*) oleh admin (judul buku, kuantitas unit, harga aktual boleh beda katalog, langsung `Selesai`, kurangi stok total & sesuaikan/hapus item dari keranjang Customer lain bila stok tidak mencukupi) + alur usul koreksi harga offline (disetujui Admin Utama)[cite: 1, 2].
- Kalkulasi laba kotor (`Kuantitas × (Harga Jual Aktual - Modal per Unit)`) saat `Selesai`, pemisahan laba historis vs hasil hitung ulang modal terbaru, serta dashboard laporan keuangan khusus Admin Utama (harian/bulanan/tahunan, pembayaran terverifikasi vs penjualan selesai, unit terjual, online vs offline, pembatalan & refund)[cite: 1, 2].

### Tahap 12 — Notifikasi dan Pengingat
- Notifikasi dalam website untuk seluruh peristiwa bisnis, penanda baca, pengelompokan notifikasi sejenis, *retry* bertahap jika gagal kirim tanpa duplikasi, dan peringatan admin jika gagal berulang[cite: 2].
- Penjadwalan persisten pengingat setiap **2 jam** (bukti bayar pending & jadwal pending) yang tahan *server restart* dan berhenti otomatis setelah keputusan dibuat[cite: 2].

### Tahap 13 — Backup, Keamanan, dan Pengujian Menyeluruh
- Konfigurasi backup otomatis harian (retensi 30 hari) + backup manual mencakup database & seluruh file media, dienkripsi **`age`** dengan kunci disimpan terpisah oleh pemilik toko, serta uji coba pemulihan (*restore drill*)[cite: 2].
- Pengujian keamanan RBAC, isolasi modal/laba, audit *immutable*, *concurrency* stok & idempotensi, seluruh skenario Toko Libur, seluruh skenario Banner, responsivitas HP/tablet/desktop, konsistensi Bahasa Indonesia, dan build produksi[cite: 2].

### Tahap 14 — Persiapan Penggunaan (`Go-Live Readiness`)
- Audit kesesuaian akhir kode terhadap dokumen `01`–`04`, verifikasi keamanan kredensial & penyimpanan file, penyusunan panduan singkat penggunaan Customer & Admin, dan penandatanganan kesiapan operasional bersama pemilik proyek[cite: 2].