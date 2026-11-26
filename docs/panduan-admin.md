# Panduan Penggunaan — Admin (Operator & Pemilik Toko)

## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-PND-ADM-001 |
| Versi | 1.0 — Persiapan Penggunaan (Tahap 14) |
| Tanggal | 29 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Pembaca | Admin Biasa (operator) dan Admin Utama (pemilik toko) |
| Bahasa | 100% Bahasa Indonesia |

> **Prinsip penting (GR-02):** semua hak akses divalidasi di server. Menyembunyikan tombol di layar **bukan** pengamanan utama.

---

## 1. Dua Peran Admin

| Kemampuan | Admin Biasa | Admin Utama |
|---|:---:|:---:|
| Kelola data buku, stok, foto, kategori | Ya | Ya |
| Lihat dan koreksi **modal per unit** | **Tidak** | Ya |
| Lihat **laporan laba** | **Tidak** | Ya |
| Gabung buku duplikat | Tidak | Ya |
| Buka/tutup Toko Libur | Lihat saja | Ya |
| Periksa awal bukti pembayaran | Ya | Ya |
| **Persetujuan final pembayaran** | Tidak | Ya (tunggal) |
| Setujui jadwal, no-show, perpanjangan | Ya | Ya |
| Batalkan pesanan belum final | Ya | Ya |
| Batalkan pesanan sudah final & kelola refund | Tidak | Ya |
| Catat penjualan offline & usul koreksi harga | Ya | Ya |
| Setujui koreksi harga / koreksi status Selesai | Tidak | Ya |
| Kelola QRIS, akun admin, backup, audit | Tidak | Ya |

**Satu Admin Utama saja (GR-04).** Tidak ada eskalasi otomatis ke Admin Utama kedua dan tidak ada persetujuan pembayaran otomatis.

**Isolasi modal & laba (GR-03):** field `costPrice`, `snapshotCostPrice`, `oldCostPrice`, `newCostPrice`, `modalPerUnit`, `labaKotor`, `modalAktual`, dan `marginLaba` **dihapus dari respons API, DTO, dan notifikasi** untuk Admin Biasa dan Customer. Server mengembalikan 403 sebelum query jika peran tidak berhak.

**Audit append-only (GR-06):** seluruh tindakan sensitif tercatat di `AdminAuditLog`. Catatan hanya bisa **ditambah**, tidak diubah atau dihapus melalui aplikasi, dan hanya dibaca Admin Utama.

---

## 2. Masuk dan Navigasi

Setelah masuk sebagai admin, Anda diarahkan ke **Kelola Buku**. Menu admin di Header meliputi:

- **Kelola Buku** — data master, stok, dan modal
- **Verifikasi Bayar** — pemeriksaan bukti pembayaran
- **Jadwal Pengambilan** — persetujuan jadwal dan no-show
- **Pembatalan** — daftar pembatalan
- **Refund** — pengelolaan pengembalian dana
- **Penjualan Offline** — transaksi booth
- **Laporan Keuangan** — **Admin Utama saja**
- **QRIS Toko** — **Admin Utama saja**
- **Peringatan Notifikasi** — **Admin Utama saja**
- **Backup & Pemulihan** — **Admin Utama saja**
- **Banner Promo** — pengajuan/persetujuan banner

---

## 3. Kelola Buku, Stok, dan Modal

### 3.1 Data buku (Admin Biasa & Admin Utama)
- Tambah buku dengan **kode unik**, judul, penulis, penerbit, tahun, kategori, foto, deskripsi, harga jual, dan **stok total** (bilangan bulat ≥ 0).
- Ubah data dan stok melalui halaman **Kelola Buku**.
- Status ketersediaan: `Tersedia`, `Sedang Dipesan`, `Terjual`, `Nonaktif`.
- Stok tersedia = stok total − stok yang sedang ditahan pesanan aktif.

### 3.2 Modal (Admin Utama saja)
- Isi/koreksi **modal per unit** dengan **alasan wajib**. Riwayat modal lama, modal baru, alasan, pelaku, dan waktu tersimpan.
- Koreksi modal **tidak mengubah laba historis** penjualan yang sudah `Selesai`. Laporan menampilkan laba historis dan hitung ulang secara terpisah.
- Admin Biasa yang mencoba mengakses endpoint modal mendapat **403**, dan field modal tidak pernah dikirim ke browser.

### 3.3 Hapus dan gabung duplikat
- Buku **tanpa riwayat transaksi** boleh dihapus permanen.
- Buku **berriwayat** hanya boleh dinonaktifkan (*soft deactivation*).
- **Gabung buku duplikat (OD-02):** kolom `mergedIntoBookId` sudah disiapkan di database, tetapi alur penggabungannya **belum tersedia di aplikasi** dan sedang menunggu peninjauan pemilik proyek (lihat `docs/checklist-go-live.md` §9). Sementara itu, duplikat ditangani dengan menonaktifkan buku yang tidak dipakai.

