# DOKUMEN KEBUTUHAN SISTEM — DRAF AWAL (HISTORIS)
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-HIST-000 |
| Versi | 1.0 — Draf Awal (Arsip Historis) |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Status | **Arsip Historis — Bukan Acuan Utama Implementasi** |
| Dasar | *Akira Books — Dokumen Kebutuhan Sistem v1.0* (23 bagian awal) |
| Bahasa Produk | Bahasa Indonesia |

> **Aturan Interpretasi:** Dokumen ini adalah spesifikasi kebutuhan versi awal sebelum pembaruan spesifikasi lengkap (*Requirements*, *Business Rules*, *Project Rules*, dan *Implementation Plan*)[cite: 2]. Apabila terdapat perbedaan atau pertentangan antara dokumen ini dengan `plans/01-requirements.md`, `plans/02-business-rules.md`, `plans/03-project-rules.md`, atau `plans/04-implementation-plns.md`, maka **dokumen `01`–`04` yang berlaku sebagai acuan utama**[cite: 2].

---

## 1. Ringkasan Konteks Draf Awal

Pada draf awal (23 bagian), Akira Books dirancang sebagai aplikasi web satu toko (bukan marketplace) untuk mendigitalisasi operasional lapak fisik Minggu pagi dan pemesanan WhatsApp[cite: 2].

| Area Draf Awal | Ringkasan Cakupan Awal | Status Pembaruan di Dokumen `01`–`04` |
|---|---|---|
| Tujuan & Teknologi | Web responsif (Docker, Next.js, TS, Prisma, PostgreSQL), QRIS toko, backup otomatis/manual | Dipertahankan & dilengkapi detail fondasi di `01` & `03`[cite: 2] |
| Peran Pengguna | Pengunjung, Customer, Admin Biasa, Admin Utama (1 orang), otorisasi server-side | Dipertahankan & diperluas (banner, Toko Libur, hapus admin) di `01` & `02`[cite: 2] |
| Akun & Keamanan | Hash password, rate limit login, OTP admin, recovery code Admin Utama, nonaktif/hapus Customer | Dipertahankan & dilengkapi aturan nonaktif/hapus Admin Biasa di `01`[cite: 2] |
| Buku & Stok | Kode unik, kategori, foto, harga, modal per unit, stok integer `>= 0` per judul gabungan | **Ditetapkan sebagai keputusan final di `01` & `02`**: stok dikelola agregat per judul tanpa pemisahan fisik/kondisi per eksemplar[cite: 1, 2] |
| Katalog & Beranda | Beranda, katalog (cari judul/penulis, filter kategori/harga), detail buku, info toko | Dipertahankan & ditambah modul **Banner Promosi** di `01`[cite: 2] |
| Keranjang & Order | Keranjang tidak menahan stok; checkout pakai *row-level locking* & simpan snapshot harga | Dipertahankan & ditambah idempotensi serta validasi **Toko Libur** di `02`[cite: 2] |
| Pembayaran QRIS | 1 QRIS toko, upload bukti, verifikasi 2 tahap (tolak 1 balik ke pemeriksa sama; tolak 2 diambil alih Admin Utama), bukti baru, 1 transfer multi-order | Dipertahankan & ditambah **Pembayaran Langsung di CFD** serta ubah metode bayar di `02`[cite: 2] |
| Tenggat & Pengingat | Tenggat default & khusus, perpanjangan web/WA, auto-cancel jika belum upload, pengingat tiap 2 jam | Dipertahankan dengan default eksplisit **24 jam** & persistensi restart di `01` & `02`[cite: 2] |
| Jadwal Pengambilan | Hari Minggu masa depan, tutup tetap **09.00**, approval admin, usul ubah jadwal, no-show manual, gabung jadwal | Dipertahankan lengkap di `01` & `02`[cite: 2] |
| Batal & Selesai | Batal final, paid-cancel butuh Admin Utama (pengecualian 1 Admin Utama + alasan tambahan), selesai saat serah terima fisik | Dipertahankan & ditambah modul **Pengembalian Dana (Refund)** terpisah di `01` & `02`[cite: 2] |
| Penjualan Offline & Laporan | Catat jual lapak, koreksi harga offline (approval Admin Utama), laporan harian/bulanan/tahunan, `Laba Kotor = Harga Aktual - Modal` | Dipertahankan & diperjelas pemisahan laba historis vs hitung ulang modal baru di `02`[cite: 2] |
| Notifikasi, Audit, Backup, UI | Notifikasi web, audit log lengkap, backup terpisah + uji restore, tema krem-cokelat Bahasa Indonesia | Dipertahankan & dirinci (retensi backup 30 hari, enkripsi `age`, *append-only* audit) di `01` & `02`[cite: 2] |
| Tahapan & Kesiapan (§21–§23) | Rencana 8 tahap awal, aturan checkpoint GitHub, dan kriteria kesiapan sebelum coding | Dipindahkan & dimutakhirkan ke `plans/04-implementation-plns.md` (14 tahap) & `plans/03-project-rules.md`[cite: 2] |