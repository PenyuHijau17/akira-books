# BUSINESS RULES & DOMAIN INVARIANTS — LOW LEVEL
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-BRL-LL-001 |
| Versi | 1.1 — Baseline Aturan Bisnis & Konsistensi Sistem (Stok Agregat per Judul) |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Status | **Acuan Wajib Validasi Server & Database** |
| Dasar | *Akira Books — Business Rules* (19 bagian), *Requirements*, & Keputusan Pemilik Proyek |
| Bahasa Produk | Bahasa Indonesia |

> **Aturan Interpretasi:** Dokumen ini berisi aturan bisnis mengikat (`BR-xxx`), matriks transisi status (*state machine*), invarian konsistensi teknis, serta daftar keputusan terbuka (`OD-xxx`) yang wajib dikonfirmasi pemilik proyek sebelum finalisasi skema database[cite: 2].

---

## 1. Aturan Bisnis Lintas Modul (`BR-001` s.d. `BR-026`)

| ID | Kategori | Aturan Bisnis Mengikat |
|---|---|---|
| `BR-001` | Sumber Kebenaran | Database dan server adalah *single source of truth* untuk status, stok, tenggat, pembayaran, dan riwayat[cite: 2]. |
| `BR-002` | Otorisasi Server | Semua validasi hak akses diperiksa di server; menyembunyikan menu/tombol di UI tidak dianggap pengamanan[cite: 2]. |
| `BR-003` | Isolasi Data Customer | Customer hanya dapat membaca/mengubah profil, keranjang, pesanan, bukti bayar, dan notifikasi miliknya sendiri[cite: 2]. |
| `BR-004` | Isolasi Modal & Laba | Admin Biasa dilarang keras melihat atau mengubah modal & laba; field modal/laba tidak boleh ada dalam respons API, DTO, atau payload HTML/JSON untuk Admin Biasa[cite: 2]. |
| `BR-005` | Admin Utama Tunggal | Sistem hanya memiliki **1 Admin Utama** (pemilik toko)[cite: 2]. Tidak ada mekanisme eskalasi ke Admin Utama kedua dan tidak ada persetujuan pembayaran otomatis[cite: 2]. |
| `BR-006` | Pemisahan Status | Status Pesanan Utama, Bukti Pembayaran, Jadwal Pengambilan, Refund, Pengajuan Banner, dan Banner Terbit wajib disimpan pada atribut/kolom terpisah[cite: 2]. |
| `BR-007` | Finalitas Pembatalan | Pesanan berstatus `Dibatalkan` bersifat final dan tidak pernah dapat diaktifkan kembali[cite: 2]. |
| `BR-008` | Idempotensi & Anti-Duplikasi | Pengulangan request akibat klik ganda atau gangguan jaringan tidak boleh menciptakan pesanan, reservasi stok, pembayaran, pelepasan stok, notifikasi, atau catatan audit ganda[cite: 2]. |
| `BR-009` | Waktu Server & WIB | Seluruh perhitungan tenggat dan pencatatan waktu menggunakan waktu server; tampilan antarmuka menggunakan zona waktu `Asia/Jakarta` (WIB)[cite: 2]. |
| `BR-010` | Keranjang Tanpa Hold | Memasukkan buku ke keranjang tidak menahan stok; stok ditahan secara atomik hanya saat tombol **Buat Pesanan** berhasil diproses server[cite: 2]. |
| `BR-011` | Snapshot Pesanan | Perubahan harga, foto, atau tenggat global setelah pesanan dibuat tidak boleh mengubah kesepakatan historis (kuantitas, harga, tenggat) yang tersimpan pada pesanan lama[cite: 1, 2]. |
| `BR-012` | Penjualan Offline vs Keranjang | Jika penjualan offline membuat stok suatu judul habis atau kurang dari jumlah di keranjang Customer lain, item tersebut otomatis dihapus/disesuaikan dari keranjang terdampak; jika keranjang masih berisi buku lain, Customer wajib meninjau dan menyetujui ulang isi keranjang (versi snapshot) sebelum checkout[cite: 1, 2]. |
| `BR-013` | Validasi Toko Libur | Saat toko tutup atau status toko gagal diverifikasi, server wajib menolak checkout sementara keranjang tetap dipertahankan[cite: 2]. Penjualan offline dan pesanan aktif tetap berjalan normal[cite: 2]. |
| `BR-014` | Verifikasi QRIS 2 Tahap | Pemeriksaan awal oleh Admin Biasa ➔ persetujuan/penolakan final oleh Admin Utama[cite: 2]. Penolakan ke-1 kembali ke pemeriksa yang sama (wajib alasan); penolakan ke-2 diambil alih Admin Utama[cite: 2]. |
| `BR-015` | Bukti Tepat Waktu | Bukti pembayaran yang berhasil diunggah sebelum tenggat waktu server tetap dianggap tepat waktu dan tidak boleh dibatalkan otomatis meski belum diperiksa admin[cite: 2]. |
| `BR-016` | Jeda Hitung Mundur QRIS | Hitung mundur tenggat QRIS **hanya dijeda** saat ada permintaan **perubahan metode pembayaran** yang sedang menunggu keputusan (dilanjutkan dari sisa waktu jika ditolak)[cite: 2]. Pengajuan perpanjangan tenggat tidak menghentikan timer[cite: 2]. |
| `BR-017` | Nominal Pembayaran Terkunci | Koreksi catatan pembayaran yang sudah disetujui oleh Admin Utama wajib alasan & audit, namun **tidak boleh mengubah nominal uang**[cite: 2]. |
| `BR-018` | Jadwal Minggu Tetap 09.00 | Pengambilan hanya pada hari Minggu di masa depan; jam tutup booth tetap pukul **09.00** dan tidak dapat diubah lewat pengaturan admin[cite: 2]. |
| `BR-019` | Ketidakhadiran (`No-Show`) | Customer tidak hadir hingga pukul 09.00 tidak memicu pembatalan otomatis; admin memutuskan manual (tahan buku dengan tenggat baru + alasan tanpa auto-cancel, jadwalkan ulang, atau batalkan)[cite: 2]. |
| `BR-020` | Pembatalan vs Refund | Pembatalan pesanan berbayar wajib disetujui Admin Utama (pengusul ≠ penyetuju, kecuali 1 Admin Utama mengusulkan sendiri dengan alasan tambahan wajib)[cite: 2]. Pembatalan tidak otomatis berarti refund selesai[cite: 2]. |
| `BR-021` | Realisasi Laba Kotor | `Laba Kotor = Kuantitas × (Harga Jual Aktual - Modal per Unit)`[cite: 1]. Laba terealisasi hanya saat pesanan berstatus `Selesai` (buku diserahkan fisik) atau penjualan offline tercatat[cite: 2]. |
| `BR-022` | Retensi Laba Historis | Koreksi modal per unit oleh Admin Utama wajib alasan & riwayat, tidak menghapus laba historis, dan ditampilkan terpisah dari hasil hitung ulang modal terbaru[cite: 2]. |
| `BR-023` | Kapasitas & Edit Banner | Maksimal **3 pengajuan pending** per Admin Biasa; maksimal **7 banner aktif** bersamaan (tanpa auto-replace); banner terbit tidak bisa diedit (hapus permanen lalu buat baru); duplikat kombinasi gambar + URL pada banner aktif dilarang[cite: 2]. |
| `BR-024` | Audit Append-Only | Audit administratif bersifat *immutable* (tidak dapat diedit/dihapus via aplikasi oleh siapa pun, termasuk Admin Utama) dan hanya dibaca Admin Utama[cite: 2]. |
| `BR-025` | Pekerjaan Terjadwal Persisten | Pengingat setiap **2 jam** (bukti bayar pending & permintaan jadwal pending) serta auto-cancel tenggat harus persisten terhadap *server restart* dan berhenti segera setelah keputusan dibuat[cite: 2]. |
| `BR-026` | Model Stok Agregat per Judul | **Keputusan Bisnis Final:** Setiap master judul buku memiliki satu kumpulan stok total numerik (`integer >= 0`) dan satu nilai modal per unit aktif tanpa memisahkan data fisik maupun rincian kondisi per eksemplar[cite: 1]. |

