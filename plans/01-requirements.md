# SOFTWARE & BUSINESS REQUIREMENTS SPECIFICATION (SRS/BRD) — LOW LEVEL
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-REQ-LL-001 |
| Versi | 1.1 — Baseline Spesifikasi Kebutuhan (Stok Agregat per Judul) |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Status | **Siap untuk Tinjauan & Penyelarasan Tahap 1** |
| Dasar | *Akira Books — Requirements* (23 bagian), *Dokumen Kebutuhan Sistem v1.0*, & Keputusan Pemilik Proyek |
| Bahasa Produk | Bahasa Indonesia (100% antarmuka, validasi, notifikasi, status) |
| Audiens | Pemilik Proyek (Admin Utama), AI Agent (`opencode`), Developer, QA |

> **Aturan Interpretasi:** Dokumen ini memecah seluruh kebutuhan sistem Akira Books menjadi unit fungsional (`FR-xxx`), non-fungsional (`NFR-xxx`), dan kriteria penerimaan (`AC-xxx`) yang terukur dan dapat diuji[cite: 2]. Aturan logika lintas proses dan poin keputusan terbuka yang tersisa dirinci pada `plans/02-business-rules.md`[cite: 2].

---

## 1. Ringkasan Eksekutif & Sasaran Bisnis

**Akira Books** adalah aplikasi web operasional toko buku bacaan original dan bekas yang mendukung penjualan online serta penjualan langsung di **booth CFD setiap Minggu pagi (tutup tepat pukul 09.00)**[cite: 2]. Sistem ini adalah **website satu toko (bukan marketplace)** yang dikelola penuh oleh admin, sedangkan pelanggan dapat menelusuri katalog, memesan buku, membayar via QRIS toko di luar sistem (atau bayar langsung di CFD), mengunggah bukti pembayaran, dan memilih jadwal pengambilan hari Minggu[cite: 2].

### 1.1 Sasaran Bisnis (OBJ)

| ID | Masalah Operasional | Sasaran Bisnis | Bukti Keberhasilan Fungsional |
|---|---|---|---|
| OBJ-01 | Katalog tersebar di percakapan WA | Katalog online terpusat & banner promosi | Pengunjung mencari, memfilter, melihat detail buku & banner aktif[cite: 2] |
| OBJ-02 | Pesanan & pembayaran sulit dilacak | Alur order, QRIS, verifikasi 2 tahap & tenggat tercatat | Setiap pesanan memiliki status terpisah & riwayat keputusan[cite: 2] |
| OBJ-03 | Penahanan stok manual rawan bentrok | Reservasi stok atomik & kontrol Toko Libur | Tidak ada stok negatif, oversell, atau checkout saat toko tutup[cite: 2] |
| OBJ-04 | Koordinasi ambil buku manual | Pemilihan & persetujuan tanggal Minggu (tutup 09.00) | Jadwal dikelola terpisah dari pembayaran dengan pengingat 2 jam[cite: 2] |
| OBJ-05 | Pencatatan jual lapak & modal manual | Penjualan offline & kalkulasi laba kotor otomatis | Stok langsung berkurang sesuai kuantitas & laba kotor tercatat akurat[cite: 1, 2] |
| OBJ-06 | Data modal & laporan sensitif | Pemisahan hak akses Admin Biasa vs Admin Utama | Admin Biasa tidak dapat melihat modal/laporan di UI maupun API[cite: 2] |
| OBJ-07 | Koreksi data tanpa jejak audit | Audit log *append-only* & riwayat koreksi | Pelaku, waktu, alasan, nilai lama/baru tercatat permanen[cite: 2] |
| OBJ-08 | Risiko kehilangan data & media | Backup otomatis harian (retensi 30 hari) & manual terenkripsi `age` | Database dan seluruh file media dapat dipulihkan lewat uji restore[cite: 2] |

### 1.2 Ruang Lingkup MVP

- **In-Scope MVP:** Autentikasi & 4 peran pengguna; keamanan login, OTP tindakan sensitif, pemulihan akun & kode cadangan; katalog, pencarian, filter & detail buku; pengelolaan master buku berbasis **kuantitas stok total (`integer >= 0`) per judul** & kategori; modal per unit buku khusus Admin Utama; fitur **Toko Libur** (buka/tutup manual + riwayat + polling 5 detik); **Banner Promosi** (pengajuan Admin Biasa maks. 3 pending, manajemen Admin Utama maks. 7 aktif, carousel); keranjang & checkout atomik (idempoten & snapshot); pembayaran QRIS (unggah bukti, verifikasi 2 tahap, minta bukti baru, 1 transfer multi-order) & pembayaran langsung CFD; tenggat 24 jam & pengingat 2 jam; jadwal pengambilan Minggu tutup 09.00 & gabung jadwal; pembatalan & modul pengembalian dana (*refund*) terpisah; penjualan offline & koreksi harga; laporan keuangan khusus Admin Utama; notifikasi dalam website; penguncian penanganan multi-admin; audit log *immutable*; backup terenkripsi `age`; UI responsif tema kertas klasik (krem & cokelat) 100% Bahasa Indonesia[cite: 1, 2].
- **Out-of-Scope MVP:** Aplikasi Android/iOS native terpisah; integrasi WhatsApp otomatis; ekspor laporan ke Excel; laporan buku terlaris; payment gateway otomatis; fitur marketplace atau multi-toko; pemisahan data maupun rincian kondisi fisik per eksemplar buku[cite: 1, 2].

---

## 2. Konvensi Penomoran

- **`FR-[MODUL]-xxx`:** *Functional Requirement* (kebutuhan fitur)[cite: 2].
- **`NFR-xxx`:** *Non-Functional Requirement* (keamanan, keandalan, UI/UX, operasional)[cite: 2].
- **`AC-[MODUL]-xxx`:** *Acceptance Criteria* (kriteria pengujian kelulusan fitur)[cite: 2].
- Referensi aturan bisnis lintas modul merujuk ke **`BR-xxx`** dan daftar keputusan terbuka **`OD-xxx`** pada `plans/02-business-rules.md`[cite: 2].

---

## 3. Aktor & Matriks Hak Akses (`RBAC`)

