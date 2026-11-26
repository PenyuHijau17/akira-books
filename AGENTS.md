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

### Active
- Tahap 8 menunggu peninjauan pemilik proyek sebelum `git commit` / `git push` (GR-07)

### Blocked
- (none)

## 5. Implementasi Tahap Selanjutnya

- **Tahap 9**: Menunggu peninjauan Tahap 8 oleh pemilik proyek (GR-07)

Today's date: Mon Nov 23 2026