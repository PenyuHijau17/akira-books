# AGENTS.md — PANDUAN EKSEKUSI AI AGENT (`opencode`)
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-AGT-001 |
| Versi | 1.1 — Aktif (Stok Agregat per Judul) |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Target Pembaca | AI Agent (`opencode`), Developer, Pemilik Proyek |
| Bahasa Dokumen | Bahasa Indonesia |

> **Aturan Interpretasi:** Dokumen ini adalah **pintu masuk utama** bagi AI Agent (`opencode`) sebelum menganalisis, merancang, atau menulis kode di dalam repositori proyek web **Akira Books**[cite: 2]. AI Agent wajib membaca dokumen terkait di folder `plans/` sebelum menjalankan tugas apa pun[cite: 2].

---

## 1. Peta Dokumentasi Proyek (`plans/`)

| File Dokumen | Kode | Peran & Hirarki Acuan |
|---|---|---|
| `plans/01-requirements.md` | AKB-REQ-LL-001 | **Acuan Utama Fitur & Kebutuhan Sistem** (`FR-xxx`, `NFR-xxx`, `AC-xxx`, matriks peran, UI/UX, batasan MVP)[cite: 2] |
| `plans/02-business-rules.md` | AKB-BRL-LL-001 | **Acuan Utama Aturan Bisnis & Logika Transaksi** (`BR-xxx`, *state machine*, invarian stok/uang, konsistensi teknis, daftar keputusan)[cite: 2] |
| `plans/03-project-rules.md` | AKB-PRJ-001 | **Aturan Kerja AI Agent & Standar Pengembangan** (`PR-xxx`, stack teknologi, Docker, Prisma, pengujian, aturan Git & Checkpoint)[cite: 2] |
| `plans/04-implementation-plns.md` | AKB-IMP-001 | **Peta Jalan Implementasi Bertahap** (Tahap 1 s.d. Tahap 14, *deliverable*, dan *gate* kelulusan)[cite: 2] |
| `plans/00-dokumen_kebutuhan_sistem.md` | AKB-HIST-000 | **Draf Awal / Historis** *(Bukan acuan utama jika bertentangan dengan dokumen `01`–`04`)*[cite: 2] |

> **Larangan Penamaan File:** Dilarang mengubah nama file `plans/04-implementation-plns.md` tanpa izin eksplisit pemilik proyek[cite: 2].

---

## 2. Protokol Wajib Sebelum Coding (`PR-START`)

Setiap memulai sesi atau mengerjakan tahap/fitur baru, AI Agent **WAJIB** menjalankan urutan berikut[cite: 2]:
1. **Baca Dokumen Acuan:** Baca `AGENTS.md` dan dokumen `plans/01` s.d. `04` yang relevan dengan tugas[cite: 2].
2. **Periksa Lingkungan & Kode:** Periksa struktur folder proyek, konfigurasi Docker, skema Prisma, serta dokumentasi Next.js lokal di `node_modules/next/dist/docs/` sesuai versi terpasang[cite: 2].
3. **Pisahkan Fakta vs Rekomendasi:** Rangkum pemahaman kebutuhan dan pisahkan dengan tegas antara **Keputusan Bisnis Final** vs **Rekomendasi Teknis**[cite: 2].
4. **Deteksi Konflik / Ambiguitas:** Jika ditemukan aturan yang bertentangan atau belum diputuskan (lihat Register Keputusan di `02-business-rules.md`), **hentikan bagian terdampak dan minta keputusan pemilik proyek**[cite: 2].
5. **Tunggu Persetujuan:** Dilarang menulis kode implementasi besar, mengubah skema database, atau menambah dependensi sebelum rancangan disetujui pengguna[cite: 2].

---

## 3. Guardrails Kritis (Invarian Sistem)

| ID | Batasan Kritis | Penegakan |
|---|---|---|
| GR-01 | **Stack Terkunci** | Docker, Next.js, TypeScript, Prisma, PostgreSQL[cite: 2]. Dilarang menambah layanan eksternal atau **Mailpit** tanpa persetujuan terpisah[cite: 2]. |
| GR-02 | **Otorisasi Server-Side** | Semua hak akses (`Pengunjung`, `Customer`, `Admin Biasa`, `Admin Utama`) wajib divalidasi di server, bukan hanya menyembunyikan tombol UI[cite: 2]. |
| GR-03 | **Isolasi Modal & Laba** | Data **modal & keuntungan** dilarang keras muncul di UI, respons API, DTO, atau payload browser untuk **Admin Biasa**[cite: 2]. |
| GR-04 | **Admin Utama Tunggal** | Sistem hanya memiliki **1 Admin Utama**[cite: 2]. Tidak ada eskalasi ke Admin Utama kedua dan tidak ada persetujuan pembayaran otomatis[cite: 2]. |
| GR-05 | **Pemisahan Domain Status** | Status Pesanan, Bukti Pembayaran, Jadwal, Refund, Pengajuan Banner, dan Banner Terbit wajib disimpan secara terpisah[cite: 2]. |
| GR-06 | **Audit Immutable** | Audit administratif bersifat *append-only* (tidak dapat diubah/dihapus melalui aplikasi oleh siapa pun) dan hanya dibaca Admin Utama[cite: 2]. |
| GR-07 | **Checkpoint GitHub** | Kerjakan satu tahap pada satu waktu, jalankan verifikasi, lalu berhenti untuk ditinjau pengguna sebelum `git commit` / `git push`[cite: 2]. |
| GR-08 | **Model Stok Per Judul** | Setiap judul buku memiliki sekumpulan stok total numerik (`integer >= 0`) dan modal per unit tanpa pemisahan data fisik/kondisi per eksemplar[cite: 1, 2]. |