Sistem membagi pengguna ke dalam **4 peran** dengan penegakan otorisasi wajib di **server** (`BR-002`)[cite: 2]:

| Aksi / Objek Sistem | Pengunjung | Customer | Admin Biasa | Admin Utama |
|---|:---:|:---:|:---:|:---:|
| Lihat beranda, katalog, filter, detail buku, info toko, banner aktif | L | L | L | L |
| Daftar akun, login, logout, pemulihan password via email | T | T | T | T |
| Kelola profil sendiri (nama, password, WA opsional; email terkunci) | — | T | — | — |
| Kelola keranjang, buat pesanan, pilih tanggal Minggu | — | T | — | — |
| Lihat pesanan, bukti bayar, notifikasi, alasan nonaktif milik sendiri | — | L | — | — |
| Upload / ganti bukti pembayaran (sebelum *Terverifikasi*) | — | T | — | — |
| Ajukan ubah jadwal, perpanjangan tenggat, gabung jadwal, hapus akun | — | T | — | — |
| Batalkan pesanan sendiri (sebelum pembayaran terverifikasi) | — | T | — | — |
| Kelola data master buku, stok total, foto buku, kategori buku | — | — | T | T |
| Lihat & koreksi modal per unit buku, gabung buku duplikat | — | — | — | T |
| Periksa bukti pembayaran & ajukan hasil pemeriksaan awal | — | — | T | T |
| Persetujuan / penolakan final pembayaran & kasus khusus | — | — | — | T |
| Kelola jadwal pengambilan, perpanjangan tenggat, ubah metode bayar | — | — | T | T |
| Batalkan pesanan belum disetujui final pembayaran (wajib alasan) | — | — | T | T |
| Batalkan pesanan sudah disetujui final pembayaran & kelola *Refund* | — | — | — | T |
| Catat penjualan offline & pembayaran langsung di CFD | — | — | T | T |
| Ajukan koreksi harga penjualan offline | — | — | T | T |
| Setujui koreksi harga offline, koreksi pembayaran/pesanan *Selesai* | — | — | — | T |
| Sanksi / nonaktifkan / aktifkan kembali akun Customer | — | — | T | T |
| Ajukan banner (maks. 3 pending) & batalkan pengajuan sendiri | — | — | T | — |
| Setujui/tolak pengajuan banner, buat & kelola banner terbit (maks. 7 aktif) | — | — | — | T |
| Lihat daftar banner terbit (aktif/nonaktif) tanpa identitas pengaju | — | — | L | L |
| Buka / tutup **Toko Libur**, ubah alasan, hapus riwayat Toko Libur | — | — | — | T |
| Lihat status & riwayat **Toko Libur** | — | Status aktif saja | L | L |
| Lihat laporan penjualan & laporan keuangan | — | — | — | L |
| Kelola akun Admin Biasa (buat, ubah peran, nonaktif, hapus) | — | — | — | T + OTP |
| Ganti gambar QRIS toko & pengaturan global (tenggat default) | — | — | — | T + OTP |
| Lihat audit administratif (*immutable*) & kelola backup manual/restore | — | — | — | T |

*Keterangan:* `L` = Lihat/Baca, `T` = Tindakan/Ubah[cite: 2].

---

## 4. Kebutuhan Fungsional — Identitas, Akun & Keamanan (`FR-ACC`)

### `FR-ACC-001` — Registrasi, Login, Sesi & Logout
- **Aktor:** Pengunjung, Customer, Admin Biasa, Admin Utama[cite: 2].
- **Alur Utama:** (1) Input email & password; (2) Validasi kredensial (password diverifikasi terhadap hash aman); (3) Terbitkan sesi & cookie dengan atribut keamanan (`HttpOnly`, `Secure`, `SameSite`); (4) Arahkan sesuai peran; (5) Prosedur logout menghancurkan sesi server & cookie[cite: 2].
- **Exception:** Email/password salah, percobaan gagal melebihi batas (penguncian sementara otomatis), atau akun berstatus nonaktif → login ditolak tanpa membocorkan detail sensitif[cite: 2].
- **`AC-ACC-001`:** Pengunjung tidak dapat checkout; sesi Customer tidak dapat mengakses endpoint admin; serangan *brute-force* diblokir sementara; akun nonaktif gagal login[cite: 2].

### `FR-ACC-002` — Pengelolaan Profil Customer
- **Aktor:** Customer terautentikasi[cite: 2].
- **Alur Utama:** Customer mengubah nama, nomor WhatsApp (opsional), atau password melalui halaman profil[cite: 2].
- **Aturan & Batasan:** **Email tidak dapat diubah langsung** oleh Customer melalui pengaturan profil; Customer hanya boleh membaca/mengubah profil miliknya sendiri[cite: 2].
- **`AC-ACC-002`:** Perubahan nama/WA/password tersimpan; upaya mengubah field email lewat API ditolak server[cite: 2].

### `FR-ACC-003` — Pemulihan Password & Pemulihan Akun Admin Utama
- **Customer:** Meminta tautan pemulihan via email terdaftar (tautan memiliki masa berlaku & sekali pakai)[cite: 2].
- **Admin Utama:** Pemulihan menggunakan **(a) tautan email** atau **(b) kode pemulihan cadangan darurat** (dibuat secara kriptografis aman, ditampilkan sekali saat dibuat untuk disimpan pemilik toko, dan **disimpan dalam bentuk hash di server**)[cite: 2]. Proses membatasi percobaan gagal dan mencatat audit log[cite: 2].
- **`AC-ACC-003`:** Token kedaluwarsa ditolak; kode cadangan tidak dapat dipakai ulang dan tidak tersimpan *plaintext* di database; pemulihan tercatat di audit[cite: 2].

### `FR-ACC-004` — OTP Tindakan Sensitif Admin
- **Aktor:** Admin Utama (atau admin berwenang sesuai kebijakan)[cite: 2].
- **Pemicu:** Mengganti gambar QRIS, mengelola akun admin, dan tindakan sensitif yang ditetapkan pada implementasi (bukan pada setiap login)[cite: 2].
- **Aturan:** OTP dikirim via layanan email/kanal terpilih, memiliki masa berlaku singkat, pembatasan percobaan gagal, dan proteksi anti-penggunaan ulang (*replay*)[cite: 2].
- **`AC-ACC-004`:** Penggantian QRIS atau pembuatan admin tanpa OTP valid gagal; OTP yang sudah dipakai atau kedaluwarsa ditolak[cite: 2].

