# Panduan Penggunaan — Customer (Pembeli)

## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-PND-CUS-001 |
| Versi | 1.0 — Persiapan Penggunaan (Tahap 14) |
| Tanggal | 29 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Pembaca | Customer (pembeli) dan calon pembeli |
| Bahasa | 100% Bahasa Indonesia |

> **Catatan:** Panduan ini menjelaskan alur yang tersedia di website. Semua hak akses diverifikasi di server; tombol yang tersembunyi bukanlah satu-satunya pembatas (GR-02).

---

## 1. Alur Singkat Belanja

```
Daftar / Masuk
   ↓
Lihat Katalog → pilih buku → masukkan Keranjang
   ↓
Checkout (pilih tanggal Minggu) → Pesanan dibuat (stok ditahan)
   ↓
Bayar via QRIS → unggah bukti sebelum tenggat 24 jam
   ↓
Admin memeriksa bukti (2 tahap) → pesanan menjadi "Sudah Dibayar"
   ↓
Jadwal disetujui admin → pesanan menjadi "Menunggu Diambil"
   ↓
Ambil buku di booth Akira Books (Minggu, sebelum pukul 09.00 WIB)
   ↓
Admin menekan tombol "Selesai"
```

---

## 2. Membuat Akun

1. Buka menu **Daftar** di bagian atas halaman.
2. Isi **Nama**, **Email**, dan **Kata sandi** (minimal 8 karakter).
3. Kirim formulir. Akun baru langsung aktif dengan peran **Customer**.

**Aturan penting:**
- Email dipakai sebagai identitas dan **tidak dapat diubah sendiri** setelah akun dibuat.
- Gunakan email yang benar-benar Anda pantau karena notifikasi dan pemulihan akun memakainya.
- Kata sandi disimpan dalam bentuk *hash* (scrypt) di server, bukan teks biasa.

---

## 3. Masuk dan Keluar

1. Pilih **Masuk**, lalu isi email dan kata sandi.
2. Jika berhasil, Anda diarahkan ke **Katalog**.
3. Sesi berlaku selama 7 hari. Cookie sesi bersifat `HttpOnly` dan aman di lingkungan produksi.
4. Percobaan login yang gagal berulang kali diblokir sementara sekitar 1 menit.
5. Pilih **Keluar** untuk mengakhiri sesi. Sesi di server ikut dihapus.

> Jika akun Anda dinonaktifkan oleh admin, login ditolak. Alasan penonaktifan tetap dapat dilihat tanpa harus berhasil masuk.

---

## 4. Mengelola Profil

Buka menu **Akun** untuk:
- mengubah **Nama**;
- mengisi atau mengubah nomor **WhatsApp** (opsional);
- mengubah kata sandi.

Field **email tidak dapat diubah** melalui halaman profil. Percobaan mengubah email lewat API ditolak server.

---

## 5. Menjelajah Katalog

- Halaman **Katalog** dapat dibuka tanpa login.
- Gunakan **pencarian** berdasarkan judul atau penulis.
- Gunakan **filter** kategori dan rentang harga.
- Buka kartu buku untuk melihat penerbit, tahun terbit, deskripsi, harga, dan **stok tersedia**.

Status buku yang mungkin Anda lihat:

| Status | Arti |
|---|---|
| Tersedia | Bisa langsung dipesan |
| Sedang Dipesan | Seluruh stok sedang ditahan pesanan lain; tombol pesan tidak aktif |
| Terjual / Nonaktif | Tidak tersedia untuk dipesan |

Harga dan identitas buku yang sudah Anda pesan **tidak berubah** walaupun admin mengubah katalog kemudian, karena sistem menyimpan *snapshot* transaksi.

---

## 6. Keranjang Belanja

1. Pada detail buku, tambahkan jumlah yang diinginkan ke **Keranjang**.
2. Di halaman **Keranjang**, Anda dapat mengubah jumlah atau menghapus item.
3. **Keranjang tidak menahan stok.** Stok baru ditahan saat checkout berhasil.

