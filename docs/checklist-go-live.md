# Checklist Kesiapan Go-Live

## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-CHK-GOLIVE-001 |
| Versi | 1.0 — Persiapan Penggunaan (Tahap 14) |
| Tanggal | 29 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Penandatangan | Pemilik Proyek (Admin Utama) |
| Bahasa | 100% Bahasa Indonesia |

> **Tujuan:** memastikan konfigurasi produksi aman, backup dapat dipulihkan, dan alur utama sudah diuji sebelum website dipakai operasional.
>
> **Status dokumen:** **100% Siap Tinjauan Go-Live** — menunggu pemeriksaan dan penandatanganan pemilik proyek. Tidak ada `git commit` / `git push` sebelum tinjauan selesai (GR-07).

---

## 1. Aplikasi & Infrastruktur

- [ ] Folder proyek bersih dan Tahap 1–13 sudah tergabung di riwayat Git.
- [ ] `docker compose up -d --build` berhasil (image memuat `age`, `pg_dump`, `psql`, `tar`, `gzip`).
- [ ] Container `akira-books-app` dan `akira-books-db` berstatus **healthy/up**.
- [ ] `docker compose exec app npx prisma migrate status` menunjukkan **semua migrasi up to date** (13 migrasi).
- [ ] Port hosting sudah diatur dan akses HTTPS (jika dipakai) aktif.

---

## 2. Rotasi Kredensial Default (WAJIB)

Sebelum go-live, **ganti semua nilai bawaan/kdevelopment**. Tandai setiap item setelah diganti dan disimpan di pengelola kata sandi pemilik toko.

