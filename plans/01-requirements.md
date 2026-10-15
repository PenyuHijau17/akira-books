AKIRA BOOKS — REQUIREMENTS
1. Tujuan Proyek
Akira Books adalah website untuk membantu pengelolaan toko buku bacaan original dan bekas, mulai dari katalog, pesanan, pembayaran, jadwal pengambilan, hingga pencatatan transaksi.
Website mendukung kegiatan penjualan langsung di booth CFD yang beroperasi setiap Minggu pagi dan berakhir pukul 09.00.
Website bukan marketplace. Pengelolaan toko dilakukan oleh admin, sedangkan pelanggan dapat melihat katalog dan melakukan pemesanan melalui website.
2. Teknologi
Docker sebagai lingkungan aplikasi.
Next.js sebagai framework website.
TypeScript sebagai bahasa pemrograman.
Prisma sebagai ORM.
PostgreSQL sebagai database.
Project belum dibuat. Tahap saat ini masih berupa perencanaan kebutuhan dan aturan sistem.
3. Pengguna dan Hak Akses
3.1 Pengunjung
Melihat beranda, katalog, detail buku, dan informasi toko.
Mencari dan menyaring buku.
Harus masuk atau membuat akun sebelum melakukan pemesanan.
3.2 Pelanggan
Mengelola nama, kata sandi, dan nomor WhatsApp opsional.
Email tidak dapat diubah melalui pengaturan profil.
Memesan beberapa buku sekaligus.
Melihat pesanan aktif dan riwayat pesanan.
Mengunggah dan mengganti bukti pembayaran sesuai aturan.
Memilih atau mengajukan perubahan jadwal pengambilan.
Melihat notifikasi dan status pesanan.
Mengajukan pembatalan akun sesuai ketentuan.
Tidak dapat membatalkan sendiri pesanan yang pembayarannya sudah diverifikasi.
3.3 Admin Biasa
Mengelola buku, foto, kategori, harga jual, dan kondisi buku.
Mengelola pesanan dan jadwal pengambilan.
Memeriksa bukti pembayaran dan mengirim hasil pemeriksaan awal.
Mencatat penjualan langsung atau offline.
Menangani permintaan pelanggan sesuai hak akses.
Tidak dapat melihat atau mengubah modal buku.
Tidak dapat melihat laporan keuangan.
Tidak dapat menyetujui pembayaran pada tahap final.
Tidak dapat membatalkan pesanan yang sudah dibayar tanpa persetujuan admin utama.
3.4 Admin Utama
Memiliki kewenangan operasional admin.
Mengelola akun dan hak akses admin.
Melihat laporan penjualan dan keuangan.
Mengelola serta mengoreksi modal setiap eksemplar buku.
Menyetujui pembayaran pada tahap final.
Menyetujui pembatalan pesanan yang sudah dibayar.
Mengelola QRIS aktif.
Mengelola backup dan pemulihan data.
Melakukan koreksi data sensitif dengan alasan dan riwayat yang tercatat.
4. Katalog dan Pengelolaan Buku
Setiap eksemplar fisik memiliki data tersendiri, meskipun judulnya sama dengan buku lain. Setiap eksemplar memiliki stok 0 atau 1.
Data buku meliputi:
Kode atau ID unik.
Judul dan penulis.
Penerbit dan tahun terbit.
Satu atau beberapa kategori.
Foto buku.
Kondisi buku.
Deskripsi tambahan.
Harga jual.
Modal, yang hanya dapat dilihat dan dikelola admin utama.
Status ketersediaan dan riwayat perubahan.
Pilihan kondisi:
Baru.
Sangat Baik.
Baik.
Cukup.
Admin dapat menambahkan deskripsi kerusakan atau kelebihan buku secara opsional.
Kartu buku menampilkan foto, judul, penulis, harga, dan ketersediaan. Halaman detail menampilkan informasi buku yang lebih lengkap.
Pelanggan dapat mencari berdasarkan judul atau penulis serta menyaring berdasarkan kategori, kondisi, dan rentang harga.
Status buku meliputi:
Tersedia.
Sedang Dipesan.
Terjual.
Nonaktif.
Buku yang sedang dipesan tetap terlihat, tetapi tidak dapat dipesan pelanggan lain. Buku terjual dan nonaktif tidak ditampilkan sebagai buku tersedia.
Buku tanpa riwayat transaksi atau pesanan dapat dihapus permanen sesuai aturan sistem. Buku yang memiliki riwayat harus dinonaktifkan, bukan dihapus permanen.
Buku yang dibatalkan pesanannya hanya kembali tersedia jika masih aktif dan layak dijual.
Perubahan harga pada katalog tidak mengubah harga pesanan yang sudah dibuat. Data dan harga pada pesanan harus menyimpan snapshot agar riwayat transaksi tetap akurat.
5. Pemesanan
Pelanggan dapat memilih beberapa buku melalui keranjang.
Memasukkan buku ke keranjang belum memesan atau menahan stok. Stok baru ditahan ketika pelanggan menekan tombol Buat Pesanan.
Saat pesanan dibuat:
Server memeriksa ketersediaan buku.
Sistem mencegah dua pelanggan mendapatkan eksemplar terakhir yang sama.
Setiap buku yang berhasil dipesan ditahan untuk pesanan tersebut.
Informasi dan harga buku disimpan sebagai snapshot.
Status pembayaran awal adalah Menunggu Pembayaran.
Status jadwal awal adalah Menunggu Konfirmasi.
Sistem harus mencegah pesanan ganda akibat tombol diklik berulang atau permintaan yang dikirim ulang setelah koneksi bermasalah.
Jika pesanan sudah tersimpan tetapi konfirmasi gagal diterima pelanggan, pengulangan permintaan yang sama harus mengembalikan pesanan sebelumnya, bukan membuat pesanan baru.
Pelanggan boleh memiliki beberapa pesanan aktif sekaligus. Penggabungan jadwal pengambilan dapat diajukan kepada admin, tetapi setiap pesanan tetap memiliki status, pembayaran, dan riwayat masing-masing.
6. Pembayaran dan QRIS
Pembayaran dilakukan melalui QRIS di luar sistem. Pelanggan mengunggah tangkapan layar bukti pembayaran ke website.
QRIS aktif dikelola oleh admin utama. Ketika QRIS diganti, gambar lama disimpan dalam riwayat dan tidak lagi dianggap sebagai QRIS aktif. Pelanggan yang memiliki pesanan aktif diberi pemberitahuan agar tidak menggunakan gambar lama yang tersimpan di perangkatnya.
QRIS ditampilkan pada informasi toko ketika pelanggan memiliki pesanan yang menunggu pembayaran dan pada detail pesanan terkait.
Status bukti pembayaran:
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
Bukti pembayaran hanya dapat dilihat pelanggan pemilik pesanan dan admin yang berwenang.
Riwayat bukti disimpan. Bukti terbaru menjadi bukti aktif sesuai status pesanan.
Admin memeriksa bukti dan mengirim hasil pemeriksaan awal. Pembayaran baru dinyatakan Sudah Dibayar setelah persetujuan final admin utama.
Pemeriksa awal dan pemberi persetujuan final harus berbeda. Jika tidak tersedia admin utama lain, proses menunggu; sistem tidak boleh menyetujui pembayaran secara otomatis.
Jika bukti ditolak, admin wajib memberikan alasan dan tenggat penggantian. Pelanggan diberi notifikasi dan dapat mengunggah bukti baru. Bukti baru kembali berstatus Menunggu Verifikasi.
Satu pembayaran dapat digunakan untuk beberapa pesanan jika memang merupakan satu transfer yang mencakup semuanya. Hubungan antara pembayaran dan setiap pesanan harus tercatat.
7. Tenggat Pembayaran
Sistem memiliki tenggat pembayaran global dan tenggat khusus per pesanan. Perubahan tenggat global berlaku untuk pesanan baru, bukan mengubah tenggat pesanan lama secara otomatis.
Pelanggan dapat meminta perpanjangan tenggat melalui website atau WhatsApp. Semua admin yang berwenang dapat memutuskan permintaan tersebut.
Jika bukti belum diunggah sampai tenggat berakhir, sistem dapat membatalkan pesanan otomatis dengan alasan Batas waktu pembayaran terlewati, mencatat aktor System, waktu, dan riwayat, lalu memberi notifikasi kepada pelanggan.
Jika bukti berhasil diunggah sebelum tenggat tetapi belum selesai diperiksa, pesanan tidak boleh otomatis dibatalkan hanya karena pemeriksaan belum selesai. Admin utama harus mengambil keputusan.
Keberhasilan unggahan ditentukan berdasarkan waktu yang tercatat di server. Bukti yang baru diunggah setelah pesanan resmi dibatalkan tidak boleh mengaktifkan kembali pesanan tersebut.
Pengunggahan bukti dan pembatalan harus ditangani secara aman ketika keduanya terjadi hampir bersamaan.
8. Jadwal Pengambilan
Pengambilan dilakukan pada hari Minggu. Pelanggan memilih tanggal, bukan jam. Sistem memvalidasi bahwa tanggal yang dipilih adalah hari Minggu di masa mendatang.
Booth tutup pukul 09.00.
Status jadwal meliputi:
Menunggu Konfirmasi.
Disetujui.
Perlu Tanggal Baru.
Perubahan Jadwal Menunggu Persetujuan.
Admin dapat menyetujui atau menolak tanggal. Penolakan wajib disertai alasan, kemudian pelanggan memilih tanggal lain.
Admin juga dapat mengusulkan perubahan jadwal dengan alasan. Jadwal baru berlaku setelah pelanggan menyetujuinya.
Permintaan tanggal baru yang belum diputuskan mengirim pengingat kepada admin setiap dua jam. Jika tanggal sudah terlewati, pelanggan harus memilih tanggal lain.
Jika pelanggan tidak datang sebelum pukul 09.00, admin mendapat notifikasi dan menentukan apakah pesanan ditahan, dijadwalkan ulang, atau dibatalkan. Sistem tidak otomatis membatalkan hanya karena pelanggan tidak datang.
Jika pesanan ditahan, admin menetapkan tenggat baru dan alasan. Buku tetap ditahan sampai admin membatalkan pesanan secara resmi.
Pesanan baru berstatus Selesai setelah buku benar-benar diserahkan dan admin menekan tombol Selesai.
9. Pembatalan dan Pengembalian Dana
Pelanggan dapat membatalkan pesanan yang belum dibayar sesuai aturan. Alasan pembatalan dari pelanggan bersifat opsional dan harus melalui konfirmasi.
Admin yang berwenang dapat membatalkan pesanan belum dibayar dengan alasan wajib.
Pesanan yang sudah dibayar hanya dapat dibatalkan melalui persetujuan admin utama. Jika admin utama yang mengusulkan sekaligus menyetujui karena tidak ada admin utama lain, pengecualian dan alasannya harus dicatat.
Pembatalan pesanan yang sudah dibayar tidak otomatis berarti uang telah dikembalikan. Pelanggan harus menghubungi admin untuk membahas pengembalian dana.
Status pengembalian dana:
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
Setiap pengembalian dana mencatat jumlah, waktu, admin yang mencatat, dan riwayat transaksi. Pengembalian sebagian atau beberapa kali harus tetap dapat ditelusuri.
Pesanan yang dibatalkan bersifat final dan tidak dapat diaktifkan kembali. Pelanggan dapat membuat pesanan baru jika buku tersedia.
10. Penjualan Offline
Admin dapat mencatat penjualan buku yang terjadi langsung di booth tanpa melalui alur pesanan online atau unggahan bukti pembayaran.
Catatan penjualan offline meliputi buku, harga jual aktual, modal sesuai kewenangan, laba, waktu, admin pencatat, dan jenis transaksi Offline.
Harga jual offline dapat berbeda dari harga katalog.
Koreksi harga penjualan offline dapat diajukan oleh admin dengan alasan wajib dan memerlukan persetujuan admin utama. Nilai lama tetap berlaku sampai koreksi disetujui. Nilai lama, nilai baru, alasan, pengusul, penyetuju, dan waktu harus tercatat.
11. Laporan Keuangan
Laporan hanya dapat diakses admin utama.
Laporan MVP mencakup:
Penjualan harian, bulanan, dan tahunan.
Total pembayaran yang diterima dan diverifikasi.
Jumlah buku yang terjual.
Riwayat transaksi.
Laba kotor dari penjualan yang selesai.
Pemisahan transaksi online dan offline.
Riwayat pembatalan dan pengembalian dana.
Pembayaran yang telah diverifikasi tetapi bukunya belum diserahkan masuk ke catatan pembayaran diterima, bukan penjualan selesai.
Penjualan dan laba terealisasi dicatat setelah buku diserahkan dan pesanan ditandai Selesai, atau setelah penjualan offline dicatat sebagai transaksi selesai.
Laba kotor dihitung dari harga jual aktual dikurangi modal.
Jika modal dikoreksi setelah transaksi, sistem harus mempertahankan laba historis pada saat transaksi dan menyediakan perhitungan laba berdasarkan modal terbaru. Kedua nilai hanya dapat diakses admin utama.
Koreksi modal wajib memiliki alasan dan menyimpan nilai lama, nilai baru, waktu, admin yang melakukan koreksi, serta riwayat perubahan.
Ekspor Excel dan laporan buku terlaris tidak termasuk kebutuhan MVP.
12. Notifikasi
Notifikasi website menjadi prioritas awal. Integrasi otomatis WhatsApp direncanakan setelah fitur inti stabil.
Notifikasi mencakup pesanan baru, pembayaran, bukti pembayaran, keputusan jadwal, perubahan tenggat, pembatalan, pelanggan yang tidak datang, dan tindakan penting lainnya.
Setiap notifikasi mencatat penerima, isi, waktu, status dibaca, serta riwayat yang diperlukan.
Notifikasi yang gagal dikirim harus disimpan dan dicoba kembali dengan jeda yang makin panjang. Jika terus gagal, sistem menandainya gagal dan memberikan peringatan kepada admin.
Percobaan ulang tidak boleh membuat notifikasi duplikat atau membuat ulang pesanan. Admin tetap dapat melihat daftar pesanan melalui dashboard.
Notifikasi sejenis boleh dikelompokkan agar ringkas, tetapi setiap kejadian dan riwayatnya tetap tersedia. Jumlah notifikasi belum dibaca harus akurat.
Jika beberapa admin menangani pesanan yang sama, sistem menampilkan siapa yang sedang menangani pesanan. Admin lain tetap dapat melihat detail, tetapi perubahan yang bertentangan harus dicegah.
Penanda penanganan berlaku sementara dan kedaluwarsa otomatis jika admin tidak aktif. Kedaluwarsa penanda tidak mengubah status pesanan atau membatalkan tindakan yang sudah tersimpan.
13. Keamanan dan Akun
Login admin menggunakan email dan kata sandi. OTP digunakan untuk tindakan sensitif, bukan setiap kali login.
Pemulihan admin utama menggunakan email dan kode pemulihan yang disimpan secara aman, bukan teks biasa di database.
Sistem menerapkan pembatasan percobaan login, pengelolaan sesi, validasi server, dan pemeriksaan hak akses untuk setiap tindakan sensitif.
Pelanggan dapat meminta penghapusan akun. Jika masih ada pesanan aktif atau kewajiban yang belum selesai, penghapusan ditunda. Pelanggan tetap dapat masuk dan mengelola pesanan selama penundaan serta dapat membatalkan permintaan penghapusan sebelum proses final.
Admin dapat menonaktifkan akun pelanggan dengan alasan dan riwayat. Penonaktifan sementara harus memiliki aturan kedaluwarsa atau perubahan status yang jelas.
Penonaktifan admin mencabut akses login dan sesi aktif. Riwayat tindakan admin tetap dipertahankan.
14. Koreksi dan Audit Riwayat
Perubahan sensitif harus mencatat pelaku, waktu, nilai sebelum dan sesudah, serta alasan jika diwajibkan.
Koreksi status pesanan yang sudah selesai hanya boleh mengembalikan status ke status sebelumnya yang tercatat, disertai alasan dan riwayat.
Koreksi data tidak otomatis mengubah status pesanan, menganggap pembayaran sudah dikembalikan, atau mengaktifkan kembali pesanan yang dibatalkan.
Tindakan yang dicoba ulang setelah gangguan koneksi harus mencegah pencatatan ganda dan mengembalikan hasil yang sudah tersimpan jika permintaannya sama.
15. Backup dan Pemulihan
Sistem menyediakan backup otomatis dan manual yang dikelola admin utama.
Backup harus disimpan terpisah dari database utama dan diamankan. Backup mencakup database serta file seperti foto buku, gambar QRIS, dan bukti pembayaran.
Proses pemulihan harus diuji agar backup benar-benar dapat digunakan ketika terjadi kehilangan atau kerusakan data.
16. Tampilan dan Pengalaman Pengguna
Seluruh antarmuka menggunakan Bahasa Indonesia.
Gaya visual hangat dan klasik dengan warna krem dan cokelat, memberi kesan toko buku yang nyaman.
Website harus responsif dan dapat digunakan melalui browser HP maupun komputer.
Beranda memuat pengenalan singkat Akira Books, buku terbaru, dan akses yang jelas ke katalog.
Prioritas MVP adalah website yang aman, konsisten, dan dapat digunakan untuk mengelola kegiatan toko sebelum menambahkan integrasi eksternal yang lebih kompleks.
17. Prinsip Implementasi
Dokumen kebutuhan dan aturan bisnis menjadi acuan implementasi.
OpenCode harus membaca dan menganalisis dokumen sebelum membuat kode.
Rancangan arsitektur, database, dan alur teknis harus ditinjau sebelum implementasi fitur.
Fitur dikembangkan bertahap dan diuji setelah setiap tahap.
Perubahan kebutuhan harus dicatat dalam dokumentasi.
Keamanan dan konsistensi transaksi harus ditegakkan di server dan database, bukan hanya di antarmuka.
Setiap checkpoint GitHub menjadi titik untuk menyimpan pekerjaan dan meninjau kembali perubahan sebelum melanjutkan.