### `FR-ACC-005` — Peringatan & Penonaktifan Akun Customer
- **Aktor:** Admin berwenang[cite: 2].
- **Alur:** Admin memilih akun Customer → memilih peringatan, penonaktifan sementara, atau penonaktifan permanen → mengisi **alasan wajib** → simpan & catat audit[cite: 2].
- **Aturan:**
  - Akun nonaktif tidak dapat login maupun membuat pesanan baru[cite: 2].
  - Pesanan yang sudah ada **tidak otomatis dibatalkan** dan tetap diproses sesuai statusnya; riwayat transaksi tetap dipertahankan[cite: 2].
  - **Penonaktifan sementara tidak aktif kembali secara otomatis berdasarkan tanggal/waktu**; akun tetap nonaktif sampai Admin mengaktifkannya kembali secara manual[cite: 2].
  - Customer tetap dapat melihat alasan penonaktifan melalui mekanisme yang tersedia **tanpa harus berhasil login** ke akun yang dinonaktifkan[cite: 2].
- **`AC-ACC-005`:** Akun nonaktif tidak bisa login namun dapat melihat alasan penonaktifan; pesanan berjalan tetap diproses; akun tidak aktif otomatis setelah lewat hari tertentu[cite: 2].

### `FR-ACC-006` — Permintaan Penghapusan Akun Customer
- **Aktor:** Customer[cite: 2].
- **Alur:** Customer mengajukan penghapusan → server memeriksa pesanan aktif serta kewajiban pembayaran/refund → jika masih ada, penghapusan **ditunda** hingga seluruh kewajiban selesai → selama status pending, Customer dapat membatalkan permintaannya → setelah syarat terpenuhi, akun dihapus permanen (irreversibel)[cite: 2].
- **Aturan Retensi:** Riwayat permintaan dan pembatalannya dicatat[cite: 2]. Data transaksi yang wajib disimpan untuk operasional, keamanan, atau kewajiban hukum **tetap dipertahankan** sesuai kebijakan retensi[cite: 2].
- **`AC-ACC-006`:** Akun dengan pesanan aktif tidak langsung terhapus; pembatalan permohonan membatalkan penghapusan; catatan transaksi lama tetap ada setelah akun dihapus permanen[cite: 2].

### `FR-ACC-007` — Pengelolaan Akun Admin Biasa oleh Admin Utama
- **Aktor:** Admin Utama (satu-satunya)[cite: 2].
- **Alur:** Admin Utama membuat akun Admin Biasa, menetapkan peran, menonaktifkan sementara (sampai diaktifkan manual), atau menghapus permanen[cite: 2].
- **Aturan:** Saat akun admin dinonaktifkan atau dihapus, **seluruh sesi aktifnya langsung dicabut**[cite: 2]. Riwayat tindakan dan **identitas historis admin** pada transaksi maupun audit log **tidak boleh terhapus**[cite: 2].
- **`AC-ACC-007`:** Admin nonaktif langsung ter-logout pada request berikutnya; riwayat audit lama tetap menampilkan identitas admin pelaku[cite: 2].

---

## 5. Kebutuhan Fungsional — Master Buku, Katalog & Toko Libur (`FR-BOOK`, `FR-CAT`, `FR-SHP`)

### `FR-BOOK-001` — Pengelolaan Data Master Buku & Stok Agregat
- **Aktor:** Admin Biasa, Admin Utama[cite: 2].
- **Data Buku:** Kode unik / identitas buku, judul, penulis, penerbit, tahun terbit, satu atau lebih kategori, foto buku, deskripsi, harga jual, modal per unit (khusus Admin Utama), **jumlah stok total (`integer >= 0`)**, status ketersediaan, serta riwayat perubahan data[cite: 1].
- **Aturan Model Stok:** Setiap judul buku dikelola sebagai satu data master dengan sekumpulan stok total numerik (`integer >= 0`)[cite: 1]. Sistem **tidak memecah data atau mencatat rincian kondisi fisik per eksemplar item**[cite: 1].
- **`AC-BOOK-001`:** Admin Biasa dapat menambah/mengubah data buku dan angka stok total tanpa pernah menerima atau melihat field modal di UI maupun API; stok pecahan atau negatif ditolak[cite: 1, 2].

### `FR-BOOK-002` — Pengelolaan & Koreksi Modal Buku (Khusus Admin Utama)
- **Aktor:** Admin Utama **saja**[cite: 2].
- **Alur:** Admin Utama memasukkan atau mengoreksi nilai **modal per unit buku** untuk suatu judul → **wajib mengisi alasan** → sistem menyimpan riwayat (`modal lama`, `modal baru`, `alasan`, `pelaku`, `waktu`)[cite: 1, 2].
- **Aturan Perhitungan:** Koreksi modal tidak mengubah laba historis dari penjualan yang sudah `Selesai`[cite: 2]. Admin Utama dapat melihat **laba historis** dan **hasil perhitungan ulang berdasarkan modal terbaru** secara terpisah[cite: 2].
- **`AC-BOOK-002`:** Koreksi modal tanpa alasan ditolak; Admin Biasa mendapat HTTP 403/terblokir dan field modal tidak ada di DTO; laba historis tetap utuh[cite: 2].

### `FR-BOOK-003` — Status Ketersediaan, Penghapusan & Penggabungan Duplikat
- **Status & Perhitungan Ketersediaan:** `Tersedia`, `Sedang Dipesan`, `Terjual`, `Nonaktif`[cite: 2].
  - Ketersediaan untuk dipesan dihitung dari **stok total aktif dikurangi kuantitas stok yang sedang ditahan (`reserved`) pada pesanan aktif**[cite: 1].
  - Jika seluruh stok sedang ditahan pesanan aktif (`stok tersedia = 0`), buku tetap tampil di katalog dengan penanda `Sedang Dipesan` tetapi tombol pesan tidak aktif[cite: 1, 2]. Jika stok 0 karena terjual atau status `Nonaktif`, buku tidak tampil sebagai tersedia[cite: 1, 2].