### 3.4 Foto buku
Foto disimpan di penyimpanan privat dan dilayani melalui endpoint yang memeriksa sesi. Jangan menaruh berkas sensitif di folder `public`.

---

## 4. Toko Libur

- **Hanya Admin Utama** yang membuka/menutup toko secara manual (tidak ada jadwal otomatis).
- Menutup toko **wajib mengisi alasan** (maksimal 200 karakter, diketik manual) melalui pratinjau dan konfirmasi.
- Selama toko tutup, alasan dapat diubah berulang kali. Membuka toko menghapus alasan aktif.
- Saat toko tutup: pendaftaran, login, katalog, akun, dan keranjang tetap berfungsi, tetapi **checkout ditolak server**. Pesanan berjalan, tenggat, jadwal, dan penjualan offline tetap normal.
- Riwayat menampilkan waktu tutup/buka, durasi, pelaku historis, dan alasan terakhir (20 data per halaman). Admin Utama dapat menghapus riwayat yang sudah tidak aktif; penghapusan tercatat di audit.

---

## 5. Banner Promosi

> **Catatan kebijakan (GR-09):** fitur Banner Promosi **ditunda dari MVP inti**. Kode dan halaman tersedia, tetapi fokus operasional go-live adalah katalog, stok, pemesanan, pembayaran, jadwal, penjualan offline, laporan, dan Toko Libur.

- **Admin Biasa:** mengajukan banner (gambar wajib; URL/judul/deskripsi opsional), maksimal **3 pengajuan pending** per admin. Dapat membatalkan pengajuan sendiri. Tidak menerima identitas pengaju lain atau alasan penolakan.
- **Admin Utama:** menyetujui/menolak pengajuan, membuat banner langsung, dan mengelola banner terbit. Maksimal **7 banner aktif**; publikasi ke-8 diblokir. Banner terbit tidak dapat diedit—hapus lalu buat baru.
- Gambar yang diterima: **JPG/PNG/WebP**, maksimal **5 MB**.
- Carousel: otomatis jika lebih dari 1 banner aktif; berhenti saat kursor di atas banner atau saat disentuh, lalu lanjut. Banner disembunyikan tanpa ruang kosong jika tidak ada yang aktif.

---

## 6. Verifikasi Pembayaran (Wajib 2 Tahap)

1. Buka **Verifikasi Bayar**.
2. **Admin Biasa** memeriksa bukti dan mengajukan hasil pemeriksaan awal. Admin Biasa **tidak bisa** mengubah pesanan menjadi "Sudah Dibayar".
3. **Admin Utama** memberikan persetujuan atau penolakan **final**. Tanpa persetujuan ini, status tidak berubah—tidak ada auto-approval.

### Penolakan pemeriksaan
- Jika Admin Utama menolak hasil pemeriksaan pertama, **alasan wajib diisi** dan kasus dikembalikan ke **admin pemeriksa yang sama**.
- Jika pemeriksaan ulang ditolak lagi, Admin Utama **mengambil alih** kasus dan dapat meminta bukti baru.

### Permintaan bukti baru
- Alasan **wajib** dan tenggat pengganti ditentukan.
- Status bukti menjadi **Perlu Bukti Baru**; status pesanan tetap **Menunggu Pembayaran**.
- Setelah Customer mengunggah bukti baru sebelum tenggat, status kembali **Menunggu Verifikasi** dan admin mendapat notifikasi.

### Kasus khusus
- **CFD / pembayaran langsung di booth:** Admin Biasa dapat mencatat pembayaran tunai tanpa bukti QRIS dan tanpa persetujuan final. Penyerahan buku dicatat terpisah sampai pesanan `Selesai`.
- **Ubah metode:** Customer mengajukan; Admin Biasa menyetujui/menolak. Timer QRIS dijeda selama menunggu keputusan.
- **Koreksi pembayaran:** Admin Utama saja, wajib alasan & audit. **Nominal yang sudah disetujui tidak boleh diubah.**

### Tenggat dan pengingat
- Tenggat default **24 jam** sejak pesanan dibuat (WIB). Admin Utama dapat mengubah tenggat global untuk pesanan baru.
- Jika bukti tidak diunggah sampai tenggat, sistem **membatalkan otomatis**, melepas stok sekali, mencatat audit, dan mengirim notifikasi.
- Bukti yang masuk sebelum tenggat mencegah auto-cancel.
- Pengingat **setiap 2 jam** berjalan persisten (tahan restart container), anti-duplikasi, dan berhenti setelah keputusan dibuat.

