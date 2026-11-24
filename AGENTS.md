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

### Active
- (none)

### Blocked
- (none)

## 5. Implementasi Tahap Selanjutnya

- **Tahap 5**: Katalog, Pengelolaan Buku, & Toko Libur - Selesai dan diverifikasi
- **Tahap 6**: Unit Testing dan Quality Assurance - Selanjutnya

Today's date: Mon Nov 23 2026