# Akira Books — Website Operasional Toko Buku

**Status: 100% Siap Tinjauan Go-Live (Tahap 14 — Persiapan Penggunaan)**

Aplikasi web satu toko (bukan marketplace) untuk mengelola katalog buku, stok, pemesanan, pembayaran QRIS/CFD, jadwal pengambilan Minggu, penjualan offline, laporan keuangan, notifikasi, backup terenkripsi, dan keamanan operasional. Seluruh antarmuka dan dokumentasi memakai **Bahasa Indonesia**.

> Tahap 1 s.d. Tahap 13 sudah selesai dan tergabung di riwayat Git. Tahap 14 menunggu peninjauan pemilik proyek sebelum `git commit` / `git push` (GR-07).

---

## Dokumentasi Proyek

| Dokumen | Isi |
|---|---|
| `AGENTS.md` | Pintu masuk AI Agent, guardrails (GR-01 s.d. GR-10), dan status kerja |
| `plans/01-requirements.md` | Kebutuhan fungsional & non-fungsional (`FR-xxx`, `AC-xxx`, RBAC) |
| `plans/02-business-rules.md` | Aturan bisnis (`BR-xxx`) dan keputusan (`OD-01` s.d. `OD-04`) |
| `plans/03-project-rules.md` | Tata kelola pengembangan, Docker, Prisma, pengujian, Git |
| `plans/04-implementation-plns.md` | Peta jalan Tahap 1–14 |
| `plans/05-database-erd.md` | Rancangan struktur database |
| `docs/panduan-customer.md` | Panduan lengkap untuk pembeli |
| `docs/panduan-admin.md` | Panduan operator & pemilik toko |
| `docs/checklist-go-live.md` | Checklist rotasi kredensial, backup, pengujian, dan penandatanganan |

---

## Menjalankan Aplikasi

### Prasyarat
- Docker + Docker Compose
- Git

### Langkah
1. Salin `.env.example` ke `.env`, lalu isi nilai produksi (lihat `docs/checklist-go-live.md` §3–4). **Jangan** memakai nilai contoh/rahasia di `.env.example`.
2. Bangun dan jalankan container:
   ```bash
   docker compose up -d --build
   ```
3. Terapkan migrasi:
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```
4. Buat Admin Utama awal (lingkungan baru):
   ```bash
   docker compose exec app npx tsx prisma/seed.ts
   ```
   Simpan kode pemulihan yang ditampilkan sekali itu di tempat aman **offline**.
5. Buka `http://localhost:3000`.

> File Compose yang dipakai bernama **`compose.yaml`** (bukan `docker-compose.yml`). Perintah `docker compose ...` otomatis mendeteksinya.
>
> Database Postgres dipetakan ke host pada port `5433`; di dalam container aplikasi memakai host `db`, port `5432`.

---

## Gerbang Verifikasi

Jalankan sebelum peninjauan/go-live:

```bash
docker compose exec app npx prisma migrate status
docker compose exec app npx tsc --noEmit
docker compose exec app npm test
docker compose exec app npm run build
```

Kriteria: semua migrasi **up to date**, `tsc` **0 error**, seluruh test **PASS**, build produksi **sukses**.

---

## Fitur Utama

- **Customer:** registrasi/login, katalog + pencarian/filter, keranjang, checkout atomik dengan snapshot & idempotensi, QRIS + unggah bukti multi-pesanan, jadwal Minggu, no-show, pembatalan, refund, notifikasi.
- **Admin Biasa:** kelola buku & stok, verifikasi awal bukti 2 tahap, jadwal, penjualan offline, usul koreksi harga.
- **Admin Utama:** modal & laporan laba, persetujuan final pembayaran, QRIS (OTP), akun admin (OTP), Toko Libur, banner, refund, audit append-only, backup/pemulihan.

Lihat `docs/panduan-customer.md` dan `docs/panduan-admin.md` untuk alur lengkap.

---

## Backup & Pemulihan (Tahap 13)

- Siapkan kunci age **publik** di variabel `AKIRA_BACKUP_AGE_PUBLIC_KEY` (lihat `.env.example`).
  Kunci **privat** disimpan terpisah oleh pemilik toko dan tidak pernah masuk repositori/image.
- Bangun ulang image setelah perubahan Dockerfile:
  `docker compose up -d --build` (memasang `age`, `pg_dump`, `psql`, `tar`, `gzip`).
- Backup otomatis harian berjalan di dalam aplikasi pada jam `AKIRA_BACKUP_JAM_WIB` (default `02:00` WIB), sekali per hari WIB. Arsip retensi 30 hari dibersihkan otomatis.
- Backup manual: panel `/admin/backup` (Admin Utama; kata sandi + OTP) atau CLI:
  `docker compose exec app sh scripts/backup-cli.sh`.
- Pemulihan ke target yang diinginkan:
  `docker compose exec app sh scripts/restore.sh --file <arsip.age> --identity <kunci-privat> --db-url <url-target> --media-dir <folder-target>`.
- Uji restore terisolasi (membuat dan menghapus database uji; tidak menyentuh data utama):
  `docker compose exec app sh scripts/restore-drill.sh`.

---

## Catatan Keamanan

- Otorisasi divalidasi **server-side** di setiap endpoint (GR-02).
- Modal & laba tidak pernah dikirim ke Admin Biasa/Customer (GR-03).
- Audit bersifat **append-only** dan hanya dibaca Admin Utama (GR-06).
- Berkas privat (bukti bayar, QRIS, arsip backup) tidak berada di folder `public`.
- Belum ada `git commit` / `git push` untuk Tahap 14 sebelum pemilik proyek meninjau (GR-07).