---

## 7. Jadwal Pengambilan & No-Show

- Pengambilan: **Minggu pagi di booth**, tutup **pukul 09.00 WIB** (tetap, tidak bisa diubah).
- Setujui atau tolak tanggal yang diajukan Customer. **Penolakan wajib alasan.** Tanggal lampau tidak bisa disetujui.
- Admin dapat **mengusulkan tanggal pengganti** dengan alasan. Tanggal aktif **tidak berubah** sampai Customer menyetujui usulan. Customer boleh menolak usulan dengan alasan.
- **No-show:** setelah pukul 09.00 WIB, admin menerima notifikasi dan memilih:
  - **tetap tahan buku** — tentukan tenggat baru + alasan (setelah lewat, wajib keputusan manual; **tanpa auto-cancel**);
  - **jadwalkan ulang**;
  - **batalkan** (butuh Admin Utama jika pembayaran sudah final).
- **Perpanjang penahanan** dicatat dengan alasan dan waktu.
- **Tombol Selesai:** menekan tombol ini menurunkan `stockTotal` dan `stockReserved` secara atomik, mengunci status `Selesai`, dan mencatat waktu serah terima. **Lakukan hanya setelah buku benar-benar diserahkan.**

> **OD-01:** pembayaran final lebih dulu → `Sudah Dibayar`; setelah jadwal disetujui → `Menunggu Diambil`. Status pesanan tidak menjadi `Menunggu Diambil` sebelum pembayaran final.

---

## 8. Pembatalan dan Refund

### Pembatalan
- **Admin Biasa:** membatalkan pesanan yang belum mendapat persetujuan final, dengan **alasan wajib**, audit, dan notifikasi.
- **Admin Utama:** wajib membatalkan pesanan yang sudah lunas, dengan alasan. Jika Admin Utama yang mengusulkan sekaligus memutuskan (karena hanya ada satu), **alasan tambahan wajib dicatat** di audit.
- Pembatalan final. Stok ditahan dilepaskan **tepat sekali** (flag `stockReleased`), hanya untuk buku aktif. Sinkron dengan auto-cancel.
- **Koreksi status `Selesai`:** Admin Utama saja, alasan wajib, dan **hanya boleh kembali ke status yang benar-benar tercatat di riwayat**, dengan pemulihan stok atomik.

### Refund (terpisah dari pembatalan)
Alur: **pengajuan → persetujuan Admin Utama → selesai**.

Status: `Tidak Berlaku`, `Perlu Diproses`, `Dikembalikan Sebagian`, `Selesai Refund`, `Menunggu Persetujuan Admin Utama`, `Ditolak`.

Yang dicatat: nominal, waktu proses, metode/bukti, admin pemroses, dan riwayat refund sebagian/bertahap. Total refund **tidak boleh melebihi nominal dibayar**.

---

## 9. Penjualan Offline dan Laporan

### Penjualan offline (Admin Biasa & Admin Utama)
- Catat penjualan langsung di booth: judul, jumlah unit, **harga jual aktual** (boleh berbeda dari katalog), dan keterangan.
- Transaksi langsung berstatus **Selesai**; `stockTotal` dikurangi atomik per buku.
- Jika stok berkurang, keranjang Customer terdampak otomatis disesuaikan/dihapus, diberi `needsReview`, dan Customer wajib menyetujui ulang sebelum checkout.
- Kunci `idempotencyKey` mencegah duplikat akibat klik ganda.

### Koreksi harga offline
- Admin Biasa/Utama **mengusul** dengan alasan wajib; harga lama tetap berlaku.
- **Hanya Admin Utama** yang memutuskan. Semua keputusan tercatat di audit append-only.

### Laporan (Admin Utama saja)
Buka **Laporan Keuangan**. Filter harian, bulanan, atau tahunan (WIB). Menampilkan:
- total pembayaran terverifikasi (uang diterima) vs penjualan selesai;
- unit terjual, kanal online vs offline;
- pembatalan dan refund;
- **laba historis** (memakai snapshot modal saat transaksi) dan **hitung ulang** (memakai modal terbaru) secara terpisah.

Pembayaran terverifikasi yang bukunya belum diserahkan dihitung sebagai **uang diterima**, bukan penjualan selesai, bukan laba terealisasi.

---

## 10. QRIS Toko (Admin Utama)

- Sistem hanya memiliki **satu QRIS aktif**, dengan riwayat QRIS lama tetap tersimpan.
- Mengganti QRIS memerlukan: peringatan pesanan aktif, konfirmasi, autentikasi ulang, dan **OTP sekali pakai** yang dikirim ke terminal server.
- Penggantian tidak mengubah status pembayaran maupun bukti yang sudah diunggah.
- Customer dengan pesanan aktif menerima notifikasi.
- Gambar QRIS disimpan privat dan dilayani lewat endpoint ber-sesi.