- **Penghapusan & Snapshot:**
  - Buku **tanpa riwayat pesanan/transaksi** boleh dihapus permanen; buku **dengan riwayat** hanya boleh dinonaktifkan (*soft deactivation*)[cite: 2].
  - Perubahan harga atau data buku di katalog tidak mengubah **snapshot** kuantitas dan harga pada pesanan aktif yang sudah dibuat[cite: 1, 2].
  - **Penggabungan buku duplikat** hanya boleh dilakukan **Admin Utama** dengan mempertahankan identitas dan keterlacakan seluruh transaksi lama[cite: 2].
- **`AC-BOOK-003`:** Buku berriwayat transaksi gagal dihapus permanen; saat semua stok tertahan, Customer lain tidak bisa checkout buku tersebut; hanya Admin Utama yang dapat melakukan *merge* buku duplikat[cite: 1, 2].

### `FR-CAT-001` — Beranda, Katalog, Detail Buku & Informasi Toko
- **Beranda:** Menampilkan pengenalan singkat Akira Books, beberapa buku terbaru tersedia, tombol menuju katalog lengkap, navigasi info toko & login, serta area **Banner Promosi** (disembunyikan tanpa ruang kosong jika tidak ada banner aktif)[cite: 2].
- **Katalog:** Kartu buku (foto, judul, penulis, harga jual, status ketersediaan), pencarian (judul atau penulis), dan filter (kategori, rentang harga)[cite: 2].
- **Detail Buku:** Penerbit, tahun terbit, harga jual, deskripsi, kategori, foto, serta status ketersediaan dan **jumlah stok tersedia**[cite: 1, 2].
- **Informasi Toko & QRIS:** Menampilkan profil/info toko Akira Books dan gambar QRIS **hanya** kepada Customer yang memiliki pesanan dengan status pembayaran yang memerlukan pembayaran (`Menunggu Pembayaran`) serta pada halaman detail pesanan terkait[cite: 2].
- **`AC-CAT-001`:** Pengunjung tanpa login dapat mencari/memfilter buku; QRIS tidak tampil bagi pengunjung maupun Customer tanpa tagihan aktif[cite: 2].

### `FR-SHP-001` — Pengaturan & Operasional Toko Libur
- **Aktor:** Admin Utama (kontrol buka/tutup), Admin Biasa (baca status & riwayat), Pengunjung/Customer (baca status aktif)[cite: 2].
- **Aturan Buka/Tutup:**
  - Hanya Admin Utama yang dapat membuka dan menutup toko secara manual (tidak ada jadwal otomatis)[cite: 2].
  - Menutup toko **wajib disertai alasan** (maksimal **200 karakter**, ketik manual tanpa preset)[cite: 2]. Alasan dapat diubah berulang kali selama toko tutup melalui **pratinjau dan konfirmasi** (membuka toko membersihkan alasan aktif dan tidak memerlukan alasan)[cite: 2].
  - Tidak ada notifikasi khusus kepada Customer saat toko dibuka/ditutup, dan Customer tidak melihat perkiraan tanggal buka kembali[cite: 2].
- **Perilaku Saat Toko Tutup:**
  - Pengunjung/Customer tetap dapat daftar, login, melihat katalog, mengelola akun, dan menambah buku ke keranjang[cite: 2].
  - **Checkout wajib ditolak di server** saat toko tutup atau saat status toko gagal dipastikan[cite: 2].
  - Pesanan aktif yang sudah berjalan, tenggat pembayaran, jadwal pengambilan, dan pencatatan **penjualan offline** tetap berjalan normal[cite: 2].
- **Sinkronisasi Polling:**
  - Halaman toko, katalog pelanggan, dan checkout melakukan **polling status setiap 5 detik** (dijeda otomatis saat tab browser tidak aktif, dan dilanjutkan saat tab aktif kembali)[cite: 2].
  - Jika polling gagal/luring, UI mempertahankan status terakhir dengan indikator *belum terverifikasi* tanpa menghapus keranjang; waktu pembaruan terakhir tidak perlu ditampilkan ke Customer[cite: 2].
- **Riwayat Toko Libur:**
  - Mencatat waktu tutup, waktu buka (*"Masih tutup"* jika masih aktif), durasi otomatis (berjalan jika masih tutup), nama & peran pelaku historis (tetap utuh meski akun admin berubah/dihapus), dan alasan terakhir[cite: 2].
  - Ditampilkan urut terbaru dengan **pagination 20 data per halaman** (tanpa pencarian, filter, ekspor, atau ringkasan total)[cite: 2]. Alasan panjang dipotong elipsis dan dapat diperluas *inline* (banyak baris sekaligus, kembali menciut saat pindah halaman)[cite: 2].
  - Admin Utama dapat menghapus riwayat yang sudah tidak aktif (riwayat aktif tidak boleh dihapus) secara satuan atau massal (*Hapus Semua Riwayat* nonaktif jika kosong) secara **atomik** dan tercatat di **audit log** terpisah[cite: 2].
- **`AC-SHP-001`:** Checkout ditolak server saat toko ditutup mendadak; penghapusan massal riwayat bersifat atomik dan masuk audit log[cite: 2].

---

## 6. Kebutuhan Fungsional — Banner Promosi (`FR-BNR`)

### `FR-BNR-001` — Pengajuan Banner oleh Admin Biasa
- **Aktor:** Admin Biasa[cite: 2].
- **Input:** Gambar banner (**wajib**), URL tujuan (opsional), judul (opsional), deskripsi (opsional — dapat diisi sendiri-sendiri atau bersamaan)[cite: 2].
- **Aturan:**
  - Setiap Admin Biasa dibatasi maksimal **3 pengajuan berstatus pending** (dihitung per admin; pengajuan berstatus *Dibatalkan*, *Ditolak*, atau *Disetujui* tidak dihitung)[cite: 2].
  - Pengajuan baru maupun pembatalan pengajuan sendiri oleh Admin Biasa **tidak mengirim notifikasi otomatis** kepada Admin Utama[cite: 2].
  - Admin Biasa hanya dapat melihat daftar & jumlah pengajuan pending miliknya sendiri (tidak melihat identitas pengaju lain maupun alasan penolakan)[cite: 2].
