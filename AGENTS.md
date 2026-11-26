# AGENTS.md — PANDUAN EKSEKUSI AI AGENT (`opencode`)
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-AGT-001 |
| Versi | 1.2 — Aktif (Stok Agregat per Judul + ERD + Penyesuaian MVP) |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Target Pembaca | AI Agent (`opencode`), Developer, Pemilik Proyek |
| Bahasa Dokumen | Bahasa Indonesia |

> **Aturan Interpretasi:** Dokumen ini adalah **pintu masuk utama** bagi AI Agent (`opencode`) sebelum menganalisis, merancang, atau menulis kode di dalam repositori proyek web **Akira Books**. AI Agent wajib membaca dokumen terkait di folder `plans/` sebelum menjalankan tugas apa pun.

---

## 1. Peta Dokumentasi Proyek (`plans/`)

| File Dokumen | Kode | Peran & Hirarki Acuan |
|---|---|---|
| `plans/01-requirements.md` | AKB-REQ-LL-001 | **Acuan Utama Fitur & Kebutuhan Sistem** (`FR-xxx`, `NFR-xxx`, `AC-xxx`, matriks peran, UI/UX, batasan MVP) |
| `plans/02-business-rules.md` | AKB-BRL-LL-001 | **Acuan Utama Aturan Bisnis & Logika Transaksi** (`BR-xxx`, *state machine*, invarian stok/uang, konsistensi teknis, daftar keputusan)[cite: 4] |
| `plans/03-project-rules.md` | AKB-PRJ-001 | **Aturan Kerja AI Agent & Standar Pengembangan** (`PR-xxx`, stack teknologi, Docker, Prisma, pengujian, aturan Git & Checkpoint)[cite: 4] |
| `plans/04-implementation-plns.md` | AKB-IMP-001 | **Peta Jalan Implementasi Bertahap** (Tahap 1 s.d. Tahap 14, *deliverable*, dan *gate* kelulusan)[cite: 4] |
| `plans/05-database-erd.md` | AKB-ERD-001 | **Rancangan Awal Struktur Database (ERD)** (Acuan relasi tabel sebelum penyusunan `prisma/schema.prisma`) |
| `plans/00-dokumen_kebutuhan_sistem.md` | AKB-HIST-000 | **Draf Awal / Historis** *(Bukan acuan utama jika bertentangan dengan dokumen `01`–`05`)*[cite: 4] |

> **Larangan Penamaan File:** Dilarang mengubah nama file `plans/04-implementation-plns.md` tanpa izin eksplisit pemilik proyek[cite: 4].

---

## 2. Protokol Wajib Sebelum Coding (`PR-START`)

Setiap memulai sesi atau mengerjakan tahap/fitur baru, AI Agent **WAJIB** menjalankan urutan berikut[cite: 4]:
1. **Baca Dokumen Acuan:** Baca `AGENTS.md` dan dokumen `plans/01` s.d. `05` yang relevan dengan tugas[cite: 4].
2. **Periksa Lingkungan & Kode:** Periksa struktur folder proyek, konfigurasi Docker, skema Prisma, serta dokumentasi Next.js lokal di `node_modules/next/dist/docs/` sesuai versi terpasang[cite: 4].
3. **Pisahkan Fakta vs Rekomendasi:** Rangkum pemahaman kebutuhan dan pisahkan dengan tegas antara **Keputusan Bisnis Final** vs **Rekomendasi Teknis**[cite: 4].
4. **Deteksi Konflik / Ambiguitas:** Jika ditemukan aturan yang bertentangan atau belum diputuskan (lihat Register Keputusan di `02-business-rules.md`), **hentikan bagian terdampak dan minta keputusan pemilik proyek**[cite: 4].
5. **Tunggu Persetujuan:** Dilarang menulis kode implementasi besar, mengubah skema database, atau menambah dependensi sebelum rancangan disetujui pengguna[cite: 4].

---

## 3. Guardrails Kritis (Invarian Sistem)