---

## 11. Notifikasi dan Outbox

- Setiap peristiwa bisnis penting menghasilkan notifikasi di website (masing-masing akun hanya melihat notifikasinya).
- Notifikasi sejenis dikelompokkan, tetapi detail individual tetap tersimpan.
- Tandai satu sebagai dibaca atau **tandai semua** di `/notifikasi`.
- Pengiriman eksternal hanya berupa **abstraksi log-terminal** bila `AKIRA_NOTIF_EKSTERNAL=terminal`—tanpa layanan eksternal/Mailpit (GR-01, OD-04).
- Jika pengiriman gagal berulang, sistem mencoba ulang bertahap (outbox, anti-duplikasi) dan **Admin Utama** melihat peringatan di **Peringatan Notifikasi** (`/admin/notifikasi`). Tindak lanjut tercatat di audit.

---

## 12. Backup, Pemulihan, dan Keamanan (Admin Utama)

### 12.1 Penyiapan sekali
1. Buat pasangan kunci age: `age-keygen -o kunci-privat-age.txt`.
2. Salin **kunci publik** (`age-keygen -y kunci-privat-age.txt`) ke `AKIRA_BACKUP_AGE_PUBLIC_KEY` di `.env` produksi.
3. Simpan **kunci privat di tempat terpisah** (misalnya pengelola kata sandi offline). **Jangan** memasukkannya ke repositori, `.env.example`, atau image Docker.
4. Isi variabel backup lain di `.env` (lihat `.env.example`). Jangan memakai nilai rahasia di `.env.example`.

### 12.2 Backup otomatis
- Berjalan harian pukul `AKIRA_BACKUP_JAM_WIB` (default **02.00 WIB**), sekali per hari WIB.
- Isi arsip: dump PostgreSQL (`pg_dump`) + seluruh direktori media, dikemas `tar.gz`, lalu dienkripsi `age`.
- Retensi **30 hari**: arsip lama dihapus, riwayat tetap ada dengan status `Dibersihkan`, penghapusan tercatat di audit.
- Arsip disimpan di `/app/backup-arsip` (di dalam container) dan **tidak boleh di-commit** (`.gitignore` sudah melindunginya).

### 12.3 Backup manual lewat panel
1. Buka **Backup & Pemulihan**.
2. Pastikan badge **"Kunci publik age sudah terpasang"**.
3. Klik **Minta OTP**—OTP 6 digit muncul di log terminal server dan berlaku 5 menit.
4. Isi **YA** pada kolom konfirmasi, **kata sandi Admin Utama**, dan **OTP**. Keterangan opsional.
5. Klik **Jalankan Backup Sekarang**.

### 12.4 Backup manual lewat CLI
```bash
docker compose exec app sh scripts/backup-cli.sh
```

### 12.5 Pemulihan
```bash
docker compose exec app sh scripts/restore.sh \
  --file backup-arsip/<arsip.age> \
  --identity <path-kunci-privat> \
  --db-url postgresql://<user>:<pass>@<host>:<port>/<db-target> \
  --media-dir <folder-media-target>
```

> **Peringatan:** jangan menjalankan pemulihan ke database produksi tanpa prosedur dan persetujuan yang jelas. Uji dulu pada target terisolasi.

### 12.6 Uji coba pemulihan (restore drill)
```bash
docker compose exec app sh scripts/restore-drill.sh
```
Skrip membuat database uji sementara, kunci age uji, arsip uji, memulihkan, membandingkan jumlah baris/berkas, lalu **menghapus semua data uji**. Contoh hasil sukses: `RESTORE DRILL BERHASIL — pengguna=3, berkas media=1`.

### 12.7 Audit
Seluruh aksi sensitif (harga, modal, penjualan offline, koreksi, verifikasi, pembatalan, jadwal, peran, QRIS, banner, Toko Libur, backup/restore) tercatat di `AdminAuditLog`. Catatan **append-only** dan hanya Admin Utama yang dapat membacanya.

---

## 13. Daftar Periksa Harian (Ringkas)

- [ ] Periksa **Verifikasi Bayar**—tidak ada bukti yang menunggu terlalu lama.
- [ ] Periksa **Jadwal Pengambilan**—setujui/tolak permintaan dan tangani no-show.
- [ ] Periksa **Peringatan Notifikasi**—jika ada retry gagal, tindak lanjuti.
- [ ] Periksa status **Toko Libur** sesuai jadwal operasional.
- [ ] Pastikan panel **Backup & Pemulihan** menunjukkan kunci publik age terpasang dan tidak ada backup gagal.