---

## 2. State Machine: Domain Status Terpisah

### 2.1 Daftar Enum Status per Domain

| Domain Status | Nilai Status Resmi | Keterangan Kepemilikan |
|---|---|---|
| **Pesanan Utama** | `Menunggu Pembayaran`, `Sudah Dibayar`, `Menunggu Diambil`, `Selesai`, `Dibatalkan` | `Menunggu Konfirmasi` **dilarang** dipakai di sini[cite: 2] |
| **Bukti Pembayaran** | `Belum Diunggah`, `Menunggu Verifikasi`, `Perlu Bukti Baru`, `Terverifikasi` | Dikelola per pesanan / tertaut multi-pesanan[cite: 2] |
| **Jadwal Pengambilan** | `Menunggu Konfirmasi`, `Disetujui`, `Perlu Tanggal Baru`, `Perubahan Jadwal Menunggu Persetujuan` | Terpisah dari status pembayaran[cite: 2] |
| **Pengembalian Dana (Refund)** | `Tidak Berlaku`, `Perlu Diproses`, `Dikembalikan Sebagian`, `Selesai` | Dikelola terpisah dari status pembatalan[cite: 2] |
| **Pengajuan Banner** | `Menunggu Persetujuan`, `Disetujui`, `Ditolak`, `Dibatalkan` | Kuota maks. 3 `Menunggu Persetujuan` per Admin Biasa[cite: 2] |
| **Banner Terbit** | `Aktif`, `Nonaktif` | Kuota maks. 7 `Aktif` secara global[cite: 2] |