| ID | Batasan Kritis | Penegakan |
|---|---|---|
| GR-01 | **Stack Terkunci** | Docker, Next.js, TypeScript, Prisma, PostgreSQL[cite: 4]. Dilarang menambah layanan eksternal atau **Mailpit** tanpa persetujuan terpisah[cite: 4]. |
| GR-02 | **Otorisasi Server-Side** | Semua hak akses (`Pengunjung`, `Customer`, `Admin Biasa`, `Admin Utama`) wajib divalidasi di server, bukan hanya menyembunyikan tombol UI[cite: 4]. |
| GR-03 | **Isolasi Modal & Laba** | Data **modal & keuntungan** dilarang keras muncul di UI, respons API, DTO, atau payload browser untuk **Admin Biasa**[cite: 4]. |
| GR-04 | **Admin Utama Tunggal** | Sistem hanya memiliki **1 Admin Utama**[cite: 4]. Tidak ada eskalasi ke Admin Utama kedua dan tidak ada persetujuan pembayaran otomatis[cite: 4]. |
| GR-05 | **Pemisahan Domain Status** | Status Pesanan, Bukti Pembayaran, Jadwal, Refund, dan status pendukung lainnya wajib disimpan secara terpisah[cite: 4]. |
| GR-06 | **Audit Immutable** | Audit administratif bersifat *append-only* (tidak dapat diubah/dihapus melalui aplikasi oleh siapa pun) dan hanya dibaca Admin Utama[cite: 4]. |
| GR-07 | **Checkpoint GitHub** | Kerjakan satu tahap pada satu waktu, jalankan verifikasi, lalu berhenti untuk ditinjau pengguna sebelum `git commit` / `git push`[cite: 4]. |
| GR-08 | **Model Stok Per Judul** | Setiap judul buku memiliki sekumpulan stok total numerik (`integer >= 0`) dan modal per unit tanpa pemisahan data fisik/kondisi per eksemplar[cite: 4]. |
| GR-09 | **Prioritas Fitur Inti MVP** | Fitur **Banner Promosi** (`FR-BNR` / Tahap 6) **ditunda dari MVP awal** atas keputusan pemilik proyek. Fokus pengerjaan hanya pada fitur inti operasional toko (katalog, stok, pemesanan, pembayaran QRIS/CFD, jadwal Minggu, penjualan offline, laporan, dan Toko Libur). |
| GR-10 | **Unit Testing & Kualitas Kode** | Setiap implementasi tahap baru wajib disertai file unit test (*.test.ts) untuk logika bisnis, RBAC, dan guardrails terkait (GR-03, GR-06). Sebelum dianggap selesai, kode wajib lulus `docker compose exec app npx tsc --noEmit` (0 error) dan `docker compose exec app npm test` (semua test PASS) |

---

## 4. Daftar Keputusan Bisnis (OD-xx)

| ID | Keputusan |
|---|---|
| OD-01 | Status utama pesanan Menunggu Pembayaran hingga pembayaran final Admin Utama; jika jadwal disetujui → Menunggu Diambil; jika belum → Sudah Dibayar dulu |
| OD-02 | Kolom mergedIntoBookId di Book untuk merge duplikat; stockTotal dipindahkan ke buku utama |
| OD-03 | Tabel OrderPaymentAllocation (many-to-many Order ↔ PaymentEvidence) dengan allocatedAmount |
| OD-04 | Banner Promosi ditunda dari MVP (GR-09); format upload JPG/PNG/WebP max 5MB; email abstraksi log-terminal |

---

## 4. Protokol Work State