- **`AC-BNR-001`:** Admin Biasa ke-4 kalinya mengajukan saat 3 masih pending ditolak; batal pengajuan membebaskan kuota pending tanpa notifikasi ke Admin Utama[cite: 2].

### `FR-BNR-002` — Persetujuan & Manajemen Banner Terbit (Admin Utama)
- **Aktor:** Admin Utama **saja**[cite: 2].
- **Aturan Persetujuan:** Admin Utama meninjau gambar, URL, judul, deskripsi, dan identitas pengaju, lalu menyetujui atau menolak (alasan penolakan opsional dan tersembunyi dari Admin Biasa)[cite: 2]. Admin Utama tidak mengedit isi pengajuan; pengajuan ditolak tidak dapat diedit/diajukan ulang (harus buat pengajuan baru)[cite: 2].
- **Aturan Kapasitas & Pengelolaan Terbit:**
  - Admin Utama dapat membuat/menerbitkan banner langsung tanpa persetujuan[cite: 2].
  - Maksimal **7 banner aktif** secara bersamaan[cite: 2]. Jika sudah 7 aktif, sistem **memblokir** publikasi atau aktivasi ulang banner lain sampai ada banner aktif yang dinonaktifkan atau dihapus permanen (tidak ada penggantian otomatis dan tidak ada jadwal tayang otomatis)[cite: 2].
  - Banner yang diaktifkan kembali masuk ke **posisi terakhir** daftar aktif[cite: 2]. Hanya banner aktif yang dapat diurutkan ulang[cite: 2].
  - **Banner terbit tidak dapat diedit** (baik aktif maupun nonaktif); perubahan konten dilakukan dengan menghapus permanen (tanpa tempat sampah) dan membuat banner baru[cite: 2].
  - Admin Utama melihat daftar aktif dan nonaktif secara terpisah[cite: 2]. Admin Biasa dapat melihat daftar banner terbit beserta statusnya tanpa identitas pengaju dan tanpa tombol kelola[cite: 2].
- **`AC-BNR-002`:** Publikasi banner ke-8 diblokir saat 7 banner aktif; penghapusan banner mempertahankan urutan relatif banner aktif tersisa[cite: 2].

### `FR-BNR-003` — Tampilan Visual & Carousel Banner
- **Konten & Tampilan:**
  - Mendukung gambar dengan dimensi dan rasio aspek berbeda (disesuaikan ke area banner)[cite: 2].
  - URL internal membuka halaman terkait di tab sama; URL eksternal membuka tab baru[cite: 2]. Seluruh area banner dapat diklik jika URL diisi (tanpa tombol CTA terpisah)[cite: 2].
  - Gambar atau URL boleh dipakai ulang terpisah, namun **kombinasi gambar dan URL yang sama dilarang** digunakan bersamaan pada banner aktif[cite: 2].
  - Jika judul atau deskripsi diisi, teks tampil di dalam gambar dengan posisi & warna otomatis serta **efek blur di area kiri gambar** agar teks terbaca[cite: 2].
- **Perilaku Carousel:**
  - `> 1` banner aktif: *autoplay* setelah jeda detik tertentu, kontrol navigasi manual, dan indikator titik di bawah banner (klik titik memilih banner tanpa mematikan autoplay permanen)[cite: 2]. Autoplay berhenti sementara saat kursor *hover* (desktop) atau sentuh/interaksi (mobile), lalu lanjut setelah interaksi selesai[cite: 2].
  - `1` banner aktif: tampil statis tanpa autoplay, titik navigasi, atau kontrol geser[cite: 2].
  - `0` banner aktif: seluruh area banner disembunyikan tanpa meninggalkan ruang kosong[cite: 2].
- **`AC-BNR-003`:** Duplikat kombinasi gambar + URL pada banner aktif ditolak; carousel berhenti saat hover dan kembali berjalan setelah mouse keluar[cite: 2].

---

## 7. Kebutuhan Fungsional — Keranjang & Pemesanan (`FR-ORD`)

### `FR-ORD-001` — Keranjang Belanja & Sinkronisasi Penjualan Offline
- **Aktor:** Customer login[cite: 2].
- **Aturan:** Customer dapat menambahkan beberapa judul buku beserta kuantitasnya ke keranjang[cite: 1]. **Keranjang tidak menahan stok[cite: 1, 2].**
- **Dampak Penjualan Offline:** Jika penjualan offline menyebabkan stok suatu judul habis (`stok = 0`) atau kurang dari kuantitas di keranjang Customer terdampak, sistem otomatis menyesuaikan/menghapus item tersebut dari keranjang, mengirim notifikasi ke Customer, dan **mewajibkan Customer meninjau serta menyetujui ulang** sisa isi keranjang (dicatat sebagai versi/snapshot keranjang yang disetujui) sebelum checkout[cite: 1, 2].
- **`AC-ORD-001`:** Dua Customer dapat memasukkan buku terakhir ke keranjang; jika buku habis terjual offline, item dihapus dari keranjang dan Customer wajib konfirmasi ulang keranjang sebelum checkout[cite: 1, 2].

### `FR-ORD-002` — Pembuatan Pesanan Atomik, Idempotensi & Snapshot
- **Aktor:** Customer login, Server[cite: 2].
- **Alur Utama:**
  1. Customer memilih tanggal pengambilan hari Minggu di masa depan dan menekan **Buat Pesanan**[cite: 2].
  2. Server memeriksa ulang status toko (buka & terverifikasi), status aktif buku, kecukupan kuantitas stok, dan harga secara atomik menggunakan **penguncian baris (*row-level locking*)** di database[cite: 1, 2].
  3. Jika kuantitas stok satu atau beberapa buku tidak mencukupi, pesanan tidak dibuat (tidak boleh ada pesanan parsial atau stok minus); item bermasalah diberitahukan dan Customer diminta meninjau ulang keranjang[cite: 1, 2].
  4. Jika valid: buat nomor pesanan, tahan kuantitas stok yang dipesan, simpan **snapshot** (identitas buku, kuantitas, harga transaksi, tenggat), set status pesanan `Menunggu Pembayaran` dan status jadwal `Menunggu Konfirmasi`, lalu kirim notifikasi website[cite: 1, 2].