### 2.2 Matriks Transisi Status Utama

| Domain | Status Awal | Pemicu (*Trigger*) | Status Tujuan | Syarat & Efek Samping Atomik |
|---|---|---|---|---|
| Pesanan | *(Baru)* | Checkout valid | `Menunggu Pembayaran` | Toko buka terverifikasi, kuantitas stok ditahan (`reserved`), snapshot tersimpan, jadwal = `Menunggu Konfirmasi`[cite: 1, 2] |
| Pesanan | `Menunggu Pembayaran` | Admin Utama setujui pembayaran final | `Sudah Dibayar` | Bukti = `Terverifikasi`; tidak otomatis menjadi `Menunggu Diambil` atau `Selesai`[cite: 2] |
| Pesanan | `Sudah Dibayar` | Admin menyetujui jadwal pengambilan | `Menunggu Diambil` | Jadwal = `Disetujui` *(lihat penyelarasan urutan jadwal disetujui sebelum bayar di `OD-01`)*[cite: 2] |
| Pesanan | `Menunggu Diambil` / `Sudah Dibayar` | Buku diserahkan fisik & admin klik **Selesai** | `Selesai` | Kuantitas stok tertahan dikurangi permanen sebagai terjual; laba kotor terealisasi[cite: 1, 2] |
| Pesanan | *(Langsung CFD)* | Admin catat bayar langsung & serah buku | `Selesai` | Transisi atomik dengan pencatatan riwayat pembayaran & penyerahan terpisah[cite: 2] |
| Pesanan | `Menunggu Pembayaran` | Tenggat habis tanpa bukti unggah | `Dibatalkan` | Pelaku `System`, alasan *"Batas Waktu Pembayaran Terlewati"*, stok tertahan dilepas 1x[cite: 1, 2] |
| Pesanan | Sebelum `Selesai` | Pembatalan sah oleh Customer / Admin / Admin Utama | `Dibatalkan` | Final; stok tertahan dilepas 1x jika buku aktif; jika sudah bayar, set refund `Perlu Diproses`[cite: 1, 2] |
| Pesanan | `Selesai` | Koreksi status oleh Admin Utama | *(Status sebelumnya yang tercatat)* | Wajib alasan & audit; dilarang memilih status sembarang[cite: 2] |
| Bukti | `Belum Diunggah` | Customer unggah bukti sebelum tenggat | `Menunggu Verifikasi` | Catat waktu server; picu pengingat 2 jam bila belum diperiksa[cite: 2] |
| Bukti | `Menunggu Verifikasi` | Admin/Admin Utama minta bukti baru | `Perlu Bukti Baru` | Wajib alasan & tenggat pengganti baru; pesanan tetap `Menunggu Pembayaran`[cite: 2] |
| Bukti | `Perlu Bukti Baru` | Customer unggah bukti pengganti tepat waktu | `Menunggu Verifikasi` | Bukti lama tetap tersimpan di riwayat[cite: 2] |
| Bukti | `Menunggu Verifikasi` | Admin Utama menyetujui final | `Terverifikasi` | Penggantian bukti normal dikunci[cite: 2] |
| Jadwal | `Menunggu Konfirmasi` | Admin menyetujui tanggal Minggu valid | `Disetujui` | Tidak mengubah status pembayaran[cite: 2] |
| Jadwal | `Menunggu Konfirmasi` | Admin menolak tanggal | `Perlu Tanggal Baru` | Wajib alasan; Customer diminta pilih Minggu baru[cite: 2] |
| Jadwal | `Disetujui` | Admin usul ubah jadwal / Customer ajukan ubah | `Perubahan Jadwal Menunggu Persetujuan` | Jadwal lama tetap berlaku sampai disetujui pihak lawan[cite: 2] |