**Penyesuaian otomatis:** Jika penjualan di booth (offline) membuat stok buku habis atau berkurang, sistem dapat menghapus/menyesuaikan item di keranjang Anda dan mengirim notifikasi. Anda **wajib meninjau ulang dan menyetujui** kembali isi keranjang sebelum checkout.

Saat toko libur, Anda masih boleh melihat katalog dan mengisi keranjang, tetapi **checkout ditolak server** sampai toko dibuka kembali.

---

## 7. Checkout dan Pemilihan Jadwal

1. Buka **Keranjang**, lalu lanjut ke **Checkout**.
2. Pilih **tanggal pengambilan hari Minggu** yang akan datang. Tidak perlu memilih jam.
3. Periksa kembali judul, jumlah, dan total tagihan.
4. Tekan **Buat Pesanan**.

Yang terjadi di server:
- status toko dan stok diperiksa ulang secara atomik;
- jika ada stok tidak cukup, pesanan **tidak dibuat** dan Anda diminta meninjau keranjang;
- jika valid, stok ditahan, *snapshot* harga disimpan, dan pesanan berstatus **Menunggu Pembayaran**;
- klik dua kali tidak membuat pesanan ganda (idempotensi).

> Pengambilan hanya di booth Akira Books pada hari Minggu dan **tutup pukul 09.00 WIB**. Tanggal selain Minggu atau tanggal yang sudah lewat ditolak server.

---

## 8. Pembayaran QRIS

1. Buka **Pesanan**, lalu pilih nomor pesanan yang ingin dibayar.
2. Pada halaman detail pesanan, lihat **gambar QRIS toko** (hanya muncul untuk pesanan dengan pembayaranQRIS yang masih aktif).
3. Transfer sesuai **total tagihan** melalui aplikasi pembayaran Anda.
4. Unggah **screenshot bukti transfer** pada halaman tersebut.
5. Tekan kirim sebelum **tenggat 24 jam** sejak pesanan dibuat.

Aturan bukti pembayaran:

| Status bukti | Arti | Apa yang bisa Anda lakukan |
|---|---|---|
| Belum Diunggah | Belum ada bukti | Unggah bukti |
| Menunggu Verifikasi | Sedang diperiksa admin | Masih boleh mengganti bukti |
| Perlu Bukti Baru | Admin meminta bukti lain | Unggah bukti baru sebelum tenggat pengganti |
| Terverifikasi | Pembayaran disetujui final | Bukti tidak bisa diganti lagi |

- Satu bukti transfer dapat dipakai untuk **beberapa pesanan** sekaligus. Pilih pesanan yang ingin dihubungkan saat mengunggah.
- Bukti lama tetap tersimpan sebagai riwayat; bukti terbaru ditampilkan paling atas.
- Berkas bukti disimpan di penyimpanan privat dan hanya dapat diakses oleh pemilik pesanan serta admin berwenang.

**Jika belum sempat bayar:** Anda dapat mengajukan **perpanjangan tenggat** atau **perubahan metode pembayaran**. Saat pengajuan ubah metode menunggu keputusan admin, hitung mundur QRIS **dijeda**, lalu dilanjutkan dari sisa waktu jika pengajuan ditolak.

> Jika bukti sudah diunggah sebelum tenggat, pesanan **tidak dibatalkan otomatis** walaupun admin belum sempat memeriksa.

---

## 9. Memantau Status Pesanan

Buka menu **Pesanan** untuk melihat seluruh pesanan Anda. Status yang mungkin muncul:

| Status pesanan | Arti |
|---|---|
| Menunggu Pembayaran | Menunggu bukti dan persetujuan pembayaran |
| Sudah Dibayar | Pembayaran sudah disetujui final, jadwal belum disetujui |
| Menunggu Diambil | Pembayaran lunas **dan** jadwal sudah disetujui |
| Selesai | Buku sudah diserahkan dan stok dikurangi permanen |
| Dibatalkan | Pesanan dibatalkan; stok ditahan dilepaskan |

Status jadwal terpisah dari status pesanan:

| Status jadwal | Arti |
|---|---|
| Menunggu Konfirmasi | Admin belum memutuskan tanggal |
| Disetujui | Tanggal Minggu disetujui |
| Perlu Tanggal Baru | Admin meminta tanggal lain |
| Perubahan Jadwal Menunggu Persetujuan | Anda mengajukan tanggal baru dan menunggu persetujuan admin |
| Tidak Hadir (No-Show) | Anda tidak hadir setelah pukul 09.00 WIB |

**Urutan penting (OD-01):** pesanan tetap **Menunggu Pembayaran** sampai pembayaran disetujui final. Jika jadwal disetujui lebih dulu, statusnya menjadi **Sudah Dibayar** dulu; baru menjadi **Menunggu Diambil** setelah pembayaran final disetujui.

---

## 10. Mengubah Jadwal dan Menggabungkan Pesanan

Pada halaman detail pesanan Anda dapat:
- mengajukan **tanggal Minggu lain** (bisa berkali-kali);
- **membatalkan pengajuan** yang masih menunggu;
- **menolak usulan tanggal dari admin** dengan alasan, lalu mengajukan tanggal baru;
- meminta **penggabungan jadwal** beberapa pesanan pada Minggu yang sama.

Penggabungan hanya menyatukan **jadwal pengambilan**. Nomor pesanan, status pembayaran, tenggat, dan riwayat tetap terpisah. Pembatalan satu pesanan tidak membatalkan jadwal pesanan lain dalam grup yang sama.

---

## 11. No-Show (Tidak Hadir)

Jika Anda tidak hadir setelah pukul 09.00 WIB, admin akan memberi notifikasi dan memutuskan salah satu:
- buku **tetap ditahan** dengan tenggat baru dan alasan (tidak otomatis dibatalkan);
- dijadwalkan ulang;
- dibatalkan (jika pembayaran sudah final, pembatalan butuh Admin Utama).

Jika tenggat penahanan lewat, **tidak ada auto-cancel**; tetap diperlukan keputusan admin manual.

---

## 12. Membatalkan Pesanan

| Kondisi | Siapa yang bisa membatalkan |
|---|---|
| Pembayaran belum final | Anda sendiri, atau admin |
| Pembayaran sudah final | Hanya Admin Utama; Anda diarahkan menghubungi admin |

Pembatalan bersifat **final**. Stok yang ditahan dilepaskan kembali sekali (kecuali buku sudah dinonaktifkan). Anda akan menerima notifikasi.

---

## 13. Refund (Pengembalian Dana)

Pembatalan pesanan yang sudah dibayar **tidak otomatis** berarti dana kembali. Refund merupakan proses terpisah dengan status:

`Tidak Berlaku` → `Perlu Diproses` → `Dikembalikan Sebagian` → `Selesai Refund`

Hanya **Admin Utama** yang menyetujui refund. Nominal, waktu proses, metode/bukti, dan riwayat pengembalian sebagian tercatat. Refund tidak boleh melebihi nominal yang dibayar.

---

## 14. Notifikasi

Buka menu **Notifikasi** untuk melihat:
- notifikasi pesanan, pembayaran, jadwal, pembatalan, dan refund;
- penanda **belum dibaca** di Header;
- pengelompokan notifikasi sejenis (detail individual tetap tersimpan).

Anda dapat menandai satu notifikasi sebagai dibaca atau **menandai semua**. Notifikasi hanya milik akun Anda.

---

## 15. Bantuan

Jika mengalami kendala:
- cek **Notifikasi** terlebih dahulu;
- hubungi pihak toko melalui nomor WhatsApp yang tersedia di informasi toko;
- untuk akun yang dinonaktifkan, baca alasan yang ditampilkan pada halaman penjelasan penonaktifan.

> **Pemulihan kata sandi mandiri masih dalam peninjauan sebelum go-live.** Sementara itu, hubungi Admin Utama jika Anda tidak dapat masuk. Lihat `docs/checklist-go-live.md` untuk status item ini.