### Completed
- Tahap 1: Semua keputusan OD-01 s.d. OD-04 diterima dan dicatat di prisma/schema.prisma (dinaikkan melalui migrasi)
- Tahap 2: `docker compose up -d --build` berhasil; `prisma migrate dev --name init-tahap-1` sukses, 24 tabel dibuat di PostgreSQL
- Tahap 3: Semua file kode untuk fondasi aplikasi telah dibuat dan diverifikasi `tsc --noEmit` 0 error di dalam container Docker
- Tahap 4: Autentikasi & Hak Akses lengkap implementasi
  - Login/register/lupa-password halaman UI dengan 100% Bahasa Indonesia
  - API Routes auth, admin management terhubung ke PostgreSQL via Prisma Client
  - Middleware otorisasi server-side di src/middleware.ts
  - Password hashing dengan crypto.scryptSync ( lebih aman daripada SHA-256 polos)
  - Script seed prisma/seed.ts untuk membuat akun Admin Utama awal beserta recovery code-nya
  - Admin account management endpoint: nonaktifkan/aktifkan Customer, buat/cabut Admin Biasa oleh Admin Utama dengan verifikasi OTP
  - Semua file kode tahap 4 diverifikasi `tsc --noEmit` 0 error
- Tahap 5: Katalog, Pengelolaan Buku, Toko Libur, dan Banner Promosi selesai, teruji E2E, dan di-push
- Tahap 6: Unit Testing & Quality Assurance selesai (13 file test, 121 test PASS) dan di-push
- Tahap 7: Keranjang Belanja & Pemesanan selesai
  - Migrasi `tahap_7_keranjang_pesanan` tersinkron (drift diselesaikan dengan `migrate resolve`, data tidak dihapus)
  - Sinkronisasi stok otomatis + notifikasi + kewajiban tinjau ulang sebelum checkout
  - Checkout atomik dengan `SELECT ... FOR UPDATE`, idempotensi, snapshot, tenggat 24 jam WIB, dan status awal yang benar
  - Halaman `/keranjang`, `/checkout`, `/pesanan`, `/pesanan/[id]` memakai `@/components/ui` dan 100% Bahasa Indonesia
  - Unit test Tahap 7 ditambahkan; `tsc --noEmit` 0 error dan `npm test` 121/121 PASS
  - E2E nyata: blokir toko libur, penyesuaian stok, konfirmasi ulang, idempotensi, dan snapshot terverifikasi
- Tahap 8: Pembayaran QRIS/CFD, Bukti Pembayaran, dan Alokasi Pembayaran selesai
  - Migrasi `tahap_8_pembayaran_qris` dan `tahap_8_paused_at` tersinkron; `prisma migrate status` up to date
  - QRIS toko aktif tunggal dengan riwayat, OTP tindakan sensitif, dan penyimpanan berkas privat
  - Unggah bukti multi-order, jeda timer ubah metode, pengingat, auto-cancel atomik, dan pelepasan stok sekali
  - Verifikasi 2 tahap (Admin Biasa → Admin Utama), tolak 2x → ambil alih, CFD/koreksi, dan OD-01
  - Halaman `/admin/qris`, `/admin/pembayaran`, dan `/pesanan/[id]` memakai `@/components/ui` dan 100% Bahasa Indonesia
  - Unit test Tahap 8 ditambahkan; `tsc --noEmit` 0 error dan `npm test` 16 file / 165 test PASS
  - E2E nyata: QRIS + OTP, multi-order, verifikasi & tolak 2x, jeda timer, auto-cancel/cron, CFD, koreksi, isolasi bukti, dan audit append-only terverifikasi
  - Telah ditinjau dan di-push (commit `0e20547`)