---

## 3. Invarian Teknis & Konsistensi Data

1. **Penguncian Stok Agregat (*Concurrency*):** Operasi checkout dan pencatatan penjualan offline wajib memakai transaksi database dengan *row-level locking* (`SELECT ... FOR UPDATE`) pada baris master buku (`Book`) sehingga `(stockTotal - stockReserved) >= requestedQty` selalu terjamin dan tidak pernah minus atau *oversold*[cite: 1, 2].
2. **Idempotensi Pelepasan Stok:** Pembatalan pesanan melepaskan kuantitas `stockReserved` tepat satu kali (`1x`)[cite: 1, 2].
3. **Race Condition Unggah Bukti vs Auto-Cancel:** Proses unggah bukti dan *worker* pembatalan tenggat wajib mengunci baris pesanan yang sama dalam transaksi database; waktu unggah di server menjadi penentu tunggal apakah bukti sah sebelum tenggat[cite: 2].
4. **Audit Log Append-Only:** Tabel audit log tidak boleh memiliki endpoint `UPDATE` maupun `DELETE` di lapisan aplikasi, dan diperkuat pembatasan hak akses di level database[cite: 2].
5. **Sinkronisasi Toko Libur:** Penghapusan massal riwayat Toko Libur dilakukan dalam satu transaksi atomik; jika satu baris gagal dihapus, seluruh penghapusan dibatalkan (*rollback*)[cite: 2].

---

## 4. Register Keputusan Terbuka (`OD-xxx`) — Wajib Dikonfirmasi di Tahap 1

*(Catatan: Konflik model stok sebelumnya telah **ditutup dan ditetapkan** pada `BR-026` sebagai stok agregat per judul buku).* Berikut sisa poin teknis yang perlu dikonfirmasi bersama pemilik proyek sebelum migrasi database final[cite: 2]:

| ID | Topik Konflik / Ambiguitas | Detail Pertentangan / Kekosongan | Rekomendasi Teknis (Untuk Persetujuan Pemilik) |
|---|---|---|---|
| `OD-01` | **Urutan Status Ketika Jadwal Disetujui Sebelum Pembayaran Lunas** | `01-requirements.md` §9 menyatakan pesanan bisa berstatus `Sudah Dibayar` sementara jadwal `Menunggu Konfirmasi`, atau sebaliknya jadwal bisa disetujui lebih dulu saat pesanan masih `Menunggu Pembayaran`[cite: 2]. | Pertahankan `Menunggu Pembayaran` sampai pembayaran disetujui final; begitu pembayaran disetujui final **dan** jadwal sudah `Disetujui`, status pesanan langsung masuk `Menunggu Diambil` (jika jadwal belum disetujui, masuk `Sudah Dibayar` dulu)[cite: 2]. |
| `OD-02` | **Aturan Merge Buku Duplikat** | Hanya Admin Utama yang boleh menggabungkan buku duplikat dengan menjaga keterlacakan transaksi lama, namun detail penjumlahan stok & atribut yang dipertahankan belum dirinci[cite: 2]. | Sediakan fitur *Merge* khusus Admin Utama yang menjumlahkan `stockTotal` ke master buku tujuan sambil mempertahankan referensi ID historis pada snapshot pesanan lama[cite: 1, 2]. |
| `OD-03` | **Validasi Nominal pada 1 Bukti QRIS untuk Multi-Pesanan** | Satu bukti transfer QRIS boleh ditautkan ke beberapa pesanan, namun aturan alokasi nominal & persetujuan kolektif vs per-pesanan belum dirinci[cite: 2]. | Simpan tabel relasi *many-to-many* (`PaymentEvidence` ↔ `Order`) dengan nominal alokasi per pesanan agar audit & total bayar tiap pesanan tetap terlacak independen[cite: 2]. |
| `OD-04` | **Spesifikasi Teknis Tetap: Durasi Autoplay Banner, Batas Karakter Teks Banner, Ukuran/Format File Upload, & Penyedia Email** | Disebutkan akan ditentukan pada tahap spesifikasi teknis sebelum implementasi (Mailpit belum terpasang dan dilarang ditambah tanpa izin)[cite: 2]. | Tetapkan nilai default pada rancangan Tahap 1 (misal autoplay 5 detik, judul maks. 60 karakter, deskripsi maks. 140 karakter, upload JPG/PNG/WebP maks. 5 MB) dan minta konfirmasi pemilik proyek beserta pilihan layanan email[cite: 2]. |