- **Idempotensi:** Pengulangan request pembuatan pesanan yang sama (misal akibat klik ganda atau koneksi terputus setelah server menyimpan) wajib mengembalikan pesanan yang sudah terbentuk tanpa membuat pesanan atau menahan stok dua kali[cite: 2].
- **`AC-ORD-002`:** Simulasi 2 checkout bersamaan pada 1 stok terakhir hanya meloloskan 1 pesanan; edit harga katalog setelah checkout tidak mengubah tagihan pesanan lama[cite: 2].

### `FR-ORD-003` — Multi-Pesanan Aktif
- **Aturan:** Customer dapat memiliki beberapa pesanan aktif sekaligus dengan ID, status, tenggat pembayaran, riwayat, dan jadwal terpisah[cite: 2].

---

## 8. Kebutuhan Fungsional — Pembayaran QRIS & Tenggat (`FR-PAY`, `FR-DUE`)

### `FR-PAY-001` — Manajemen QRIS Toko
- **Aktor:** Admin Utama[cite: 2].
- **Alur:** Ganti satu gambar QRIS aktif → sistem menampilkan peringatan jika ada pesanan aktif yang mungkin memakai QRIS lama → konfirmasi, autentikasi ulang, dan **OTP** → simpan gambar QRIS baru & pertahankan riwayat QRIS lama → kirim notifikasi ke Customer dengan pesanan aktif[cite: 2].
- **Aturan:** Penggantian QRIS tidak mengubah status pembayaran maupun bukti pembayaran yang sudah diunggah sebelumnya[cite: 2].
- **`AC-PAY-001`:** Ganti QRIS tanpa OTP ditolak; bukti bayar lama tetap terhubung ke QRIS historis[cite: 2].

### `FR-PAY-002` — Unggah Bukti Pembayaran & Multi-Pesanan
- **Aktor:** Customer pemilik pesanan[cite: 2].
- **Status Bukti:** `Belum Diunggah` → `Menunggu Verifikasi` → `Perlu Bukti Baru` / `Terverifikasi`[cite: 2].
- **Aturan:**
  - Customer mentransfer via QRIS di luar sistem lalu mengunggah screenshot bukti (validasi tipe & ukuran file)[cite: 2].
  - Bukti hanya dapat diakses Customer pemilik pesanan dan admin berwenang[cite: 2].
  - Customer boleh mengganti bukti selama status masih `Menunggu Verifikasi` (bukti lama tetap disimpan sebagai riwayat, bukti terbaru tampil pertama)[cite: 2]. Setelah `Terverifikasi`, penggantian normal dilarang[cite: 2].
  - Satu bukti transfer QRIS dapat dihubungkan ke beberapa pesanan sekaligus dengan pencatatan relasi yang dapat ditelusuri per pesanan[cite: 2].
- **`AC-PAY-002`:** Customer B tidak dapat mengakses URL/endpoint file bukti Customer A; ganti bukti tidak menghapus riwayat bukti sebelumnya[cite: 2].

### `FR-PAY-003` — Verifikasi Pembayaran Dua Tahap & Permintaan Bukti Baru
- **Aktor:** Admin Biasa (pemeriksa awal), Admin Utama (pemutus final)[cite: 2].
- **Alur Wajib:**
  1. Admin Biasa memeriksa bukti dan mengajukan hasil pemeriksaan awal[cite: 2].
  2. Satu-satunya **Admin Utama** memberikan persetujuan atau penolakan final[cite: 2]. Pesanan baru berubah menjadi `Sudah Dibayar` dan bukti menjadi `Terverifikasi` setelah persetujuan final Admin Utama (**tanpa persetujuan otomatis dan tanpa eskalasi ke Admin Utama kedua**)[cite: 2].
  3. **Alur Penolakan Pemeriksaan:** Jika Admin Utama menolak hasil pemeriksaan pertama dari Admin Biasa, **alasan wajib diisi** dan kasus dikembalikan kepada **admin pemeriksa yang sama** untuk diperiksa ulang[cite: 2]. Jika pemeriksaan ulang kembali ditolak, Admin Utama mengambil alih kasus dan dapat meminta bukti baru[cite: 2].
  4. **Permintaan Bukti Baru:** Jika bukti tidak valid, admin berwenang meminta bukti baru dengan **alasan wajib dan tenggat pengganti baru**[cite: 2]. Status bukti menjadi `Perlu Bukti Baru` (status pesanan tetap `Menunggu Pembayaran`)[cite: 2]. Saat Customer mengunggah bukti pengganti sebelum tenggat, status bukti kembali `Menunggu Verifikasi` dan admin menerima notifikasi[cite: 2].
- **`AC-PAY-003`:** Admin Biasa tidak bisa mengubah status pesanan menjadi `Sudah Dibayar`; penolakan tanpa alasan gagal[cite: 2].

### `FR-PAY-004` — Pembayaran Langsung di CFD, Ubah Metode & Koreksi Pembayaran
- **Pembayaran Langsung di Booth CFD:** Admin Biasa dapat mencatat pembayaran langsung di booth tanpa persetujuan final Admin Utama dan tanpa bukti QRIS[cite: 2]. Pembayaran dan penyerahan buku dicatat sebagai kejadian terpisah (atau dalam satu operasi atomik jika bersamaan) hingga pesanan berstatus `Selesai`[cite: 2].
- **Perubahan Metode Pembayaran:** Customer dapat mengajukan perubahan metode pembayaran; Admin Biasa menyetujui/menolak[cite: 2]. Selama menunggu keputusan, **hitung mundur tenggat QRIS dijeda** (dilanjutkan dari sisa waktu jika ditolak)[cite: 2]. Setelah pembayaran disetujui, perubahan metode hanya melalui koreksi Admin Utama[cite: 2].
- **Koreksi Pembayaran:** Hanya Admin Utama dengan alasan wajib & audit log[cite: 2]. **Nominal uang pada pembayaran yang sudah disetujui tidak boleh diubah** melalui koreksi[cite: 2].
- **`AC-PAY-004`:** Pengajuan ubah metode menjeda timer QRIS dan melanjutkannya dari sisa waktu saat ditolak; koreksi pembayaran tidak bisa mengubah nominal uang[cite: 2].

