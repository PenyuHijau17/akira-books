AKIRA BOOKS — IMPLEMENTATION PLAN
1. Tujuan
Dokumen ini mengatur tahapan pengembangan website Akira Books berdasarkan REQUIREMENTS, BUSINESS_RULES, dan PROJECT_RULES.
Setiap tahap harus diperiksa dan diuji sebelum melanjutkan ke tahap berikutnya.
2. Tahap 1 — Analisis dan Rancangan
Membaca seluruh dokumen kebutuhan.
Memeriksa konsistensi kebutuhan dan aturan bisnis.
Mengidentifikasi kebutuhan yang belum jelas.
Mengusulkan arsitektur aplikasi.
Merancang struktur folder.
Merancang model database dan relasinya.
Merancang autentikasi serta pembagian hak akses.
Merancang alur status buku, pesanan, pembayaran, jadwal, pembatalan, dan pengembalian dana.
Menyusun strategi pengujian.
Hasil yang diharapkan: rancangan teknis dan daftar keputusan yang perlu disetujui pengguna sebelum implementasi.
3. Tahap 2 — Persiapan Lingkungan
Membuat project Next.js dengan TypeScript.
Menyiapkan Docker dan Docker Compose.
Menyiapkan PostgreSQL.
Mengintegrasikan Prisma dengan database.
Menyiapkan environment variables dan .gitignore.
Memastikan aplikasi dan database dapat berjalan.
Menyiapkan Git dan repository GitHub setelah mendapat persetujuan pengguna.
Hasil yang diharapkan: lingkungan pengembangan berjalan dan dapat diperiksa tanpa kehilangan data.
4. Tahap 3 — Fondasi Aplikasi
Menyiapkan struktur layout dan navigasi.
Membuat tampilan dasar Bahasa Indonesia.
Menyiapkan validasi data dan penanganan error.
Menyiapkan pola akses database.
Menyiapkan pencatatan tindakan penting.
Menyiapkan mekanisme pemeriksaan hak akses di server.
Hasil yang diharapkan: fondasi aplikasi yang konsisten untuk fitur berikutnya.
5. Tahap 4 — Autentikasi dan Hak Akses
Registrasi dan login pelanggan.
Login admin.
Pengelolaan sesi dan perlindungan login.
Pembagian akses admin utama, admin biasa, pelanggan, dan pengunjung.
Pengelolaan profil pelanggan.
Pengelolaan akun admin oleh admin utama.
Penonaktifan akun dan pencabutan sesi.
Alur pemulihan akun admin utama.
Penanganan permintaan penghapusan akun pelanggan.
Hasil yang diharapkan: setiap pengguna hanya dapat mengakses fitur dan data sesuai kewenangannya.
6. Tahap 5 — Katalog dan Buku
Pengelolaan data buku oleh admin.
Pengelolaan eksemplar individual.
Pengelolaan foto, kategori, kondisi, deskripsi, dan harga.
Pengelolaan modal oleh admin utama.
Pencarian dan filter katalog.
Halaman detail buku.
Status ketersediaan, penonaktifan, dan riwayat perubahan.
Penanganan duplikasi data buku.
Hasil yang diharapkan: katalog dapat digunakan pelanggan dan data buku dapat dikelola dengan aman.
7. Tahap 6 — Keranjang dan Pemesanan
Keranjang beberapa buku.
Validasi stok di server.
Penahanan stok secara atomik.
Pencegahan pemesanan ganda.
Penyimpanan snapshot buku dan harga.
Halaman detail pesanan.
Daftar pesanan aktif dan riwayat pelanggan.
Pencegahan perubahan yang bertentangan ketika beberapa admin menangani pesanan yang sama.
Hasil yang diharapkan: pemesanan konsisten meskipun terjadi permintaan bersamaan atau koneksi bermasalah.
8. Tahap 7 — Pembayaran dan QRIS
Pengelolaan QRIS oleh admin utama.
Penggantian QRIS beserta riwayat dan notifikasi.
Unggah dan pengelolaan bukti pembayaran.
Pemeriksaan awal oleh admin.
Persetujuan final oleh admin utama.
Penanganan penolakan dan penggantian bukti.
Tenggat pembayaran dan perpanjangan.
Penanganan unggahan yang gagal atau berulang.
Pencegahan pembayaran ganda dan perubahan status yang tidak sah.
Hasil yang diharapkan: bukti pembayaran dan keputusan pembayaran dapat ditelusuri dengan jelas.
9. Tahap 8 — Jadwal dan Pengambilan
Pemilihan tanggal pengambilan hari Minggu.
Persetujuan atau penolakan jadwal.
Pengajuan jadwal baru.
Usulan perubahan jadwal oleh admin.
Penanganan pelanggan yang tidak datang.
Penggabungan jadwal beberapa pesanan.
Konfirmasi penyerahan buku dan penyelesaian pesanan.
Hasil yang diharapkan: jadwal dan penyerahan buku mengikuti aturan operasional toko.
10. Tahap 9 — Pembatalan dan Pengembalian Dana
Pembatalan oleh pelanggan sesuai haknya.
Pembatalan oleh admin.
Persetujuan pembatalan pesanan yang sudah dibayar.
Pencatatan alasan dan riwayat pembatalan.
Pencatatan pengembalian dana secara terpisah.
Penanganan ketersediaan buku setelah pembatalan.
Hasil yang diharapkan: pembatalan tidak menghilangkan riwayat pembayaran dan tidak dianggap sebagai pengembalian dana otomatis.
11. Tahap 10 — Penjualan Offline dan Laporan
Pencatatan penjualan langsung.
Pencatatan harga jual aktual.
Koreksi harga dengan persetujuan.
Laporan pembayaran yang diterima.
Laporan penjualan selesai.
Perhitungan laba historis dan laba berdasarkan modal terbaru.
Laporan harian, bulanan, dan tahunan.
Pembatasan akses laporan kepada admin utama.
Hasil yang diharapkan: catatan transaksi dan laporan keuangan dapat ditelusuri serta tidak mencampur pembayaran diterima dengan penjualan selesai.
12. Tahap 11 — Notifikasi
Notifikasi pesanan dan perubahan status.
Pengelompokan notifikasi sejenis.
Penanda belum dibaca.
Riwayat notifikasi lengkap.
Penanganan kegagalan dan percobaan ulang.
Pencegahan notifikasi duplikat.
Pengingat tenggat dan eskalasi kepada admin.
Persiapan arsitektur untuk integrasi WhatsApp pada tahap lanjutan.
Hasil yang diharapkan: kejadian penting tetap tercatat dan dapat ditindaklanjuti ketika pengiriman notifikasi gagal.
13. Tahap 12 — Backup, Keamanan, dan Pengujian Menyeluruh
Backup otomatis dan manual.
Penyimpanan backup terpisah dan aman.
Backup database serta file.
Pengujian pemulihan backup.
Pengujian hak akses.
Pengujian alur transaksi lengkap.
Pengujian permintaan bersamaan.
Pengujian kegagalan jaringan dan percobaan ulang.
Pemeriksaan error, validasi, dan build aplikasi.
Perbaikan masalah sebelum penggunaan operasional.
Hasil yang diharapkan: aplikasi lebih siap digunakan dan memiliki prosedur pemulihan data.
14. Tahap 13 — Persiapan Penggunaan
Pemeriksaan akhir seluruh fitur.
Pemeriksaan konfigurasi lingkungan penggunaan.
Pengamanan kredensial.
Peninjauan backup dan pemulihan.
Dokumentasi penggunaan admin.
Pemeriksaan tampilan pada perangkat HP dan komputer.
Penentuan prosedur pemeliharaan.
Hasil yang diharapkan: aplikasi siap dievaluasi untuk penggunaan nyata setelah seluruh persyaratan dan pengujian terpenuhi.
15. Aturan Checkpoint
Pada akhir setiap tahap:
Ringkas pekerjaan yang selesai.
Tampilkan file yang dibuat atau diubah.
Jalankan pemeriksaan yang relevan.
Jelaskan hasil pengujian dan masalah yang belum selesai.
Jelaskan konsep teknis yang perlu dipahami pengguna.
Minta pengguna meninjau hasil.
Ingatkan pengguna untuk commit dan push ke GitHub jika checkpoint disetujui.
Tunggu persetujuan sebelum melanjutkan ke tahap besar berikutnya.
Urutan tahap dapat disesuaikan jika ada ketergantungan teknis, tetapi perubahan harus dijelaskan dan disetujui pengguna.
16. Prinsip Pelaksanaan
Jangan mengimplementasikan semua fitur sekaligus.
Utamakan keamanan, konsistensi database, ketepatan aturan bisnis, pengujian, dan pemahaman pengguna. Jika ada aturan yang belum jelas atau bertentangan, hentikan bagian yang terdampak dan minta keputusan sebelum coding.