- Tahap 9: Jadwal dan Pengambilan (implementasi selesai, belum di-commit/di-push)
  - Migrasi `tahap_9_jadwal_pengambilan` dan `tahap_9_status_sebelumnya` tersinkron; enum `TIDAK_HADIR` dan model `JadwalPerubahan` aktif
  - Customer memilih/ubah Minggu masa depan (tutup 09.00 WIB, tanpa pilihan jam), menyetujui/menolak usulan admin, dan menggabungkan jadwal aktif
  - Admin menyetuju/menolak jadwal (alasan wajib saat tolak), mengusulkan tanggal pengganti tanpa mengubah tanggal aktif sebelum disetujui Customer, menandai no-show, memperpanjang penahanan, dan menekan Selesai
  - No-show setelah 09.00 WIB menahan buku 24 jam + alasan, tanpa auto-cancel; jadwal ulang/batal tetap manual
  - Tombol Selesai menurunkan `stockTotal` dan `stockReserved` atomik (`SELECT ... FOR UPDATE`, validasi all-or-nothing) lalu mengunci `SELESAI` dan mencatat waktu serah terima
  - OD-01 dipertahankan: pembayaran final lebih dulu → `SUDAH_DIBAYAR`, lalu jadwal disetujui → `MENUNGGU_DIAMBIL`
  - Halaman `/admin/jadwal`, kontrol jadwal di `/pesanan/[id]`, dan tautan Header memakai `@/components/ui` serta 100% Bahasa Indonesia
  - Unit test baru `jadwal-pengambilan.test.ts` (25 test); `tsc --noEmit` 0 error dan `npm test` 17 file / 190 test PASS
  - Telah ditinjau dan di-push (commit `0002298`)
- Tahap 10: Pembatalan dan Pengembalian Dana/Refund (implementasi selesai, belum di-commit/di-push)
  - Migrasi `tahap_10_pembatalan_refund` tersinkron; `prisma migrate status` up to date (10 migrasi)
  - Customer membatalkan sebelum pembayaran final; Admin Biasa membatalkan sebelum persetujuan final dengan alasan wajib, audit, dan notifikasi
  - Admin Utama dapat membatalkan pesanan lunas; Admin Utama tunggal wajib alasan tambahan dan dicatat di `AdminAuditLog` append-only (GR-06)
  - `stockReserved` dilepaskan atomik & idempoten tepat 1x (`FOR UPDATE` + flag `stockReleased`), hanya untuk buku aktif; sinkron dengan auto-cancel
  - Refund terpisah dari pembatalan: pengajuan → persetujuan Admin Utama → selesai, dengan nominal, waktu proses, metode/bukti, admin pemroses, dan dukungan refund sebagian/bertahap tanpa melebihi nominal dibayar
  - Koreksi `SELESAI` hanya oleh Admin Utama ke status yang benar-benar tercatat di riwayat, dengan alasan wajib, audit, dan pemulihan `stockTotal`/`stockReserved` atomik
  - Halaman `/admin/pembatalan`, `/admin/refund`, kontrol pembatalan di `/pesanan/[id]`, dan tautan Header memakai `@/components/ui` serta 100% Bahasa Indonesia
  - Perbaikan `src/app/api/admin/route.ts`: memakai `prisma()` dari `@/lib/prisma`, tanpa `require('@prisma/client')`
  - Unit test baru `pembatalan-refund.test.ts` (18 test); `tsc --noEmit` 0 error dan `npm test` 18 file / 208 test PASS; smoke test database nyata terverifikasi