| Item | Nilai bawaan / kondisi | Tindakan wajib | Selesai |
|---|---|---|---|
| Kata sandi database `akira_books_dev_only` di `compose.yaml` | Development | Ganti dengan kata sandi kuat & unik di `.env` produksi / secret manager | ☐ |
| Akun **Admin Utama** dari `prisma/seed.ts` | Kredensial awal | Ganti kata sandi segera setelah login pertama | ☐ |
| Kode pemulihan Admin Utama | Dibuat saat seed | Simpan **offline**; pastikan sudah dicoret dari catatan sementara | ☐ |
| `SESSION_SECRET` / `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Kosong di `.env.example` | Isi nilai acak ≥ 32 karakter, **stabil** (jangan diubah tiap restart) | ☐ |
| Akun Admin Biasa bawaan (jika ada) | Development | Nonaktifkan/hapus atau ganti kata sandi | ☐ |
| Kredensial hosting / registry / server | Bawaan penyedia | Rotasi sesuai kebijakan penyedia | ☐ |

**Aturan:** jangan pernah menaruh kata sandi, token, atau kunci privat di `README.md`, `.env.example`, `docs/`, repositori, atau image Docker.

---

## 3. Kunci age & Penyimpanan Privat Terpisah

- [ ] Pasangan kunci age sudah dibuat: `age-keygen -o kunci-privat-age.txt`.
- [ ] **Kunci publik** dipasang di `AKIRA_BACKUP_AGE_PUBLIC_KEY` pada `.env` produksi.
- [ ] **Kunci privat** disimpan di lokasi **terpisah dari server/aplikasi** (misalnya pengelola kata sandi offline atau media fisik yang diamankan).
- [ ] Kunci privat **tidak** ada di repositori, `.env.example`, `docs/`, atau image Docker.
- [ ] `.gitignore` masih melindungi `/backup-arsip/`, `/storage/`, `*.age`, `*kunci-privat*`, `*age-private*`.
- [ ] Akses ke folder arsip `/app/backup-arsip` dan media `/app/storage` dibatasi hanya untuk pengguna sistem yang berwenang.
- [ ] Berkas bukti pembayaran dan QRIS **tidak** berada di folder `public`; keduanya dilayani lewat endpoint ber-sesi (`/api/pembayaran/bukti/[id]`, `/api/qris/gambar/[id]`).

---

## 4. Konfigurasi `.env` Produksi

Salin `.env.example` ke `.env`, lalu isi **tanpa memakai nilai contoh**. Periksa setiap variabel:

| Variabel | Wajib | Catatan |
|---|:---:|---|
| `DATABASE_URL` | Ya | Di dalam container Compose diisi otomatis (`db:5432`); nilai host memakai port `5433` |
| `SESSION_SECRET` | Ya | Acak ≥ 32 karakter, stabil |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Ya | Acak ≥ 32 karakter, stabil |
| `AKIRA_BACKUP_AGE_PUBLIC_KEY` | Ya | Bentuk `age1...` (publik saja) |
| `AKIRA_BACKUP_DIR` | Opsional | Default `/app/backup-arsip` |
| `AKIRA_BACKUP_MEDIA_DIR` | Opsional | Default `/app/storage` |
| `AKIRA_BACKUP_RETENSI_HARI` | Opsional | Default `30` (ketentuan NFR-04) |
| `AKIRA_BACKUP_JAM_WIB` | Opsional | Default `02:00` (Asia/Jakarta) |
| `AKIRA_NOTIF_EKSTERNAL` | Opsional | Kosong = mati; `terminal` = cetak ke log. **Tidak menambah layanan eksternal** (GR-01, OD-04) |

- [ ] `.env` **tidak** ikut di-commit (`.gitignore` sudah mengabaikan `.env*` kecuali `.env.example`).
- [ ] Tidak ada variabel yang masih berisi placeholder `<...>`.
- [ ] Zona waktu server/container dan aplikasi konsisten dengan **WIB (Asia/Jakarta)** untuk tenggat, jadwal 09.00, pengingat 2 jam, dan backup 02.00.

---

## 5. Verifikasi Backup Harian & Restore

- [ ] Login sebagai **Admin Utama**, buka **Backup & Pemulihan**.
- [ ] Badge **"Kunci publik age sudah terpasang"** berwarna sukses.
- [ ] Jam backup harian dan retensi sesuai kebijakan (default `02:00 WIB`, `30 hari`).
- [ ] Jalankan **backup manual** lewat panel (konfirmasi `YA`, kata sandi, OTP dari log terminal) **atau** CLI:
      `docker compose exec app sh scripts/backup-cli.sh`.
- [ ] Arsip `.age` muncul di riwayat dengan status **Berhasil** dan memiliki checksum SHA-256.
- [ ] Jalankan uji pemulihan terisolasi:
      `docker compose exec app sh scripts/restore-drill.sh`.
- [ ] Hasil uji menunjukkan `RESTORE DRILL BERHASIL` dan **database utama tidak berubah**.
- [ ] Jadwalkan pengecekan berkala: pastikan backup harian tetap berhasil dan tidak ada arsip gagal/terlewat.
- [ ] Simpan catatan lokasi kunci privat dan prosedur pemulihan di tempat yang diketahui pemilik toko.

---

## 6. Pengujian Awal (Smoke Test Sebelum Dipakai)

Lakukan pada lingkungan produksi atau staging dengan data uji, lalu bersihkan data uji:

### Customer
- [ ] **Daftar** akun Customer baru; pastikan email ganda ditolak.
- [ ] **Masuk** dan **Keluar** berhasil; sesi baru menggantikan sesi lama.
- [ ] Cari/filter buku di **Katalog**; buka detail buku.
- [ ] Tambah buku ke **Keranjang**, ubah jumlah, hapus item.
- [ ] **Checkout**: pilih tanggal Minggu; pastikan tanggal bukan Minggu / lampau ditolak.
- [ ] Klik **Buat Pesanan** dua kali cepat → hanya **satu** pesanan terbentuk.
- [ ] Unggah bukti QRIS; cek bukti lama tetap ada saat diganti.
- [ ] Cek bukti pesanan lain **tidak bisa** dibuka oleh Customer berbeda.
- [ ] Ajukan ubah jadwal; cek usulan admin belum mengubah tanggal aktif sebelum disetujui.
- [ ] Terima notifikasi dan tandai sebagai dibaca.

### Admin Biasa
- [ ] Tambah/ubah buku; **pastikan tidak ada field modal** di halaman maupun respons API.
- [ ] Coba akses endpoint laporan/modal → ditolak **403**.
- [ ] Periksa bukti dan ajukan hasil pemeriksaan awal; pastikan **tidak bisa** menyetujui final.
- [ ] Tolak pemeriksaan tanpa alasan → ditolak sistem.
- [ ] Catat penjualan offline; pastikan stok dan keranjang Customer terdampak tersinkron.

### Admin Utama
- [ ] Setujui pembayaran final → status menjadi **Sudah Dibayar**; setelah jadwal disetujui → **Menunggu Diambil**.
- [ ] Ganti QRIS tanpa OTP → ditolak; dengan OTP → berhasil, riwayat tetap ada.
- [ ] Buat/nonaktifkan Admin Biasa dengan OTP; pastikan sesi lama langsung dicabut.
- [ ] Buka/tutup Toko Libur dengan alasan; cek checkout ditolak saat tutup.
- [ ] Setujui koreksi harga offline; cek keputusan tercatat di audit.
- [ ] Buka **Laporan Keuangan**; bandingkan laba historis vs hitung ulang.
- [ ] Lihat **Peringatan Notifikasi** dan **Backup & Pemulihan**.
- [ ] Pastikan catatan audit **tidak bisa** diubah/dihapus lewat aplikasi.

---

## 7. Gerbang Verifikasi Wajib

Jalankan dari root proyek di dalam container dan pastikan hasilnya bersih:

```bash
docker compose exec app npx prisma migrate status
docker compose exec app npx tsc --noEmit
docker compose exec app npm test
docker compose exec app npm run build
```

Kriteria lulus dan hasil eksekusi oleh AI Agent pada 29 November 2026:

| Perintah | Kriteria | Hasil |
|---|---|:---:|
| `prisma migrate status` | Semua migrasi **up to date**, tanpa drift | ☑ **Lulus** — 13 migrasi up to date |
| `tsc --noEmit` | **0 error** | ☑ **Lulus** — exit code 0, tanpa error |
| `npm test` | **Semua test PASS** | ☑ **Lulus** — 31 file / 259 test PASS |
| `npm run build` | Build produksi **sukses** | ☑ **Lulus** — 56 halaman, exit code 0 |

> Warning non-fatal (misalnya middleware deprecated atau log `NEXT_PRERENDER_INTERRUPTED` saat prerender) tidak dihitung sebagai error, tetapi tetap dicatat jika muncul. Log `Route ... needs to bail out of prerendering` pada endpoint API selama build bersifat normal dan tidak menggagalkan build.

---

## 8. Guardrails yang Harus Tetap Terjaga

- [ ] **GR-01** — Tidak ada layanan eksternal/Mailpit baru; notifikasi eksternal hanya log-terminal.
- [ ] **GR-02** — Semua endpoint admin memvalidasi sesi & peran di server.
- [ ] **GR-03** — Modal & laba tidak muncul untuk Admin Biasa/Customer (API, DTO, UI, notifikasi).
- [ ] **GR-04** — Hanya satu Admin Utama; tidak ada eskalasi/persetujuan otomatis.
- [ ] **GR-05** — Status Pesanan, Bukti, Jadwal, Refund, dan pendukung tersimpan terpisah.
- [ ] **GR-06** — Audit append-only, hanya dibaca Admin Utama.
- [ ] **GR-07** — Belum ada `git commit` / `git push` sebelum pemilik proyek meninjau.
- [ ] **GR-08** — Stok per judul berupa `integer ≥ 0`; tanpa rincian eksemplar fisik.
- [ ] **GR-09** — Banner Promosi ditunda dari MVP inti.
- [ ] **GR-10** — Unit test menyertai logika bisnis/RBAC/guardrails; `tsc` 0 error dan `npm test` PASS.
- [ ] **OD-01 s.d. OD-04** — Urutan status, merge buku, alokasi pembayaran, dan keputusan banner/email sesuai catatan di `AGENTS.md`.

---

## 9. Catatan untuk Peninjauan Pemilik Proyek

Item berikut perlu diputuskan pemilik proyek sebelum dinyatakan **siap produksi penuh**:

1. **OD-02 — penggabungan buku duplikat belum diimplementasikan.** Kolom `mergedIntoBookId` dan enum audit sudah ada, tetapi belum ada endpoint/UI yang memindahkan `stockTotal` ke buku utama. Perlu keputusan: apakah fitur ini wajib sebelum go-live, atau ditunda dengan penonaktifan manual buku duplikat. Lihat `docs/panduan-admin.md` §3.3.
2. **Pemulihan kata sandi mandiri** — halaman `/forgot-password` tersedia, tetapi alur pengiriman tautan reset belum berfungsi penuh (`lupaPassword` masih berupa abstraksi). Untuk sementara, pemulihan dilakukan oleh Admin Utama. Lihat `docs/panduan-customer.md` §15.
3. **Rotasi kredensial default** — Checklist §2 harus benar-benar dilaksanakan sebelum server menerima pengguna nyata.
4. **Kunci privat age** — pastikan benar-benar tersimpan terpisah dan prosedur pemulihan diketahui oleh pemilik toko.

### Perbaikan kecil hasil audit akhir (sudah diterapkan)

- `/api/admin/route.ts` sebelumnya dapat diakses tanpa sesi dan expose daftar user serta mengubah akun. Sekarang **semua operasi memerlukan sesi server-side**; pengelolaan akun admin hanya Admin Utama, dengan **OTP sekali pakai**, kata sandi dari input (bukan hardcoded), hash `salt:derived` yang sesuai `verifyPassword`, pencabutan sesi, dan audit append-only.
- Pembangkitan OTP memakai `crypto.randomInt` (bukan `Math.random`).
- Helper `toWIBString` dikoreksi agar tidak menambah +7 jam dua kali.
- Helper `dapatkanRiwayatAudit` dikoreksi memakai `actorRoleSnapshot`, dan endpoint baca audit `/api/admin/audit` ditambahkan dengan pembatasan **Admin Utama saja** (read-only).
- Regresi otorisasi dan isolasi audit dicakup oleh `admin-otorisasi.test.ts` dan `audit-pembaca.test.ts`.

---

## 10. Penandatanganan Kesiapan

Dengan menandatangani bagian ini, pemilik proyek menyatakan telah meninjau checklist di atas dan memberikan persetujuan operasional.

| Peran | Nama | Tanggal | Tanda tangan |
|---|---|---|---|
| Pemilik Proyek (Admin Utama) | | | |
| Admin Biasa (jika ada) | | | |
| Developer / AI Agent (penyerah) | | | |

**Kesimpulan tinjauan:**

- ☐ Disetujui untuk go-live dengan catatan pada §9.
- ☐ Disetujui tanpa catatan.
- ☐ Belum disetujui — perlu perbaikan: ______________________________