### `FR-DUE-001` — Tenggat Pembayaran, Pembatalan Otomatis & Pengingat 2 Jam
- **Tenggat:** Default **24 jam** sejak pesanan dibuat (disimpan sebagai snapshot pada pesanan)[cite: 2]. Admin Utama dapat mengubah tenggat global (berlaku untuk pesanan baru saja)[cite: 2]. Admin berwenang dapat mengubah tenggat per pesanan (mencatat nilai lama/baru, waktu, admin, alasan, notifikasi)[cite: 2].
- **Perpanjangan Tenggat:** Customer dapat mengajukan lewat website atau WhatsApp (pengajuan WA wajib dicatat ke sistem oleh admin)[cite: 2]. Pengajuan perpanjangan **tidak menghentikan hitung mundur**; berlaku setelah disetujui dan disimpan server[cite: 2].
- **Tenggat Terlewati & Race Condition:**
  - Jika belum ada bukti terunggah hingga tenggat waktu server, `System` membatalkan pesanan secara atomik (alasan *"Batas Waktu Pembayaran Terlewati"*), melepas kuantitas stok 1x, mencatat audit, dan mengirim notifikasi[cite: 1, 2].
  - Jika bukti berhasil diunggah sebelum tenggat waktu server namun belum diperiksa, pesanan **tidak boleh dibatalkan otomatis**[cite: 2]. Penanganan bersamaan antara unggah bukti dan pembatalan otomatis wajib atomik[cite: 2].
- **Pengingat Persisten:** Sistem mengirim pengingat setiap **2 jam** kepada admin yang harus memeriksa bukti maupun kepada Admin Utama yang belum memutuskan persetujuan final[cite: 2]. Pengingat berjalan persisten (tahan *server restart*), anti-duplikasi, dan berhenti segera setelah keputusan dibuat[cite: 2].
- **`AC-DUE-001`:** Bukti yang masuk 1 detik sebelum tenggat tidak dibatalkan otomatis; pengingat 2 jam tetap berjalan setelah container restart[cite: 2].

---

## 9. Kebutuhan Fungsional — Jadwal Pengambilan Minggu (`FR-PICK`)

### `FR-PICK-001` — Pemilihan, Persetujuan & Perubahan Jadwal
- **Aturan Waktu & Lokasi:** Pengambilan dilakukan **Minggu pagi di booth Akira Books**, tutup tepat **pukul 09.00** (tetap, tidak dapat diubah di pengaturan admin)[cite: 2]. Customer memilih **tanggal hari Minggu di masa depan** saat checkout (tanpa memilih jam; validasi di UI & server)[cite: 2].
- **Persetujuan Jadwal:** Admin menyetujui atau menolak tanggal (penolakan **wajib alasan**, status pembayaran tidak berubah)[cite: 2]. Tanggal yang sudah berlalu tidak boleh disetujui[cite: 2]. Pengingat dikirim ke admin setiap **2 jam** selama permintaan jadwal menunggu keputusan[cite: 2].
- **Perubahan Jadwal:**
  - Customer dapat mengajukan perubahan jadwal berkali-kali atau membatalkan pengajuan jadwal yang masih pending[cite: 2].
  - Admin dapat mengusulkan perubahan jadwal dengan alasan; jadwal lama tetap berlaku sampai disetujui Customer (Customer boleh menolak usulan admin dengan alasan dan mengajukan tanggal baru)[cite: 2].
- **`AC-PICK-001`:** Tanggal selain Minggu atau tanggal lampau ditolak server; usulan perubahan jadwal admin belum mengubah tanggal aktif sebelum disetujui Customer[cite: 2].

### `FR-PICK-002` — Ketidakhadiran Customer (`No-Show`) & Penggabungan Jadwal
- **Ketidakhadiran Lewat Pukul 09.00:** Sistem mengirim notifikasi ke admin[cite: 2]. Admin memutuskan apakah buku **tetap ditahan** (tetapkan tenggat baru + alasan; setelah tenggat baru lewat, wajib keputusan manual baru dan **tidak otomatis dibatalkan**), **dijadwalkan ulang**, atau **dibatalkan** (butuh persetujuan Admin Utama jika sudah dibayar)[cite: 2].
- **Penggabungan Jadwal:** Customer dapat meminta beberapa pesanan diambil pada tanggal Minggu yang sama (ditinjau admin)[cite: 2]. Penggabungan hanya menyatukan jadwal pengambilan, **tidak menggabungkan identitas pesanan, status pembayaran, tenggat, maupun riwayat**[cite: 2]. Pembatalan atau habis tenggat pada satu pesanan tidak membatalkan jadwal pesanan lainnya[cite: 2].
- **`AC-PICK-002`:** Melewati tenggat penahanan *no-show* tidak memicu auto-cancel; batalnya Pesanan A dalam jadwal gabungan tidak membatalkan jadwal Pesanan B[cite: 2].

---

## 10. Kebutuhan Fungsional — Pembatalan, Refund, Penyelesaian, Offline & Laporan (`FR-CAN`, `FR-RFD`, `FR-DONE`, `FR-OFF`, `FR-REP`)

### `FR-CAN-001` — Pembatalan Pesanan & Pengembalian Stok
- **Customer:** Dapat membatalkan sendiri selama pembayaran belum diverifikasi (alasan opsional)[cite: 2]. Setelah pembayaran diverifikasi, Customer dilarang *self-cancel* dan diarahkan menghubungi admin[cite: 2].
- **Admin Biasa:** Dapat membatalkan pesanan yang belum dibayar atau belum mendapat persetujuan final Admin Utama (**wajib alasan**, tercatat di riwayat & audit, kirim notifikasi ke Customer dan Admin Utama)[cite: 2].
- **Admin Utama:** Wajib untuk membatalkan pesanan yang sudah mendapat persetujuan final pembayaran (wajib alasan)[cite: 2]. Pengusul pembatalan idealnya berbeda dari penyetuju; jika hanya ada 1 Admin Utama dan ia sendiri yang mengusulkan pembatalan pesanan berbayar, pengecualian diizinkan dengan **alasan tambahan yang wajib dicatat**[cite: 2].
- **Aturan Stok & Finalitas:** Pembatalan bersifat **final** (tidak bisa diaktifkan kembali)[cite: 2]. Kuantitas stok yang ditahan dikembalikan ke stok tersedia (`1x`) hanya jika buku masih aktif dan belum dikembalikan sebelumnya (anti-pengembalian ganda)[cite: 1, 2].