- Tahap 11: Penjualan Offline dan Laporan Keuangan (implementasi selesai, belum di-commit/di-push)
  - Migrasi `20261127040000_tahap_11_penjualan_offline_laporan` diterapkan; `prisma migrate deploy` sukses (11 migrasi)
  - Model diperluas: `OfflineSale` (status, catatan, `idempotencyKey` unik), `OfflineSaleItem` (snapshot judul/kode, subtotal) dan `OfflinePriceCorrection` (usul → persetujuan Admin Utama)
  - Pencatatan penjualan booth langsung `SELESAI`; `stockTotal` dikurangi atomik memakai `SELECT ... FOR UPDATE` berurutan per `bookId`; idempotensi anti-duplikat klik
  - Keranjang Customer terdampak langsung disesuaikan/dihapus dalam transaksi yang sama, dengan `needsReview`, `reviewReason`, dan notifikasi (BR-012)
  - Koreksi harga offline: Admin Biasa/Utama mengusul wajib alasan, harga lama tetap aktif, hanya Admin Utama yang memutuskan, seluruh keputusan tercatat di `AdminAuditLog` append-only (GR-06)
  - Laba historis memakai snapshot modal; hitung ulang memakai `costPrice` terkini; keduanya ditampilkan terpisah di laporan (BR-021/BR-022)
  - GR-03: `saringPenjualanUntukPeran` menghapus semua field modal/laba untuk Admin Biasa; endpoint `/api/admin/laporan` mengembalikan 403 sebelum query; menu laporan hanya dirender untuk Admin Utama
  - Dashboard `/admin/laporan` (filter harian/bulanan/tahunan WIB) dan `/admin/penjualan-offline` memakai `@/components/ui`, 100% Bahasa Indonesia; tautan Header ditambahkan sesuai peran
  - Unit test baru: `penjualan-offline-laporan.test.ts`, `penjualan-offline-db.test.ts`, `penjualan-offline-isolasi.test.ts`, `penjualan-offline-koreksi-db.test.ts`; `tsc --noEmit` 0 error dan `npm test` 22 file / 225 test PASS
- Tahap 12: Notifikasi dan Pengingat (implementasi selesai, belum di-commit/di-push)
  - Migrasi `20261128040000_tahap_12_notifikasi_pengingat` diterapkan; `prisma migrate status` up to date (12 migrasi)
  - `Notification` diperluas dengan `kategori`, `entitasId`, `metadata`, `readAt`, kunci unik per penerima, dan indeks inbox; `ScheduledReminder` memperoleh `jobKey`, `intervalMenit`, `zonaWaktu`, dan `terakhirDijalankan`
  - Model baru `NotificationOutbox` dengan `deliveryKey` unik, `attempts`, `maxAttempts`, `nextAttemptAt`, dan `escalationNotified` untuk retry bertahap anti-duplikasi
  - Inbox `/notifikasi` + API `/api/notifikasi` (baca, tandai satuan, tandai semua) dengan isolasi per akun; badge belum dibaca di Header; pengelompokan notifikasi sejenis tanpa menghapus detail individual
  - Outbox eksternal hanya abstraksi log-terminal bila `AKIRA_NOTIF_EKSTERNAL=terminal`; tanpa layanan/Mailpit baru (GR-01, OD-04)
  - Eskalasi kegagalan retry maksimal muncul di inbox Admin Utama dan panel `/admin/notifikasi` (`/api/admin/notifikasi/outbox`); tindak lanjut tercatat di `AdminAuditLog` append-only (GR-06)
  - Pengingat 2 jam WIB persisten lintas restart Docker/server, berhenti setelah pembayaran diputuskan, jadwal diputuskan, pesanan dibatalkan/Selesai (BR-025); `instrumentation.ts` mengejar tugas yang jatuh tempo saat startup
  - GR-03: `saringNotifikasiUntukPeran` membuang modal/laba secara rekursif untuk Customer/Admin Biasa sebelum payload dikirim
  - Unit test baru: `notifikasi-grouping.test.ts`, `notifikasi-mark-read.test.ts`, `notifikasi-outbox.test.ts`, `notifikasi-pengingat.test.ts`; `tsc --noEmit` 0 error dan `npm test` 26 file / 234 test PASS

### Active
- Tahap 12 menunggu peninjauan pemilik proyek sebelum `git commit` / `git push` (GR-07)

### Blocked
- (none)

## 5. Implementasi Tahap Selanjutnya

- **Tahap 9**: Selesai, ditinjau, dan di-push (commit `0002298`)
- **Tahap 10**: Implementasi selesai dan terverifikasi; menunggu peninjauan pemilik proyek (GR-07)
- **Tahap 11**: Implementasi selesai dan terverifikasi; menunggu peninjauan pemilik proyek (GR-07)
- **Tahap 12**: Implementasi selesai dan terverifikasi; menunggu peninjauan pemilik proyek (GR-07)

Today's date: Mon Nov 23 2026