### `FR-RFD-001` — Pengembalian Dana (`Refund`) Terpisah
- **Aturan:** Pembatalan pesanan berbayar **tidak otomatis berarti dana telah dikembalikan**[cite: 2]. Refund dikelola sebagai proses dan status terpisah (`Tidak Berlaku`, `Perlu Diproses`, `Dikembalikan Sebagian`, `Selesai`) dengan persetujuan Admin Utama, mencatat nominal, waktu, admin, dan riwayat pengembalian sebagian atau bertahap[cite: 2].

### `FR-DONE-001` — Penyelesaian Pesanan & Koreksi Status Selesai
- **Penyelesaian:** Pesanan hanya berubah menjadi `Selesai` setelah buku benar-benar diserahkan secara fisik kepada Customer, stok tertahan dikurangi secara permanen sebagai terjual, dan admin menekan tombol **Selesai** (bukan otomatis saat lunas atau saat tanggal pengambilan tiba)[cite: 1, 2].
- **Koreksi Status Selesai:** Hanya Admin Utama dengan alasan wajib & audit log, dan **hanya boleh mengembalikan pesanan ke status sebelumnya yang benar-benar tercatat** (tidak boleh mengubah ke status sembarang)[cite: 2].

### `FR-OFF-001` — Penjualan Offline & Koreksi Harga
- **Pencatatan Penjualan Lapak:** Admin mencatat penjualan langsung di booth tanpa pesanan online/QRIS (judul buku, kuantitas unit, harga jual aktual yang boleh berbeda dari katalog, modal per unit sesuai hak akses, laba kotor, waktu, admin, jenis `Offline`)[cite: 1, 2]. Transaksi langsung berstatus `Selesai`, mengurangi stok total sesuai kuantitas terjual, dan otomatis menyesuaikan/menghapus buku terkait dari keranjang Customer lain bila stok tidak mencukupi[cite: 1, 2].
- **Koreksi Harga Offline:** Semua admin dapat mengusulkan koreksi harga offline dengan **alasan wajib**; berlaku hanya setelah disetujui **Admin Utama** (idealnya penyetuju berbeda dari pengusul)[cite: 2]. Sebelum disetujui, harga dan laba lama tetap aktif[cite: 2].

### `FR-REP-001` — Laporan Penjualan & Keuangan (Khusus Admin Utama)
- **Aktor:** Admin Utama **saja**[cite: 2].
- **Cakupan Laporan MVP:** Penjualan harian, bulanan, tahunan; total pembayaran terverifikasi (uang diterima); jumlah unit buku terjual; riwayat transaksi; pemisahan kanal online vs offline; laba kotor dari penjualan selesai (`Laba Kotor = Kuantitas × (Harga Jual Aktual - Modal per Unit)`); perbandingan laba historis vs hasil hitung ulang modal terbaru; serta riwayat pembatalan & refund[cite: 1, 2].
- **Aturan Akuntansi Operasional:** Pembayaran terverifikasi yang bukunya belum diserahkan dicatat sebagai **uang diterima**, bukan penjualan selesai maupun laba terealisasi[cite: 2].
- **Out-of-Scope MVP:** Ekspor Excel dan laporan buku terlaris[cite: 2].

---

## 11. Kebutuhan Non-Fungsional & Infrastruktur (`NFR`)

| ID | Kategori | Spesifikasi Wajib |
|---|---|---|
| `NFR-01` | **Notifikasi Website** | Notifikasi in-app (penerima, isi, waktu, status baca, pengelompokan notifikasi sejenis, riwayat lengkap)[cite: 2]. Kegagalan kirim dicoba ulang bertahap (*retry*) tanpa duplikasi dan memberi peringatan admin jika gagal berulang[cite: 2]. Arsitektur disiapkan untuk integrasi WhatsApp masa depan (bukan MVP)[cite: 2]. |
| `NFR-02` | **Konkurensi Multi-Admin** | Dashboard admin menampilkan admin yang sedang menangani pesanan dengan mekanisme penguncian sementara (*lock*) berbatas waktu (*timeout*) agar tidak terjadi bentrok sunting[cite: 2]. |
| `NFR-03` | **Audit Log Immutable** | Mencatat seluruh aktivitas sensitif (harga, modal, penjualan offline, koreksi, verifikasi, pembatalan, jadwal, tenggat, peran, nonaktif/hapus akun, QRIS, banner, Toko Libur, backup/restore)[cite: 2]. Bersifat *append-only* (tidak dapat diubah/dihapus melalui aplikasi oleh siapa pun) dan hanya dibaca Admin Utama[cite: 2]. |
| `NFR-04` | **Backup & Pemulihan** | Backup otomatis **harian (retensi 30 hari)** dan backup manual oleh Admin Utama, mencakup database serta seluruh file media (foto buku, QRIS, bukti bayar, banner)[cite: 2]. Dienkripsi menggunakan **`age`** dengan kunci pembuka disimpan terpisah oleh pemilik toko[cite: 2]. Pemulihan wajib diuji sebelum peluncuran dan secara berkala[cite: 2]. |
| `NFR-05` | **Desain, Bahasa & Responsivitas** | Identitas visual hangat & klasik nuansa kertas (**krem** dasar, **cokelat** navigasi/aksen, foto buku sebagai fokus)[cite: 2]. **100% Bahasa Indonesia**[cite: 2]. Responsif penuh pada layar HP, tablet, dan komputer (admin harus dapat mengelola seluruh operasional lewat browser HP)[cite: 2]. |
| `NFR-06` | **Waktu & Zona Waktu** | Semua logika tenggat, validasi, dan audit menggunakan **waktu server**[cite: 2]. Tampilan antarmuka menggunakan zona waktu **`Asia/Jakarta` (WIB)**[cite: 2]. |
| `NFR-07` | **Stack Teknologi** | Docker, Next.js, TypeScript, Prisma ORM, PostgreSQL[cite: 2]. Versi paket dipilih berdasarkan stabilitas & kompatibilitas[cite: 2]. MVP tanpa aplikasi Android/iOS terpisah[cite: 2]. |