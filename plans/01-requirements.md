AKIRA BOOKS — REQUIREMENTS
1. Tujuan Proyek
Akira Books adalah website untuk membantu pengelolaan toko buku bacaan original dan bekas, mulai dari katalog, pesanan, pembayaran, jadwal pengambilan, hingga pencatatan transaksi.
Website mendukung kegiatan penjualan langsung di booth CFD yang beroperasi setiap Minggu pagi dan berakhir pukul 09.00.
Website bukan marketplace. Pengelolaan toko dilakukan oleh admin, sedangkan pelanggan dapat melihat katalog dan melakukan pemesanan melalui website.
Admin utama dapat menutup dan membuka toko secara manual untuk keadaan toko libur. Saat toko tutup, pelanggan tetap dapat melihat katalog tetapi tidak dapat membuat pesanan baru.
2. Teknologi
Docker sebagai lingkungan aplikasi.
Next.js sebagai framework website.
TypeScript sebagai bahasa pemrograman.
Prisma sebagai ORM.
PostgreSQL sebagai database.
Fondasi project Next.js, Prisma, dan Docker sudah tersedia; fitur bisnis belum diimplementasikan sepenuhnya.
3. Pengguna dan Hak Akses
3.1 Pengunjung
Melihat beranda, katalog, detail buku, dan informasi toko.
Mencari dan menyaring buku.
Harus masuk atau membuat akun sebelum melakukan pemesanan.
3.2 Pelanggan
Mengelola nama, kata sandi, dan nomor WhatsApp opsional.
Email tidak dapat diubah melalui pengaturan profil.
Memulihkan kata sandi melalui tautan yang dikirim ke email terdaftar.
Memesan beberapa buku sekaligus.
Melihat pesanan aktif dan riwayat pesanan.
Mengunggah dan mengganti bukti pembayaran sesuai aturan.
Memilih atau mengajukan perubahan jadwal pengambilan.
Mengajukan perubahan jadwal pengambilan berkali-kali dan membatalkan permintaan perubahan yang masih menunggu keputusan.
Melihat notifikasi dan status pesanan.
Mengajukan pembatalan akun sesuai ketentuan.
Tidak dapat membatalkan sendiri pesanan yang pembayarannya sudah diverifikasi.
Ketika toko tutup, pelanggan tetap dapat mendaftar, masuk, melihat katalog, mengelola akun, dan menambah buku ke keranjang, tetapi tidak dapat membuat pesanan baru.
Pelanggan hanya melihat status dan alasan penutupan yang sedang berlaku, bukan riwayat historis.
3.3 Admin Biasa
Mengelola buku, foto, kategori, harga jual, dan kondisi buku.
Mengubah harga jual atau kondisi buku meskipun masih ada pesanan aktif. Pesanan yang sudah dibuat tetap memakai snapshot harga dan kondisi saat pesanan dibuat.
Mengelola pesanan dan jadwal pengambilan.
Memeriksa bukti pembayaran dan mengirim hasil pemeriksaan awal.
Mencatat penjualan langsung atau offline.
Menangani permintaan pelanggan sesuai hak akses.
Melihat status toko dan riwayat penutupan toko.
Dashboard admin biasa menampilkan status toko tanpa kontrol untuk mengubahnya.
Tidak dapat menutup toko, membuka toko, atau mengubah alasan penutupan.
Tidak dapat melihat atau mengubah modal buku, laba, atau perhitungan keuntungan.
Tidak dapat melihat laporan keuangan.
Tidak dapat melihat audit administratif.
Tidak dapat mengelola akun admin.
Tidak dapat menyetujui pembayaran pada tahap final.
Tidak dapat menyetujui pengembalian dana.
Tidak dapat menggabungkan data buku duplikat.
Dapat membatalkan pesanan yang belum dibayar dengan alasan wajib, audit wajib, dan notifikasi kepada Admin Utama.
Dapat membatalkan pesanan yang sudah dibayar tetapi belum memperoleh persetujuan akhir Admin Utama, dengan alasan wajib, audit wajib, dan notifikasi kepada Admin Utama.
Setelah pembayaran memperoleh persetujuan akhir Admin Utama, pembatalan pesanan hanya dapat ditangani Admin Utama.
3.4 Admin Utama
Admin Utama adalah pemilik toko dan memiliki kewenangan operasional admin.
Dalam kondisi khusus ketika hanya ada satu Admin Utama, Admin Utama tersebut boleh menyelesaikan persetujuan yang biasanya memerlukan pemisahan tugas atau admin lain. Proses wajib menyertakan alasan dan dicatat dalam audit administratif.
Hanya Admin Utama yang dapat melihat audit administratif.
Mengelola akun dan hak akses admin.
Dapat menonaktifkan akun admin sampai diaktifkan kembali secara manual dan dapat menghapus akun admin secara permanen. Riwayat tindakan dan transaksi sebelumnya tetap tersimpan dan dapat ditelusuri.
Melihat laporan penjualan dan keuangan.
Mengelola serta mengoreksi modal setiap eksemplar buku dengan alasan dan riwayat nilai sebelumnya.
Melihat perhitungan ulang keuntungan berdasarkan modal terbaru sebagai pembanding, tanpa menimpa keuntungan historis.
Menyetujui pembayaran pada tahap final.
Menyetujui pembatalan pesanan yang sudah dibayar setelah persetujuan akhir pembayaran.
Menyetujui pengembalian dana.
Mengelola QRIS aktif dan mengubah tenggat pembayaran global untuk pesanan baru.
Menggabungkan data buku duplikat dengan tetap mempertahankan keterhubungan riwayat pesanan dan transaksi.
Mengelola backup dan pemulihan data.
Melakukan koreksi data sensitif dengan alasan dan riwayat yang tercatat.
Menutup dan membuka toko secara manual beserta alasan penutupan.
Menghapus riwayat penutupan toko yang lama atau sudah tidak aktif, baik satu catatan maupun seluruh riwayat, dengan audit administratif terpisah.
Memulihkan akun menggunakan email pemulihan dan kode pemulihan cadangan yang disimpan dengan aman.
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
Admin boleh mengubah harga jual atau kondisi buku meskipun masih ada pesanan aktif. Pesanan yang sudah dibuat tetap menggunakan snapshot harga dan kondisi pada saat pesanan dibuat; perubahan katalog tidak mengubah pesanan lama.
Hanya Admin Utama yang boleh menggabungkan data buku duplikat. Penggabungan wajib mempertahankan keterhubungan seluruh riwayat pesanan dan transaksi yang terdampak.
Setiap perubahan atau koreksi modal oleh Admin Utama wajib disertai alasan dan mempertahankan riwayat nilai modal sebelumnya.
Informasi modal dan keuntungan hanya dapat diakses Admin Utama. Respons API, DTO, laporan, atau tampilan yang ditujukan kepada Admin biasa tidak boleh memuat informasi tersebut.
Ketika toko tutup, katalog tetap dapat dilihat pelanggan dan perubahan katalog langsung terlihat oleh pelanggan meskipun toko masih tutup.
5. Pemesanan
Pelanggan dapat memilih beberapa buku melalui keranjang.
Memasukkan buku ke keranjang belum memesan atau menahan stok. Stok baru ditahan ketika pelanggan menekan tombol Buat Pesanan.
Saat pesanan dibuat:
Server memeriksa ketersediaan buku.
Sistem mencegah dua pelanggan mendapatkan eksemplar terakhir yang sama.
Setiap buku yang berhasil dipesan ditahan untuk pesanan tersebut.
Informasi buku, harga, kondisi, dan tenggat pembayaran disimpan sebagai snapshot pada saat pesanan dibuat.
Status pesanan utama awal adalah Menunggu Pembayaran.
Status jadwal awal adalah Menunggu Konfirmasi.
Status pesanan utama terpisah dari status bukti pembayaran, status jadwal pengambilan, dan status pengembalian dana.
Alur status pesanan utama: Menunggu Pembayaran → Sudah Dibayar → Menunggu Diambil → Selesai. Dibatalkan merupakan status akhir.
Setelah pembayaran memperoleh persetujuan final, status pesanan menjadi Sudah Dibayar. Status tetap Sudah Dibayar sampai admin mengonfirmasi jadwal pengambilan; setelah jadwal dikonfirmasi, status menjadi Menunggu Diambil. Setelah buku benar-benar diserahkan, status menjadi Selesai.
Menunggu Konfirmasi hanya digunakan sebagai status jadwal, bukan status pesanan utama.
Sistem harus mencegah pesanan ganda akibat tombol diklik berulang atau permintaan yang dikirim ulang setelah koneksi bermasalah.
Jika pesanan sudah tersimpan tetapi konfirmasi gagal diterima pelanggan, pengulangan permintaan yang sama harus mengembalikan pesanan sebelumnya, bukan membuat pesanan baru.
Pelanggan boleh memiliki beberapa pesanan aktif sekaligus. Penggabungan jadwal pengambilan dapat diajukan kepada admin, tetapi setiap pesanan tetap memiliki status, pembayaran, dan riwayat masing-masing.
Ketika pelanggan menekan tombol Buat Pesanan, server memeriksa status toko. Jika toko tutup, pesanan ditolak dan pelanggan diberi pemberitahuan.
Jika status toko tidak dapat dipastikan, checkout diblokir sementara sampai status terkonfirmasi. Server tetap menolak pembuatan pesanan meskipun toko ditutup saat pelanggan sedang membuka halaman checkout.
Buku di keranjang tidak otomatis terhapus ketika stok habis, harga berubah, atau buku dinonaktifkan. Stok, harga, dan status buku diperiksa ulang saat pembuatan pesanan, dan pelanggan diberi tahu jika ada perubahan yang menghalangi pemesanan.
Keranjang dipertahankan ketika pesanan ditolak.
Jika buku terjual secara offline, buku tersebut harus dihapus dari keranjang pelanggan yang terdampak dan pelanggan diberi tahu. Jika keranjang masih berisi buku lain, pelanggan wajib memeriksa dan menyetujui kembali keranjang sebelum melanjutkan pesanan. Persetujuan ulang dicatat sebagai snapshot keranjang yang disetujui.
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
Admin biasa memeriksa bukti dan mengirim hasil pemeriksaan awal. Setelah disetujui Admin Utama, status bukti menjadi Terverifikasi dan status pesanan utama menjadi Sudah Dibayar.
Pemeriksa awal dan pemberi persetujuan final sedapat mungkin berbeda. Dalam kondisi khusus ketika hanya ada satu Admin Utama, Admin Utama tersebut boleh menyelesaikan persetujuan final dengan alasan wajib dan catatan audit. Sistem tidak boleh menyetujui pembayaran secara otomatis.
Jika bukti ditolak, admin wajib memberikan alasan dan tenggat penggantian. Pelanggan diberi notifikasi dan dapat mengunggah bukti baru. Bukti baru kembali berstatus Menunggu Verifikasi. Bukti lama tetap tersimpan dan bukti terbaru menjadi bukti aktif.
Pelanggan yang mengunggah bukti tepat waktu tetap dianggap tepat waktu meskipun admin terlambat memeriksa. Pesanan tidak boleh dibatalkan hanya karena pemeriksaan belum selesai.
Satu pembayaran dapat digunakan untuk beberapa pesanan jika memang merupakan satu transfer yang mencakup semuanya. Hubungan antara pembayaran dan setiap pesanan harus tercatat.
Metode pembayaran yang tersedia adalah QRIS dan pembayaran langsung saat pelanggan datang ke booth CFD.
Pesanan dengan metode pembayaran langsung tidak memakai tenggat QRIS. Pesanan tersebut mengikuti batas waktu pengambilan yang disetujui admin. Jika batas tersebut terlewat, admin memutuskan apakah reservasi diperpanjang atau pesanan dibatalkan.
Pembayaran langsung di CFD boleh dicatat oleh Admin biasa tanpa persetujuan akhir Admin Utama karena uang diterima langsung di hadapan admin. Ini adalah pengecualian alur persetujuan pembayaran, bukan alasan untuk menghilangkan status pesanan utama.
Pada pembayaran langsung, admin mencatat pembayaran dan penyerahan buku sebagai kejadian yang tercatat. Status pesanan tetap mengikuti alur utama. Jika pembayaran dan penyerahan terjadi pada waktu yang sama, sistem boleh mencatat transisi Menunggu Pembayaran → Sudah Dibayar → Menunggu Diambil → Selesai dalam satu operasi atomik dengan riwayat setiap kejadian. Buku tidak dianggap diserahkan sebelum admin mengonfirmasi penyerahan.
Pelanggan boleh mengajukan perubahan metode pembayaran setelah pesanan dibuat. Admin biasa boleh menyetujui atau menolak permintaan tersebut, dan seluruh perubahan dicatat.
Setelah pembayaran disetujui, perubahan metode pembayaran biasa tidak diperbolehkan. Koreksi metode pembayaran setelah pembayaran disetujui hanya dapat dilakukan oleh Admin Utama dengan alasan wajib dan catatan audit.
Koreksi catatan pembayaran yang telah disetujui hanya boleh dilakukan Admin Utama, wajib memiliki alasan, dan harus mempertahankan persetujuan serta riwayat awal. Jumlah uang pada pembayaran yang sudah disetujui tidak boleh diubah melalui proses koreksi.
7. Tenggat Pembayaran
Sistem memiliki tenggat pembayaran global dan tenggat khusus per pesanan. Hanya Admin Utama yang boleh mengubah tenggat global. Perubahan tenggat global hanya berlaku untuk pesanan baru, bukan mengubah tenggat pesanan lama. Pesanan yang sudah dibuat memakai snapshot tenggat yang tersimpan saat pesanan dibuat. Perubahan tenggat global tidak memerlukan catatan perubahan khusus.
Tenggat pembayaran QRIS adalah 24 jam sejak pesanan dibuat.
Pelanggan dapat meminta perpanjangan tenggat melalui website atau WhatsApp. Admin biasa boleh menyetujui atau menolak permintaan perpanjangan, termasuk yang disampaikan melalui WhatsApp. Permintaan, alasan, keputusan, dan tenggat baru wajib dicatat di website.
Jika bukti belum diunggah sampai tenggat berakhir, sistem membatalkan pesanan otomatis dengan alasan Batas waktu pembayaran terlewati, mencatat aktor System, waktu, dan riwayat, lalu memberi notifikasi kepada pelanggan.
Tenggat QRIS dijeda selama permintaan perubahan metode pembayaran menunggu persetujuan admin. Jika permintaan ditolak, hitung mundur dilanjutkan dari sisa waktu yang tersimpan, bukan dimulai kembali dari nol.
Jika bukti berhasil diunggah sebelum tenggat tetapi belum selesai diperiksa, pelanggan tetap dianggap mengunggah tepat waktu. Pesanan tidak boleh dibatalkan hanya karena pemeriksaan belum selesai. Admin Utama menyelesaikan persetujuan atau penolakan bukti; penolakan wajib disertai alasan.
Sistem mengingatkan admin setiap 2 jam selama bukti yang diunggah tepat waktu masih menunggu pemeriksaan. Pengingat harus bertahan setelah server restart dan tidak boleh terkirim berulang kali secara tidak sengaja. Rancangan teknis yang disarankan adalah jadwal persisten di database, mekanisme retry, dan kunci idempotensi untuk mencegah duplikasi.
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
Status jadwal terpisah dari status pesanan utama.
Setelah pembayaran memperoleh persetujuan final, status pesanan tetap Sudah Dibayar sampai admin mengonfirmasi jadwal pengambilan. Setelah jadwal dikonfirmasi, status pesanan menjadi Menunggu Diambil. Setelah buku benar-benar diserahkan, status menjadi Selesai.
Admin dapat menyetujui atau menolak tanggal. Penolakan wajib disertai alasan, kemudian pelanggan memilih tanggal lain.
Admin juga dapat mengusulkan perubahan jadwal dengan alasan. Jadwal baru berlaku setelah pelanggan menyetujuinya.
Pelanggan boleh menolak usulan jadwal dari admin dengan alasan, kemudian mengajukan tanggal baru.
Pelanggan boleh mengajukan perubahan jadwal berkali-kali dan boleh membatalkan permintaan perubahan yang masih menunggu keputusan.
Jika tanggal terlewati sebelum keputusan dibuat, pelanggan harus memilih tanggal baru.
Jika pelanggan tidak datang sebelum pukul 09.00, admin mendapat notifikasi dan menentukan apakah pesanan ditunggu, dijadwalkan ulang, atau dibatalkan. Pembatalan wajib disertai alasan. Sistem tidak otomatis membatalkan hanya karena pelanggan tidak datang.
Jika pesanan ditunggu, admin menetapkan tenggat baru dan alasan. Buku tetap direservasi sampai pembatalan resmi dilakukan.
Pesanan baru berstatus Selesai setelah buku benar-benar diserahkan dan admin menekan tombol Selesai.
9. Pembatalan dan Pengembalian Dana
Pelanggan dapat membatalkan pesanan yang belum dibayar sesuai aturan. Alasan pembatalan dari pelanggan bersifat opsional dan harus melalui konfirmasi.
Admin biasa boleh membatalkan pesanan yang belum dibayar. Alasan pembatalan wajib dicatat, tindakan dicatat dalam audit administratif, dan Admin Utama harus diberi notifikasi.
Admin biasa boleh membatalkan pesanan yang sudah dibayar tetapi belum memperoleh persetujuan akhir Admin Utama. Alasan wajib, audit wajib, dan Admin Utama harus diberi notifikasi.
Setelah pembayaran memperoleh persetujuan akhir Admin Utama, pembatalan pesanan hanya boleh ditangani Admin Utama. Jika hanya ada satu Admin Utama dan ia mengusulkan sekaligus menyetujui, alasan dan pengecualian dicatat dalam audit administratif.
Pengembalian dana adalah proses terpisah. Pembatalan tidak otomatis berarti uang telah dikembalikan. Hanya Admin Utama yang boleh menyetujui pengembalian dana.
Pesanan selesai yang bukunya sudah diserahkan tidak boleh dibatalkan seperti pesanan biasa. Koreksi catatan hanya boleh dilakukan Admin Utama dengan alasan dan riwayat perubahan. Koreksi data tidak otomatis mengaktifkan kembali pesanan atau menandakan bahwa dana sudah dikembalikan.
Status pengembalian dana:
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
Setiap pengembalian dana mencatat jumlah, waktu, admin yang mencatat, dan riwayat transaksi. Pengembalian sebagian atau beberapa kali harus tetap dapat ditelusuri.
Pesanan yang dibatalkan bersifat final dan tidak dapat diaktifkan kembali. Pelanggan dapat membuat pesanan baru jika buku tersedia.
10. Penjualan Offline
Admin dapat mencatat penjualan buku yang terjadi langsung di booth tanpa melalui alur pesanan online atau unggahan bukti pembayaran.
Catatan penjualan offline meliputi buku, harga jual aktual, waktu, admin pencatat, dan jenis transaksi Offline. Nilai modal dan laba dihitung dari data buku dan hanya dapat dilihat Admin Utama.
Harga jual offline dapat berbeda dari harga katalog.
Koreksi transaksi penjualan offline yang sudah selesai hanya dapat dilakukan Admin Utama dengan alasan wajib. Nilai lama, nilai baru, waktu, pelaku, dan riwayat perubahan harus tercatat.
Setiap perubahan atau koreksi transaksi yang sudah selesai wajib memiliki alasan dan riwayat perubahan.
Modal dan laba hanya dapat dilihat Admin Utama. Respons untuk Admin biasa tidak boleh memuat modal atau laba.
11. Laporan Keuangan
Laporan hanya dapat diakses Admin Utama.
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
Jika modal dikoreksi setelah transaksi, sistem harus mempertahankan laba historis pada saat transaksi dan menyediakan perhitungan laba berdasarkan modal terbaru sebagai pembanding, tanpa menimpa laba historis. Kedua nilai hanya dapat diakses Admin Utama.
Koreksi modal wajib memiliki alasan dan menyimpan nilai lama, nilai baru, waktu, admin yang melakukan koreksi, serta riwayat perubahan.
Hanya Admin Utama yang boleh menggabungkan data buku duplikat. Penggabungan wajib mempertahankan keterhubungan seluruh riwayat pesanan dan transaksi yang terdampak.
Ekspor Excel dan laporan buku terlaris tidak termasuk kebutuhan MVP.
12. Notifikasi
Notifikasi website menjadi prioritas awal. Integrasi otomatis WhatsApp bukan bagian MVP. Permintaan melalui WhatsApp ditangani secara manual dan dicatat di website.
Notifikasi mencakup pesanan baru, pembayaran, bukti pembayaran, keputusan jadwal, perubahan tenggat, pembatalan, pelanggan yang tidak datang, dan tindakan penting lainnya.
Sistem mengingatkan admin setiap 2 jam selama bukti yang diunggah tepat waktu masih menunggu pemeriksaan. Pengingat harus bertahan setelah server restart dan tidak boleh terkirim berulang kali secara tidak sengaja.
Setiap notifikasi mencatat penerima, isi, waktu, status dibaca, serta riwayat yang diperlukan.
Notifikasi yang gagal dikirim harus disimpan dan dicoba kembali dengan jeda yang makin panjang. Jika terus gagal, sistem menandainya gagal dan memberikan peringatan kepada admin.
Percobaan ulang tidak boleh membuat notifikasi duplikat atau membuat ulang pesanan. Admin tetap dapat melihat daftar pesanan melalui dashboard.
Notifikasi sejenis boleh dikelompokkan agar ringkas, tetapi setiap kejadian dan riwayatnya tetap tersedia. Jumlah notifikasi belum dibaca harus akurat.
Jika beberapa admin menangani pesanan yang sama, sistem menampilkan siapa yang sedang menangani pesanan. Admin lain tetap dapat melihat detail, tetapi perubahan yang bertentangan harus dicegah.
Penanda penanganan berlaku sementara dan kedaluwarsa otomatis jika admin tidak aktif. Kedaluwarsa penanda tidak mengubah status pesanan atau membatalkan tindakan yang sudah tersimpan.
13. Keamanan dan Akun
Login admin menggunakan email dan kata sandi. OTP digunakan untuk tindakan sensitif tertentu, bukan setiap kali login. Menutup dan membuka toko cukup menggunakan konfirmasi biasa dan tidak termasuk tindakan yang wajib memakai verifikasi ulang.
Tindakan sensitif tertentu memerlukan verifikasi ulang menggunakan kata sandi atau OTP. Percobaan kata sandi atau OTP yang gagal berulang harus memicu pembatasan sementara.
Pemulihan Admin Utama menggunakan email pemulihan dan kode pemulihan cadangan yang disimpan dengan aman, bukan teks biasa di database.
Pemulihan kata sandi pelanggan menggunakan tautan yang dikirim melalui email terdaftar.
Sistem menerapkan pembatasan percobaan login, pembatasan percobaan OTP, pengelolaan sesi, validasi server, dan pemeriksaan hak akses untuk setiap tindakan sensitif.
Pelanggan dapat meminta penghapusan akun. Jika masih ada pesanan aktif atau kewajiban yang belum selesai, penghapusan ditunda. Pelanggan tetap dapat masuk dan mengelola pesanan selama penundaan serta dapat membatalkan permintaan penghapusan sebelum proses final. Catatan transaksi yang wajib dipertahankan tidak ikut terhapus.
Admin dapat menonaktifkan akun pelanggan dengan alasan dan riwayat. Penonaktifan sementara harus memiliki aturan kedaluwarsa atau perubahan status yang jelas.
Akun admin dapat dinonaktifkan sampai diaktifkan kembali secara manual. Admin Utama juga boleh menghapus akun admin secara permanen. Penonaktifan atau penghapusan akun admin tidak menghilangkan riwayat tindakan maupun transaksi sebelumnya; riwayat tetap dapat ditelusuri. Penonaktifan admin mencabut akses login dan sesi aktif. Admin Utama adalah pemilik toko dan pengecualian satu Admin Utama berlaku sesuai aturan.
14. Koreksi dan Audit Riwayat
Perubahan sensitif harus mencatat pelaku, waktu, nilai sebelum dan sesudah, serta alasan jika diwajibkan.
Audit administratif bersifat append-only; aplikasi tidak menyediakan fungsi untuk mengubah atau menghapus catatan yang telah tercatat. Hanya Admin Utama yang dapat melihat audit administratif.
Riwayat Toko Libur yang lama atau tidak aktif dapat dihapus oleh Admin Utama sesuai aturan; audit administratif dicatat terpisah dan tidak ikut terhapus.
Koreksi status pesanan yang sudah selesai hanya boleh mengembalikan status ke status sebelumnya yang tercatat, hanya oleh Admin Utama, disertai alasan dan riwayat.
Koreksi catatan pembayaran yang telah disetujui hanya boleh dilakukan Admin Utama, wajib alasan, mempertahankan persetujuan dan riwayat awal; jumlah uang tidak boleh diubah.
Koreksi data tidak otomatis mengubah status pesanan, menganggap pembayaran sudah dikembalikan, atau mengaktifkan kembali pesanan yang dibatalkan.
Tindakan yang dicoba ulang setelah gangguan koneksi harus mencegah pencatatan ganda dan mengembalikan hasil yang sudah tersimpan jika permintaannya sama. Perubahan atau koreksi transaksi yang sudah selesai wajib memiliki alasan dan riwayat perubahan.
15. Backup dan Pemulihan
Sistem menyediakan backup otomatis harian dan backup manual yang dapat dijalankan saat diperlukan oleh Admin Utama.
Backup disimpan selama 30 hari.
Backup dienkripsi menggunakan age. Salinan backup disimpan di lokasi penyimpanan terpisah dari server utama; nama penyedia atau layanan penyimpanan belum ditetapkan.
Kunci pembuka backup disimpan terpisah secara aman oleh pemilik toko, bukan di repositori dan bukan bersama file backup. Prosedur pengamanan kunci dan pemulihan harus didokumentasikan.
Backup harus disimpan terpisah dari database utama dan diamankan. Backup mencakup database serta file penting seperti foto buku, gambar QRIS, dan bukti pembayaran.
Proses pemulihan harus diuji sebelum operasional dan secara berkala agar backup benar-benar dapat digunakan ketika terjadi kehilangan atau kerusakan data.
16. Tampilan dan Pengalaman Pengguna
Seluruh antarmuka menggunakan Bahasa Indonesia.
Gaya visual hangat dan klasik dengan warna krem dan cokelat, memberi kesan toko buku yang nyaman.
Website harus responsif dan dapat digunakan melalui browser HP, tablet, dan komputer.
Tidak ada aplikasi Android terpisah pada MVP.
Beranda memuat pengenalan singkat Akira Books, buku terbaru, dan akses yang jelas ke katalog.
Prioritas MVP adalah website yang aman, konsisten, dan dapat digunakan untuk mengelola kegiatan toko sebelum menambahkan integrasi eksternal yang lebih kompleks.
Halaman checkout menampilkan pemberitahuan dan memblokir checkout ketika toko diketahui tutup. Jika status toko tidak dapat dipastikan, checkout tetap diblokir sementara dengan pesan yang sesuai.
17. Status Toko dan Toko Libur
Toko Libur berarti pemesanan online dihentikan, bukan operasional fisik toko. Admin tetap dapat berjualan di booth seperti biasa.
17.1 Status dan Operasional Toko
Status toko diubah secara manual oleh admin utama. Tidak ada penutupan atau pembukaan otomatis berdasarkan jadwal.
Status toko disimpan di server dan berlaku sama di seluruh perangkat dan browser.
Status toko disegarkan secara berkala melalui polling setiap 5 detik pada halaman yang memerlukan status toko terkini. Mekanisme streaming seperti SSE atau WebSocket tidak dipakai karena perubahan status toko relatif jarang. Interval polling dan pilihan transport ini merupakan rekomendasi teknis, bukan aturan bisnis.
Polling dijeda ketika tab browser tidak aktif dan dilanjutkan kembali ketika tab aktif. Polling tidak diulang selama tab tidak aktif.
Polling diterapkan pada halaman toko, katalog pelanggan, dan checkout pelanggan. Polling tidak diperlukan pada halaman login pelanggan maupun halaman akun yang tidak memerlukan status toko secara langsung.
Ketika toko tutup, pelanggan tetap dapat mendaftar, masuk, mengelola akun, melihat katalog, dan mengisi keranjang.
Pelanggan tidak dapat membuat pesanan online ketika toko tutup.
Keranjang tidak mengunci stok dan tidak dihapus otomatis saat toko tutup.
Status toko, ketersediaan buku, stok, dan harga diperiksa kembali di server saat pelanggan mengirim pesanan.
Jika toko tutup atau buku tidak tersedia saat pengiriman pesanan, pesanan ditolak dengan pemberitahuan yang sesuai dan keranjang dipertahankan.
Jika status toko tidak dapat dipastikan, checkout diblokir sementara sampai status terkonfirmasi.
Jika admin utama menutup toko saat pelanggan sedang membuka checkout, server tetap menolak pembuatan pesanan.
Perubahan katalog, harga, dan stok langsung terlihat oleh pelanggan, termasuk saat toko tutup.
Admin tetap boleh mengelola katalog dan mencatat penjualan offline ketika toko tutup.
Penjualan offline yang mengurangi stok harus menghapus buku yang terjual dari keranjang pelanggan yang terdampak dan pelanggan diberi tahu. Jika keranjang masih berisi buku lain, pelanggan wajib memeriksa dan menyetujui kembali keranjang sebelum melanjutkan pesanan. Ketersediaan buku lain tetap diperiksa kembali saat checkout.
Pesanan online yang sudah aktif tetap berjalan sesuai aturan sebelumnya. Tenggat pembayaran dan jadwal pengambilan tidak otomatis dihentikan atau diubah karena toko tutup.
Admin utama dapat membuka toko kapan saja tanpa pemeriksaan kesiapan katalog.
Tidak ada notifikasi khusus kepada pelanggan saat toko ditutup maupun dibuka. Banner dan status checkout sudah menjadi pemberitahuan.
Pelanggan tidak melihat perkiraan tanggal pembukaan kembali.
17.2 Banner dan Antarmuka
Ketika toko tutup, banner status beserta alasan ditampilkan di halaman toko dan katalog serta halaman pelanggan yang relevan.
Banner Toko Libur tidak ditampilkan pada halaman login pelanggan.
Ketika toko dibuka, banner menghilang otomatis tanpa perlu memuat ulang halaman.
Status banner dan checkout diperbarui otomatis ketika status toko berubah.
Jika koneksi pulih, aplikasi mengambil status terbaru dari server lalu memperbarui status dan antarmuka berdasarkan data terbaru tersebut.
Jika status tidak bisa dipastikan, checkout tetap diblokir sementara dan menampilkan pesan yang sesuai.
Jika pemeriksaan status toko gagal, tampilan mempertahankan status terakhir yang berhasil diterima disertai indikator jelas bahwa status tersebut belum terverifikasi.
Jika sebelumnya ada banner Toko Libur, banner dan alasan terakhir yang diketahui tetap dipertahankan disertai indikator bahwa informasinya belum terverifikasi.
Checkout tetap diblokir sementara sampai status toko berhasil dikonfirmasi kembali, dan pemeriksaan ulang dilakukan secara berkala.
Kegagalan jaringan tidak boleh diperlakukan sebagai bukti bahwa toko otomatis terbuka atau tertutup.
Kegagalan polling tidak boleh menghapus keranjang pelanggan.
Dashboard admin utama menampilkan status toko secara jelas serta tombol Tutup Toko atau Buka Toko sesuai status saat ini.
Dashboard admin biasa menampilkan status toko, tetapi tidak menyediakan kontrol untuk mengubahnya.
Tombol Tutup Toko dinonaktifkan ketika toko sudah tutup. Admin utama dapat mengubah alasan yang aktif sebagai gantinya.
Waktu pembaruan status terakhir tidak perlu ditampilkan kepada pelanggan.
17.3 Hak Akses dan Konfirmasi
Hanya admin utama yang dapat menutup toko, membuka toko, mengubah alasan penutupan, dan menghapus riwayat Toko Libur yang lama atau tidak aktif. Riwayat penutupan yang masih aktif tidak boleh dihapus.
Admin utama dan admin biasa dapat melihat seluruh riwayat penutupan.
Pelanggan hanya melihat status dan alasan penutupan yang sedang berlaku, bukan riwayat historis.
Perubahan status memerlukan konfirmasi. Menutup dan membuka toko tidak termasuk tindakan yang wajib memakai verifikasi ulang kata sandi atau OTP.
Server memvalidasi sesi, peran, dan status terkini saat tindakan dikirim.
Jika sesi admin utama kedaluwarsa atau tidak valid, tindakan ditolak dan admin harus masuk kembali lalu mengulangi tindakan. Perubahan yang belum disimpan dibuang.
Jika status berubah sebelum formulir dikirim, formulir lama ditolak dan admin diminta memuat ulang status terkini.
Jika tindakan gagal, status dan banner tidak boleh dianggap berubah. Sistem menampilkan pesan kegagalan dan menyediakan percobaan ulang yang aman.
Tindakan yang diulang tidak boleh menciptakan perubahan status atau catatan riwayat duplikat.
17.4 Alasan Penutupan
Alasan wajib diisi ketika menutup toko dan panjang maksimalnya 200 karakter.
Hanya ada satu kolom alasan yang ditampilkan kepada pelanggan dan admin. Jangan memasukkan informasi internal atau rahasia ke dalam alasan.
Tidak ada daftar alasan preset. Admin utama mengetik alasan secara manual.
Validasi alasan hanya memastikan kolom tidak kosong dan maksimal 200 karakter.
Alasan dapat diubah berulang kali selama toko masih tutup.
Perubahan alasan harus melalui pratinjau dan konfirmasi sebelum dipublikasikan.
Jika konfirmasi dibatalkan, perubahan yang belum disimpan dibuang dan alasan lama tetap berlaku.
Jika penyimpanan gagal, alasan lama tetap tampil dan sistem menampilkan pesan kegagalan.
Riwayat menyimpan alasan terakhir yang berlaku pada periode penutupan tersebut. Versi alasan sebelumnya tidak disimpan.
Saat toko dibuka, alasan aktif dibersihkan, tetapi alasan terakhir tetap tersimpan dalam riwayat penutupan.
Membuka toko tidak memerlukan alasan. Sistem mencatat waktu pembukaan dan pelakunya.
17.5 Riwayat Penutupan
Riwayat mencatat waktu penutupan, waktu pembukaan jika ada, nama dan peran pelaku, serta alasan terakhir. Riwayat tetap tersedia setelah toko dibuka kembali.
Nama dan peran pelaku dipertahankan sebagaimana tercatat saat tindakan dilakukan, walaupun akun kemudian diganti nama, dinonaktifkan, atau dihapus.
Waktu ditampilkan dalam tanggal dan jam/menit sesuai zona waktu Asia/Jakarta (WIB), misalnya 18 Okt 2026, 08.35 WIB. Detik tidak perlu ditampilkan.
Jika toko masih tutup, kolom waktu pembukaan menampilkan Masih tutup.
Durasi dihitung otomatis. Penutupan yang masih berlangsung menampilkan durasi berjalan. Jika data waktu tidak valid, tampilkan Tidak tersedia.
Format durasi ringkas, misalnya 2 hari 3 jam.
Riwayat diurutkan dari yang terbaru ke yang terlama dengan pagination 20 catatan per halaman.
Riwayat tidak menyediakan pencarian, filter, ekspor, unduhan, atau ringkasan jumlah total.
Tidak ada kolom status terpisah. Status tercermin dari kolom waktu pembukaan.
Alasan ditampilkan langsung pada setiap baris riwayat. Alasan panjang dipotong dengan tanda … di daftar, tetapi isi aslinya tidak diubah.
Admin dapat mengeklik atau mengetuk teks alasan untuk memperluasnya secara inline pada baris yang sama. Klik kembali untuk diciutkan.
Beberapa alasan boleh diperluas sekaligus pada halaman yang sama. Saat berpindah halaman, semua alasan kembali diciutkan.
Jika riwayat kosong, admin utama dan admin biasa tetap dapat membuka halaman riwayat. Tampilkan pesan Belum ada riwayat Toko Libur. disertai penjelasan bahwa riwayat baru muncul setelah toko berhasil ditutup atau dibuka kembali.
Tombol Hapus Semua Riwayat dinonaktifkan ketika daftar kosong.
Ketika riwayat dihapus, daftar diperbarui otomatis tanpa memuat ulang halaman dan alasan yang sedang diperluas ikut hilang.
Penghapusan riwayat tidak mengubah status toko maupun banner pelanggan.
17.6 Penghapusan Riwayat
Hanya Admin Utama yang boleh menghapus riwayat Toko Libur yang lama atau sudah tidak aktif, baik satu catatan maupun seluruh riwayat. Riwayat penutupan toko yang masih aktif tidak boleh dihapus.
Penghapusan tidak memerlukan alasan wajib. Penghapusan memerlukan konfirmasi biasa; tidak perlu kata konfirmasi khusus meskipun jumlah riwayat banyak.
Penghapusan bersifat permanen tanpa tempat sampah atau pemulihan. Setiap penghapusan wajib dicatat dalam audit administratif terpisah; audit tersebut tidak ikut terhapus.
Jika penghapusan seluruh riwayat gagal, seluruh penghapusan dibatalkan sehingga tidak ada catatan yang terhapus sebagian.
Jika berhasil, tampilkan pesan sukses singkat dan perbarui daftar menjadi kosong.
Jika gagal, riwayat tetap utuh dan admin menerima pesan kegagalan.
Penghapusan riwayat tidak mengubah status toko maupun banner yang sedang ditampilkan.
Perangkat lain harus memperbarui riwayat secara otomatis tanpa memuat ulang halaman.
Jika perangkat sedang luring, setelah koneksi pulih perangkat mengambil ulang riwayat terbaru dari server. Riwayat yang sudah dihapus tidak boleh muncul kembali dari data lokal.
Sinkronisasi yang belum berhasil dapat ditandai dan dicoba kembali secara otomatis. Server tetap menjadi sumber kebenaran.
17.7 Konsistensi dan Gagal Teknis
Perubahan status toko dan pembuatan catatan riwayat dilakukan secara atomik. Jika salah satunya gagal, tindakan tidak dianggap berhasil.
Penutupan atau pembukaan yang berulang maupun bersamaan tidak boleh membuat status yang tidak konsisten atau riwayat duplikat.
Penghapusan massal riwayat dilakukan secara atomik.
Setelah koneksi pulih, status toko dan riwayat disegarkan dari server.
Jika sinkronisasi gagal, dilakukan percobaan ulang yang aman tanpa menciptakan duplikat.
Semua pemeriksaan otorisasi dan status penting dilakukan di server, bukan hanya di antarmuka.
18. Prinsip Implementasi
Dokumen kebutuhan dan aturan bisnis menjadi acuan implementasi.
OpenCode harus membaca dan menganalisis dokumen sebelum membuat kode.
Sebelum implementasi, OpenCode wajib membaca AGENTS.md dan dokumentasi Next.js lokal di node_modules/next/dist/docs/ sesuai versi yang terpasang.
Rekomendasi teknis tidak boleh diperlakukan sebagai keputusan bisnis baru tanpa persetujuan.
Rancangan arsitektur, database, dan alur teknis harus ditinjau sebelum implementasi fitur.
Fitur dikembangkan bertahap dan diuji setelah setiap tahap.
Perubahan kebutuhan harus dicatat dalam dokumentasi.
Keamanan dan konsistensi transaksi harus ditegakkan di server dan database, bukan hanya di antarmuka.
Setiap checkpoint GitHub menjadi titik untuk menyimpan pekerjaan dan meninjau kembali perubahan sebelum melanjutkan.
Semua tanggal, tenggat, dan jadwal menggunakan zona waktu Asia/Jakarta (WIB).
19. Catatan Teknis (Rekomendasi, Bukan Keputusan Bisnis)
Bagian ini berisi usulan teknis untuk mendukung aturan bisnis. Usulan ini bukan keputusan bisnis baru dan perlu disetujui sebelum implementasi.
Pembuatan pesanan dan perubahan stok harus aman terhadap permintaan bersamaan. Rekomendasi: gunakan transaksi database, pembaruan stok bersyarat, penguncian baris yang sesuai, dan batasan unik untuk mencegah satu eksemplar ditahan oleh dua pesanan aktif. Isolation level dan mekanisme retry ditentukan pada rancangan teknis.
Operasi yang dapat terkirim berulang harus memiliki strategi idempotensi. Rekomendasi: kunci idempotensi unik per operasi, penyimpanan hasil, dan penolakan kunci yang sama dengan muatan berbeda. Operasi penting meliputi pembuatan pesanan, persetujuan pembayaran, unggah bukti, pembatalan, keputusan jadwal, dan tindakan admin penting.
Pengingat 2 jam harus memakai jadwal persisten di database, bukan hanya setInterval. Rekomendasi: tabel pekerjaan/outbox dengan waktu jalan berikutnya, status, percobaan, dan kunci unik per slot pengingat; worker mengambil pekerjaan dengan penguncian yang aman, melakukan retry dengan jeda, dan melanjutkan pekerjaan yang tertunda setelah server restart.
Waktu disimpan secara konsisten di server dan ditampilkan kepada pengguna dalam zona waktu Asia/Jakarta. Perbandingan tenggat menggunakan waktu server, bukan waktu perangkat pengguna.
Snapshot harga, kondisi, tenggat, dan data pesanan harus tetap konsisten dengan keadaan saat pesanan dibuat. Snapshot tidak boleh ditimpa oleh perubahan katalog atau perubahan pengaturan global.
Audit administratif dirancang append-only. Aplikasi tidak menyediakan fungsi mengubah atau menghapus catatan yang sudah tercatat; pembatasan juga perlu ditegakkan pada hak akses database. Hanya Admin Utama yang dapat membaca audit.
Otorisasi harus ditegakkan di server, bukan hanya dengan menyembunyikan elemen antarmuka. Data modal dan keuntungan tidak boleh disertakan dalam respons untuk Admin biasa.
Penghapusan massal riwayat Toko Libur harus dilakukan dalam satu transaksi atomik dan menulis audit administratif terpisah dalam transaksi yang sama atau mekanisme yang menjamin keduanya konsisten.
Kontrak API perlu mencakup validasi input, kode error yang konsisten, pagination untuk daftar besar, batas ukuran halaman, dan pemeriksaan hak akses. Bentuk kontrak ditentukan pada rancangan teknis.
Backup dan restore harus mencakup database serta file penting, diuji secara berkala, dan tidak menyimpan kunci pembuka bersama file backup.



AKIRA BOOKS — REQUIREMENTS
1. Tujuan Proyek
Akira Books adalah website untuk membantu pengelolaan toko buku bacaan original dan bekas, mulai dari katalog, pesanan, pembayaran, jadwal pengambilan, hingga pencatatan transaksi.
Website mendukung kegiatan penjualan langsung di booth CFD yang beroperasi setiap Minggu pagi dan berakhir tepat pukul 09.00.
Website bukan marketplace. Pengelolaan toko dilakukan oleh admin, sedangkan pelanggan dapat melihat katalog dan melakukan pemesanan melalui website.
Akira Books dikembangkan untuk:
Menyediakan katalog buku yang dapat diakses secara online.
Mempermudah pelanggan memesan buku dan mengunggah bukti pembayaran.
Membantu admin mengelola buku, pesanan, jadwal pengambilan, dan transaksi.
Mencatat modal serta menghitung laba kotor per buku.
Menyediakan laporan penjualan yang hanya dapat diakses Admin Utama.
Menyimpan riwayat aktivitas penting agar perubahan data dapat ditelusuri.
Mengurangi risiko kehilangan data melalui backup otomatis dan manual.
Menyediakan banner promosi untuk menampilkan informasi atau promosi toko.
Admin Utama dapat menutup dan membuka toko secara manual ketika toko libur. Saat toko tutup, pelanggan tetap dapat melihat katalog dan mengelola keranjang, tetapi tidak dapat membuat pesanan baru.
2. Teknologi
Teknologi yang digunakan:
Docker sebagai lingkungan aplikasi.
Next.js sebagai framework website.
TypeScript sebagai bahasa pemrograman.
Prisma sebagai ORM.
PostgreSQL sebagai database utama.
Fondasi project Next.js, TypeScript, Prisma, dan Docker sudah tersedia. Fitur bisnis masih perlu diimplementasikan.
Kebutuhan pendukung:
Sistem autentikasi dan pengelolaan sesi yang aman.
Layanan email untuk verifikasi, pemulihan password, dan OTP.
Penyimpanan file untuk foto buku, QRIS, bukti pembayaran, dan gambar banner.
Backup database serta file penting.
Versi paket dan konfigurasi teknis ditentukan berdasarkan kompatibilitas dan stabilitas, bukan sekadar menggunakan versi terbaru.
Website harus dapat digunakan melalui browser komputer, tablet, dan HP. MVP tidak memerlukan aplikasi Android atau iOS terpisah.
3. Pengguna dan Hak Akses
3.1 Pengunjung
Pengunjung tidak perlu login untuk:
Melihat beranda.
Melihat katalog buku yang tersedia.
Mencari dan memfilter buku.
Melihat detail buku.
Melihat informasi toko yang bersifat publik.
Melihat banner aktif.
Pengunjung wajib membuat akun dan login sebelum melakukan pemesanan atau interaksi yang membutuhkan identitas pelanggan.
3.2 Customer
Customer dapat:
Mengelola profil.
Mengubah nama, password, dan nomor WhatsApp.
Melihat katalog serta detail buku.
Menambahkan buku ke keranjang.
Membuat pesanan dan memilih tanggal pengambilan.
Mengunggah dan mengganti bukti pembayaran sesuai status pesanan.
Melihat status pembayaran dan jadwal pengambilan.
Mengajukan perubahan jadwal.
Meminta perpanjangan batas waktu pembayaran.
Meminta penggabungan jadwal pengambilan beberapa pesanan.
Melihat pesanan aktif dan riwayat pesanan.
Mengajukan penghapusan akun.
Menerima notifikasi dalam website.
Email tidak dapat diubah langsung melalui pengaturan profil. Nomor WhatsApp bersifat opsional.
Customer hanya boleh melihat data dan bukti pembayaran miliknya sendiri.
Ketika toko tutup, Customer tetap dapat mendaftar, masuk, melihat katalog, mengelola akun, dan menambah buku ke keranjang, tetapi tidak dapat membuat pesanan baru.
Customer hanya melihat status toko yang sedang berlaku, bukan riwayat historis Toko Libur.
3.3 Admin Biasa
Admin Biasa menangani operasional toko sesuai izin yang diberikan, termasuk:
Mengelola data buku dan foto.
Mengelola kategori buku.
Melihat dan menangani pesanan.
Memeriksa bukti pembayaran dan mengajukan hasil pemeriksaan awal.
Mengelola permintaan perubahan jadwal.
Menangani permintaan perpanjangan tenggat.
Mencatat penjualan offline.
Menangani akun Customer sesuai aturan.
Membatalkan pesanan yang belum mendapatkan persetujuan final pembayaran, sesuai aturan pembatalan.
Mengajukan banner kepada Admin Utama.
Melihat status banner dan daftar banner yang telah dipublikasikan.
Melihat status toko dan riwayat Toko Libur.
Admin Biasa tidak boleh:
Melihat laporan penjualan dan laporan keuangan.
Melihat atau mengubah modal buku.
Mengatur atau mengoreksi modal buku.
Menambahkan akun admin atau mengubah peran admin.
Menonaktifkan atau menghapus akun admin lain.
Menyetujui pembayaran pada tahap final.
Mengelola banner yang sudah dipublikasikan.
Menyetujui atau menolak pengajuan banner.
Menutup atau membuka Toko Libur.
Mengubah alasan penutupan toko.
Mengubah pengaturan global yang hanya boleh dikelola Admin Utama.
Admin Biasa hanya dapat melihat identitas dan status pengajuan banner miliknya sendiri. Identitas pengaju banner lain dan alasan penolakan tidak ditampilkan kepada Admin Biasa.
3.4 Admin Utama
Sistem hanya memiliki satu Admin Utama.
Admin Utama memiliki hak akses operasional dan hak akses khusus, yaitu:
Melihat laporan penjualan dan laporan keuangan.
Melihat dan mengoreksi modal setiap buku fisik.
Mengelola akun admin dan menetapkan perannya.
Menonaktifkan atau menghapus akun admin sesuai ketentuan.
Mengatur backup database.
Mengelola pengaturan toko dan QRIS.
Menyetujui hasil verifikasi pembayaran pada tahap final.
Menyetujui pembatalan pesanan yang sudah mendapatkan persetujuan final pembayaran.
Menangani kasus pembayaran yang membutuhkan keputusan khusus.
Melakukan koreksi transaksi sesuai aturan persetujuan.
Mengakses riwayat aktivitas administratif untuk audit.
Membuka dan menutup Toko Libur.
Mengelola pengajuan banner.
Membuat dan menerbitkan banner sendiri.
Mengaktifkan, menonaktifkan, mengurutkan, dan menghapus banner yang sudah dipublikasikan.
Hanya Admin Utama yang boleh membuat akun admin, mengubah peran admin, dan menentukan pihak yang menjadi Admin Utama.
3.5 Penegakan Hak Akses
Hak akses harus diperiksa di server untuk setiap operasi yang dilindungi.
Menyembunyikan tombol atau menu pada antarmuka saja tidak cukup. Pengguna tidak boleh dapat membuka data atau melakukan tindakan terlarang melalui URL, permintaan API, maupun manipulasi browser.
4. Akun dan Keamanan
4.1 Login
Customer dan admin menggunakan email serta password.
Password disimpan dalam bentuk hash menggunakan algoritma yang sesuai, bukan teks biasa.
Sistem harus memiliki:
Pembatasan percobaan login.
Penguncian sementara setelah kegagalan berulang sesuai aturan keamanan.
Pengelolaan sesi yang aman.
Cookie sesi dengan atribut keamanan yang sesuai.
Prosedur logout.
Perlindungan terhadap akses tanpa izin.
4.2 OTP untuk Admin
Admin menggunakan OTP untuk tindakan sensitif, bukan untuk setiap login.
Tindakan yang memerlukan OTP meliputi:
Mengganti gambar QRIS.
Mengelola akun admin.
Tindakan sensitif lain yang ditetapkan saat implementasi.
OTP harus memiliki masa berlaku, pembatasan percobaan, dan perlindungan terhadap penggunaan ulang.
Pengiriman OTP menggunakan layanan email atau layanan lain yang dipilih saat implementasi.
4.3 Pemulihan Akun Admin Utama
Pemulihan akun menggunakan:
Tautan pemulihan melalui email.
Kode pemulihan cadangan untuk keadaan darurat ketika email tidak dapat diakses.
Kode pemulihan harus dibuat dengan aman, ditampilkan saat dibuat, dan disimpan pengguna di tempat aman. Server tidak menyimpan kode dalam bentuk teks biasa.
Proses pemulihan harus membatasi percobaan dan mencatat aktivitas pemulihan yang penting.
4.4 Pemulihan Password Customer
Customer dapat meminta tautan pemulihan melalui email terdaftar. Tautan memiliki masa berlaku dan hanya dapat digunakan sesuai aturan keamanan.
4.5 Penonaktifan Customer
Admin dapat memberikan peringatan atau menonaktifkan akun Customer sesuai kewenangannya.
Setiap tindakan penonaktifan harus memiliki alasan dan riwayat.
Akun yang dinonaktifkan:
Tidak dapat login.
Tidak dapat membuat pesanan baru.
Tetap memiliki riwayat pesanan dan transaksi.
Tidak menghapus atau membatalkan pesanan yang sudah ada secara otomatis.
Penonaktifan sementara tidak memiliki aktivasi otomatis berdasarkan tanggal atau waktu. Akun tetap nonaktif sampai Admin mengaktifkannya kembali secara manual.
Customer dapat melihat alasan penonaktifan melalui mekanisme yang tersedia tanpa harus dapat masuk ke akun yang sedang dinonaktifkan.
4.6 Penghapusan Akun Customer
Customer dapat mengajukan penghapusan akun.
Jika masih ada pesanan aktif atau kewajiban pembayaran maupun pengembalian dana yang belum selesai, penghapusan ditunda sampai kewajiban tersebut diselesaikan.
Sebelum penghapusan benar-benar dilakukan, Customer dapat membatalkan permintaannya.
Sistem mencatat riwayat permintaan dan pembatalannya.
Penghapusan permanen tidak dapat dibatalkan setelah selesai.
Data transaksi yang wajib dipertahankan untuk kebutuhan operasional, keamanan, atau kewajiban hukum harus diperlakukan sesuai kebijakan retensi. Permintaan penghapusan akun tidak boleh menghapus riwayat transaksi secara sembarangan.
4.7 Akun Admin
Admin Utama dapat menonaktifkan atau menghapus akun Admin Biasa.
Akun admin yang dinonaktifkan tidak dapat login dan seluruh sesi aktifnya harus dicabut.
Penonaktifan tidak menghapus riwayat tindakan admin tersebut.
Penghapusan akun admin tidak boleh menghapus identitas historis yang tercatat dalam transaksi maupun audit log. Riwayat tetap dapat menunjukkan admin yang melakukan tindakan tersebut.
5. Pengelolaan Buku
5.1 Data Buku
Setiap buku fisik memiliki data tersendiri, termasuk ketika ada beberapa eksemplar dengan judul yang sama.
Data buku meliputi:
Identitas buku atau kode unik.
Judul.
Penulis.
Penerbit.
Tahun terbit.
Satu atau lebih kategori.
Foto buku.
Kondisi buku.
Deskripsi.
Harga jual.
Modal per eksemplar.
Status ketersediaan.
Riwayat perubahan data.
Buku yang memiliki judul, penulis, penerbit, dan tahun terbit sama tetap dapat memiliki kondisi, foto, harga jual, serta modal yang berbeda.
5.2 Kondisi Buku
Pilihan kondisi standar:
Baru.
Sangat Baik.
Baik.
Cukup.
Admin dapat menambahkan deskripsi kerusakan, kekurangan, atau kelebihan buku. Deskripsi tambahan bersifat opsional.
Harga jual ditentukan untuk setiap buku fisik. Perbedaan kondisi dapat menghasilkan perbedaan harga.
5.3 Modal Buku
Modal disimpan per eksemplar, bukan per judul.
Hanya Admin Utama yang boleh mengatur atau mengoreksi modal.
Setiap koreksi modal wajib memiliki alasan dan mencatat:
Modal sebelumnya.
Modal baru.
Alasan koreksi.
Admin Utama yang melakukan koreksi.
Waktu koreksi.
Setelah koreksi, sistem menghitung ulang laba berdasarkan modal terbaru.
Laba historis dari penjualan yang sudah selesai tidak berubah. Admin Utama dapat melihat laba historis dan hasil perhitungan ulang menggunakan modal terbaru secara terpisah.
Admin Biasa tidak boleh melihat modal atau mengubahnya melalui antarmuka maupun akses server.
5.4 Stok
Setiap buku fisik merupakan satu data dengan stok tersedia 0 atau 1.
Status buku harus membedakan antara:
Tersedia.
Sedang Dipesan.
Terjual.
Nonaktif.
Buku yang sedang dipesan tetap dapat terlihat di katalog, tetapi tidak dapat dipesan Customer lain.
Buku yang terjual atau dinonaktifkan tidak tampil sebagai buku tersedia. Riwayat buku tetap dipertahankan sesuai aturan penyimpanan data.
5.5 Perubahan dan Penghapusan Buku
Admin dapat menambahkan satu atau beberapa buku, mengubah data, mengganti foto, mengatur kategori, dan mengelola status buku sesuai hak akses.
Jika buku belum memiliki riwayat pesanan atau transaksi, penghapusan permanen dapat dilakukan sesuai aturan sistem.
Jika buku sudah memiliki riwayat, buku dinonaktifkan daripada dihapus permanen agar riwayat transaksi tetap dapat ditelusuri.
Perubahan harga atau kondisi yang memengaruhi kesepakatan pesanan dibatasi ketika buku memiliki pesanan aktif. Data historis dalam pesanan harus tetap sama.
Buku dengan riwayat duplikat hanya dapat digabungkan oleh Admin Utama. Proses penggabungan harus menjaga identitas serta keterlacakan seluruh transaksi lama.
6. Katalog dan Beranda
6.1 Beranda
Beranda menampilkan:
Pengenalan singkat Akira Books.
Beberapa buku terbaru yang tersedia.
Akses yang jelas menuju katalog lengkap.
Navigasi menuju informasi toko dan login.
Area banner promosi apabila terdapat banner aktif.
Jika tidak ada banner aktif, area banner tidak ditampilkan dan tidak meninggalkan ruang kosong.
6.2 Katalog
Kartu buku menampilkan:
Foto.
Judul.
Penulis.
Harga jual.
Status ketersediaan.
Pencarian dan filter mencakup:
Judul atau penulis.
Kategori.
Kondisi.
Rentang harga.
Buku yang sedang dipesan dapat ditampilkan dengan status yang jelas, tetapi tidak bisa ditambahkan ke pesanan baru.
Buku terjual dan buku yang dinonaktifkan tidak ditampilkan sebagai buku tersedia.
6.3 Detail Buku
Halaman detail menampilkan informasi lebih lengkap, termasuk:
Penerbit.
Tahun terbit.
Kondisi.
Harga.
Deskripsi.
Kategori.
Foto.
Status ketersediaan.
6.4 Informasi Toko
Halaman informasi toko menampilkan informasi Akira Books dan QRIS sesuai aturan akses serta status pesanan.
QRIS hanya ditampilkan kepada Customer yang memiliki pesanan dengan status pembayaran yang memerlukan pembayaran.
7. Banner Promosi
7.1 Tujuan Banner
Banner digunakan untuk menampilkan informasi atau promosi Akira Books pada area banner di website.
Banner bersifat minimalis dan tidak menggunakan sistem jadwal publikasi.
Banner yang disetujui langsung diterbitkan apabila kapasitas banner aktif masih tersedia.
7.2 Pengajuan Banner oleh Admin Biasa
Admin Biasa dapat mengajukan banner kepada Admin Utama.
Pengajuan berisi:
Gambar banner (wajib).
URL tujuan (opsional).
Judul (opsional).
Deskripsi (opsional).
Judul dan deskripsi dapat diisi secara terpisah atau bersamaan.
Setiap Admin Biasa maksimal memiliki 3 pengajuan yang masih menunggu persetujuan. Batas ini dihitung per admin, bukan secara keseluruhan.
Pengajuan yang sudah dibatalkan, ditolak, atau disetujui tidak dihitung sebagai pengajuan pending.
Admin Biasa dapat membatalkan pengajuan miliknya sendiri selama masih menunggu persetujuan. Status pengajuan berubah menjadi Dibatalkan.
Pembatalan pengajuan tidak mengirim notifikasi kepada Admin Utama.
Pengajuan banner tidak otomatis mengirim notifikasi kepada Admin Utama. Admin Utama memeriksa daftar pengajuan secara manual.
7.3 Persetujuan Banner
Admin Utama dapat menyetujui atau menolak pengajuan banner.
Admin Utama melihat:
Gambar banner.
URL tujuan jika tersedia.
Judul jika tersedia.
Deskripsi jika tersedia.
Identitas admin pengaju.
Admin Utama tidak mengedit isi pengajuan. Jika pengajuan ditolak, Admin Biasa harus membuat pengajuan baru apabila ingin mengajukannya kembali.
Alasan penolakan bersifat opsional.
Admin Biasa dapat melihat status pengajuan miliknya, tetapi tidak dapat melihat alasan penolakan.
Identitas pengaju hanya terlihat oleh Admin Utama.
Admin Utama dapat melihat jumlah keseluruhan pengajuan yang masih pending. Admin Biasa hanya melihat jumlah pengajuan pending miliknya sendiri.
7.4 Banner yang Diterbitkan
Admin Utama dapat membuat dan menerbitkan banner sendiri tanpa melalui proses persetujuan.
Hanya Admin Utama yang dapat mengelola banner yang sudah dipublikasikan.
Admin Utama dapat:
Mengaktifkan banner.
Menonaktifkan banner.
Mengurutkan banner aktif.
Mengaktifkan kembali banner nonaktif.
Menghapus banner secara permanen.
Maksimal terdapat 7 banner aktif secara bersamaan.
Banner yang dinonaktifkan tidak ditampilkan kepada Customer dan tidak dihitung dalam batas maksimal 7 banner aktif.
Jika sudah terdapat 7 banner aktif, banner tambahan tidak dapat diterbitkan atau diaktifkan kembali sebelum Admin Utama menonaktifkan atau menghapus banner aktif lainnya.
Tidak ada penggantian banner otomatis.
Banner yang sudah diterbitkan tidak dapat diedit, baik dalam keadaan aktif maupun nonaktif. Jika ada perubahan isi, banner harus dihapus secara permanen dan dibuat sebagai banner baru.
Penghapusan banner bersifat permanen dan tidak menyediakan tempat sampah atau pemulihan.
Penghapusan banner langsung dilakukan ketika Admin Utama memilih tindakan hapus.
Admin Utama memiliki daftar terpisah untuk banner aktif dan nonaktif.
Admin Biasa dapat melihat daftar banner aktif maupun nonaktif beserta gambar, judul, deskripsi, URL, dan statusnya, tetapi tidak dapat mengelolanya. Identitas pengaju tidak ditampilkan kepada Admin Biasa.
7.5 Konten dan Tampilan Banner
Gambar banner dapat menggunakan ukuran dan rasio aspek yang berbeda. Sistem menyesuaikan tampilan gambar dengan area banner.
URL tujuan bersifat opsional:
URL internal dapat membuka halaman website terkait.
URL eksternal dibuka pada tab baru.
Gambar atau URL boleh digunakan kembali secara terpisah. Namun, kombinasi gambar dan URL yang sama tidak boleh digunakan secara bersamaan pada banner aktif.
Judul dan deskripsi bersifat opsional dan dapat diisi sendiri-sendiri atau bersamaan.
Teks berada di dalam gambar, bukan di luar gambar atau sebagai elemen terpisah di atas banner.
Posisi dan warna teks ditentukan secara otomatis.
Jika judul atau deskripsi diisi, area gambar di sebelah kiri diberi efek blur agar teks lebih mudah dibaca.
Banner menggunakan tampilan minimalis tanpa tombol CTA terpisah. Seluruh area banner dapat diklik apabila URL tujuan tersedia.
Batas karakter judul dan deskripsi ditentukan pada tahap spesifikasi teknis.
7.6 Carousel Banner
Jika terdapat lebih dari satu banner aktif:
Banner menggunakan perpindahan otomatis setelah beberapa detik.
Pengunjung dapat berpindah banner secara manual.
Navigasi titik ditampilkan di bawah banner untuk menunjukkan posisi dan jumlah banner.
Setiap titik dapat diklik untuk memilih banner.
Pemilihan banner secara manual tidak menghentikan autoplay secara permanen.
Pada desktop, autoplay berhenti sementara ketika kursor berada di atas banner dan berjalan kembali setelah kursor meninggalkan area banner.
Pada perangkat mobile, autoplay berhenti sementara ketika pengguna menyentuh atau berinteraksi dengan banner dan berjalan kembali setelah interaksi selesai.
Jika hanya terdapat satu banner aktif, banner ditampilkan secara statis tanpa autoplay, titik navigasi, atau kontrol perpindahan.
Durasi autoplay ditentukan pada tahap spesifikasi teknis.
8. Keranjang dan Pemesanan
8.1 Keranjang
Customer yang sudah login dapat memilih beberapa buku untuk satu pesanan.
Keranjang tidak menahan stok. Stok baru ditahan ketika Customer menekan tombol Buat Pesanan.
8.2 Pembuatan Pesanan
Ketika pesanan dibuat, server memeriksa kembali ketersediaan seluruh buku secara aman.
Jika satu atau beberapa buku tidak lagi tersedia, sistem tidak boleh membuat pesanan yang menyebabkan stok ganda. Customer diberi tahu buku mana yang tidak tersedia.
Jika sebagian isi keranjang tidak tersedia, item tersebut dikeluarkan dan Customer harus meninjau serta mengonfirmasi kembali isi keranjang yang tersisa sebelum membuat pesanan.
Jika berhasil:
Pesanan dibuat.
Buku yang dipesan ditahan.
Data buku, harga, dan kondisi saat pemesanan disimpan sebagai snapshot.
Status pesanan menjadi Menunggu Pembayaran.
Status jadwal menjadi Menunggu Konfirmasi.
Tenggat pembayaran ditentukan berdasarkan pengaturan yang berlaku saat pesanan dibuat.
Customer menerima notifikasi website.
Snapshot menjaga agar perubahan katalog setelah pesanan dibuat tidak mengubah kesepakatan historis.
Pembuatan pesanan harus mencegah pemesanan ganda akibat permintaan berulang atau proses bersamaan. Penahanan stok dan pembuatan pesanan harus dilakukan secara atomik.
8.3 Beberapa Pesanan Aktif
Customer dapat memiliki beberapa pesanan aktif sekaligus. Setiap pesanan memiliki status, tenggat pembayaran, riwayat, dan jadwal sendiri.
Customer dapat meminta agar beberapa pesanan diambil pada jadwal yang sama. Admin meninjau permintaan tersebut.
Penggabungan jadwal tidak otomatis menggabungkan identitas pesanan atau catatan pembayaran. Setiap pesanan tetap memiliki riwayatnya sendiri.
Jika salah satu pesanan dalam jadwal gabungan dibatalkan, jadwal pesanan lain tetap berlaku.
9. Pembayaran QRIS
9.1 QRIS Toko
Toko menggunakan satu gambar QRIS yang dikelola Admin Utama.
Penggantian QRIS memerlukan konfirmasi, autentikasi ulang, dan OTP sesuai aturan keamanan.
Sistem memperingatkan Admin Utama jika ada pesanan aktif yang mungkin masih menggunakan gambar lama.
QRIS terbaru ditampilkan pada halaman informasi toko hanya jika Customer memiliki pesanan Menunggu Pembayaran, serta pada detail pesanan yang relevan.
Penggantian gambar QRIS tidak mengubah status pembayaran atau bukti pembayaran yang sudah ada.
Riwayat gambar QRIS lama tetap dipertahankan sesuai kebutuhan penelusuran.
9.2 Unggah Bukti Pembayaran
Customer membayar melalui QRIS di luar sistem, kemudian mengunggah tangkapan layar bukti pembayaran.
Status bukti pembayaran:
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
Bukti pembayaran hanya dapat dilihat Customer pemilik pesanan dan admin yang berwenang.
Sistem menyimpan riwayat bukti pembayaran, dengan bukti terbaru yang masih aktif ditampilkan lebih dahulu.
Customer boleh mengganti bukti ketika statusnya masih Menunggu Verifikasi. Bukti lama tetap disimpan sebagai riwayat.
Setelah bukti terverifikasi, penggantian normal tidak diizinkan.
9.3 Verifikasi Dua Tahap
Verifikasi pembayaran dilakukan melalui dua tahap:
Admin Biasa memeriksa bukti pembayaran dan mengajukan hasil pemeriksaan awal.
Satu-satunya Admin Utama memberikan persetujuan atau penolakan final.
Pesanan baru menjadi Sudah Dibayar setelah Admin Utama menyetujui pembayaran pada tahap final.
Admin yang melakukan pemeriksaan awal adalah Admin Biasa, sedangkan keputusan final dilakukan oleh Admin Utama.
Tidak ada persetujuan pembayaran otomatis.
Jika Admin Utama menolak hasil pemeriksaan, alasan wajib diisi dan kasus dikembalikan untuk ditindaklanjuti sesuai hasil keputusan.
Seluruh hasil pemeriksaan, persetujuan, penolakan, alasan, pelaku, dan waktu harus tercatat.
Tidak ada mekanisme eskalasi kepada Admin Utama kedua karena sistem hanya memiliki satu Admin Utama.
9.4 Bukti Baru
Jika bukti tidak valid, admin dapat meminta bukti baru dengan alasan dan tenggat baru.
Status bukti menjadi Perlu Bukti Baru, sedangkan status pesanan tetap Menunggu Pembayaran.
Ketika Customer mengunggah bukti pengganti sebelum tenggat, status bukti kembali menjadi Menunggu Verifikasi dan admin menerima notifikasi.
Jika satu transfer QRIS mencakup beberapa pesanan, satu pembayaran dapat dihubungkan ke beberapa pesanan dengan pencatatan yang jelas. Hubungan pembayaran dengan setiap pesanan harus dapat ditelusuri.
10. Tenggat Pembayaran
Sistem memiliki tenggat pembayaran default selama 24 jam dan tenggat khusus per pesanan.
Perubahan tenggat default hanya dilakukan Admin Utama dan berlaku untuk pesanan baru. Pesanan yang sudah ada tetap menggunakan tenggat tersimpan kecuali tenggat khususnya diubah.
Admin yang berwenang dapat mengubah tenggat pesanan sesuai hak akses. Setiap perubahan harus mencatat nilai lama, nilai baru, waktu, admin, alasan jika diwajibkan, serta mengirim notifikasi kepada Customer.
Customer dapat mengajukan perpanjangan melalui website atau WhatsApp. Pengajuan melalui WhatsApp harus dicatat ke sistem oleh admin agar keputusan dan riwayatnya tetap tersedia.
Pengajuan perpanjangan tidak otomatis menghentikan tenggat. Admin yang berwenang dapat menyetujui atau menolak permintaan tersebut.
Jika perubahan metode pembayaran sedang menunggu keputusan, hitung mundur tenggat QRIS dihentikan sementara. Jika permintaan ditolak, hitung mundur dilanjutkan menggunakan sisa waktu sebelumnya.
10.1 Jika Tenggat Terlewati
Jika tidak ada bukti pembayaran yang berhasil diunggah sampai tenggat, sistem membatalkan pesanan secara otomatis dengan alasan Batas Waktu Pembayaran Terlewati.
Sistem mencatat:
Waktu pembatalan.
Pelaku System.
Riwayat perubahan status.
Pengembalian stok jika masih relevan.
Customer menerima notifikasi pembatalan.
Jika bukti berhasil diunggah sebelum tenggat tetapi belum diperiksa, pesanan tidak otomatis dibatalkan. Keputusan penanganan dilakukan oleh admin sesuai kewenangan.
Bukti yang berhasil diunggah sebelum tenggat tetap dianggap tepat waktu meskipun pemeriksaan dilakukan setelah tenggat.
Jika bukti baru diminta dan tenggat penggantinya terlewati tanpa bukti baru, pesanan dapat dibatalkan sesuai aturan tenggat.
Jika bukti pengganti sudah berhasil diunggah sebelum tenggat tetapi belum diperiksa, kasus mengikuti aturan bukti yang menunggu verifikasi.
Semua pengunggahan dan perubahan status menggunakan waktu yang tercatat di server.
Proses bersamaan antara unggah bukti dan pembatalan harus ditangani secara atomik agar stok tidak dikembalikan dua kali atau status menjadi bertentangan.
10.2 Pengingat Pemeriksaan
Jika bukti telah diunggah tetapi belum diperiksa, sistem mengirim pengingat setiap dua jam kepada admin yang harus bertindak.
Pengingat juga berlaku untuk proses verifikasi yang masih menunggu keputusan final.
Pengingat berhenti segera setelah keputusan terkait dibuat.
Tidak ada eskalasi kepada Admin Utama lain karena sistem hanya memiliki satu Admin Utama.
Tidak ada persetujuan pembayaran otomatis hanya karena admin belum merespons.
11. Jadwal Pengambilan
Pengambilan buku dilakukan pada hari Minggu pagi di booth Akira Books.
Jam operasional booth berakhir tepat pukul 09.00. Waktu penutupan ini bersifat tetap dan tidak dapat diubah melalui pengaturan admin.
Customer memilih tanggal pengambilan pada saat checkout. Customer tidak memilih jam pengambilan.
Tanggal yang dipilih harus merupakan hari Minggu dan berada di masa depan. Validasi dilakukan pada antarmuka dan server.
Status jadwal dikelola terpisah dari status pembayaran. Pesanan dapat berstatus Sudah Dibayar sementara jadwal masih Menunggu Konfirmasi.
11.1 Persetujuan Jadwal
Admin menyetujui atau menolak tanggal yang diajukan.
Jika ditolak, alasan wajib diberikan dan Customer diminta memilih tanggal Minggu lain.
Status pembayaran tidak berubah hanya karena tanggal ditolak.
Jika tanggal baru belum dipilih setelah batas waktu yang ditentukan admin, Admin Utama memutuskan apakah pesanan tetap menunggu atau dibatalkan.
Jika Customer meminta tanggal baru, admin meninjau permintaan tersebut. Pengingat kepada admin dikirim setiap dua jam selama permintaan menunggu keputusan.
Tanggal yang sudah berlalu tidak boleh disetujui. Jika tanggal berlalu sebelum keputusan admin, Customer harus diminta memilih tanggal lain.
11.2 Perubahan Jadwal oleh Admin
Admin dapat mengusulkan perubahan jadwal dengan alasan. Customer harus menyetujui usulan tersebut.
Jadwal lama tetap berlaku sampai perubahan disetujui.
Semua perubahan dicatat dalam riwayat dan diberitahukan kepada pihak terkait.
11.3 Customer Tidak Mengambil Buku
Jika Customer tidak datang sebelum booth tutup pukul 09.00, sistem memberi notifikasi kepada admin.
Admin memutuskan apakah buku tetap ditahan, jadwal diubah, atau pesanan dibatalkan.
Jika buku tetap ditahan, admin menentukan tenggat baru dan alasan. Keputusan diberitahukan kepada Customer serta dicatat.
Ketika tenggat baru berlalu, admin harus mengambil keputusan lagi. Sistem tidak membatalkan otomatis hanya karena tenggat penahanan terlewati.
Pembatalan pesanan yang sudah mendapat persetujuan final pembayaran hanya dapat dilakukan oleh Admin Utama.
11.4 Pesanan Gabungan
Permintaan menggabungkan jadwal beberapa pesanan harus ditinjau admin.
Jika salah satu pesanan dibatalkan, jadwal pesanan lain tetap berlaku.
Jika tenggat pembayaran salah satu pesanan terlewati, aturan pembayaran normal tetap berlaku. Jadwal gabungan tidak mengecualikan pesanan dari aturan pembayaran.
12. Pembatalan Pesanan
12.1 Pembatalan oleh Admin Biasa
Admin Biasa dapat membatalkan:
Pesanan yang belum dibayar.
Pesanan yang sudah memiliki bukti atau pembayaran dalam proses pemeriksaan, tetapi belum mendapat persetujuan final dari Admin Utama.
Pembatalan wajib disertai alasan.
Setiap pembatalan harus:
Dicatat dalam riwayat pesanan.
Mencatat admin yang melakukan pembatalan.
Mencatat waktu dan alasan.
Mengirim notifikasi kepada Customer.
Mengirim notifikasi kepada Admin Utama.
12.2 Pembatalan oleh Admin Utama
Setelah pembayaran mendapatkan persetujuan final dari Admin Utama, pembatalan pesanan hanya dapat dilakukan oleh Admin Utama.
Pembatalan pesanan yang sudah dibayar tidak otomatis berarti dana telah dikembalikan.
Keputusan pembatalan dan proses refund merupakan proses yang berbeda.
12.3 Pembatalan Otomatis
Sistem dapat membatalkan pesanan secara otomatis ketika tenggat pembayaran terlewati dan tidak ada bukti pembayaran yang berhasil diunggah.
Pembatalan otomatis mencatat pelaku System, alasan, waktu, dan perubahan stok.
12.4 Pengembalian Stok
Ketika pesanan dibatalkan, buku yang ditahan dapat kembali tersedia hanya jika:
Buku masih aktif.
Buku masih layak dijual.
Tidak terdapat transaksi lain yang membuat buku tersebut tidak tersedia.
Pesanan yang sudah dibatalkan bersifat final dan tidak dapat diaktifkan kembali. Customer dapat membuat pesanan baru jika buku masih tersedia.
Pesanan yang sudah selesai diserahkan tidak dapat dibatalkan melalui fungsi pembatalan normal. Koreksi hanya dapat dilakukan melalui prosedur koreksi data dengan alasan dan riwayat.
13. Pengembalian Dana
Pembatalan pesanan yang sudah dibayar tidak otomatis berarti refund telah dilakukan.
Status refund:
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
Sistem mencatat:
Jumlah dana yang dikembalikan.
Waktu pengembalian.
Admin yang mencatat.
Status refund.
Riwayat setiap proses pengembalian.
Refund sebagian atau beberapa kali harus tetap dapat ditelusuri.
14. Penjualan Offline
Admin dapat mencatat penjualan langsung di booth tanpa melalui pesanan online atau bukti pembayaran QRIS.
Catatan penjualan offline meliputi:
Buku atau eksemplar yang terjual.
Harga jual aktual.
Modal buku sesuai hak akses.
Laba.
Waktu transaksi.
Admin yang mencatat.
Jenis transaksi Offline.
Harga jual offline dapat berbeda dari harga katalog.
Admin dapat mengajukan koreksi harga penjualan offline dengan alasan. Koreksi harus disetujui Admin Utama.
Nilai lama tetap berlaku sampai koreksi disetujui.
Riwayat koreksi mencatat nilai lama, nilai baru, alasan, admin pengaju, Admin Utama yang menyetujui, dan waktu.
Penjualan langsung yang pembayarannya dan penyerahan bukunya sudah dicatat oleh admin langsung berstatus Selesai.
15. Modal, Laba, dan Laporan
15.1 Perhitungan Laba
Laba kotor dihitung berdasarkan:
Laba Kotor = Harga Jual Aktual - Modal Buku
Modal disimpan per buku fisik.
Laba penjualan baru dianggap terealisasi setelah buku diserahkan dan pesanan berstatus Selesai, atau setelah penjualan offline selesai dicatat.
15.2 Riwayat Modal
Koreksi modal oleh Admin Utama menyimpan nilai lama, nilai baru, alasan, pelaku, dan waktu.
Perubahan modal tidak mengubah laba historis penjualan yang sudah selesai.
Admin Utama dapat melihat:
Laba historis berdasarkan modal yang berlaku ketika transaksi selesai.
Laba hasil perhitungan ulang berdasarkan modal terbaru.
Kedua nilai tersebut harus dibedakan dengan jelas.
15.3 Laporan
Hanya Admin Utama yang dapat mengakses laporan penjualan dan laporan keuangan.
Laporan MVP mencakup:
Penjualan harian.
Penjualan bulanan.
Penjualan tahunan.
Total pembayaran yang telah diverifikasi.
Jumlah buku terjual.
Riwayat transaksi.
Laba kotor dari penjualan yang sudah selesai.
Pemisahan penjualan online dan offline.
Riwayat pembatalan dan refund.
Pembayaran yang sudah diverifikasi tetapi buku belum diserahkan dihitung sebagai pembayaran diterima, bukan penjualan selesai atau laba terealisasi.
Laporan laba harus menggunakan harga jual aktual dan modal yang sesuai dengan aturan riwayat modal.
Ekspor Excel dan laporan buku terlaris tidak termasuk MVP.
16. Notifikasi
Notifikasi website menjadi prioritas utama.
Notifikasi mencakup:
Pesanan baru.
Pembayaran dan unggah bukti.
Hasil pemeriksaan bukti pembayaran.
Permintaan bukti baru.
Perubahan tenggat.
Perubahan jadwal.
Persetujuan atau penolakan jadwal.
Pembatalan pesanan.
Refund.
Perubahan QRIS yang relevan.
Pengajuan dan keputusan banner sesuai penerima yang berwenang.
Penanganan operasional lainnya.
Setiap notifikasi mencatat penerima, isi, waktu, status baca, dan riwayat.
Notifikasi yang gagal dikirim disimpan dan dicoba kembali dengan jeda yang meningkat. Jika tetap gagal, statusnya ditandai gagal dan admin menerima peringatan.
Percobaan ulang tidak boleh menghasilkan notifikasi atau pesanan duplikat.
Notifikasi yang serupa dapat dikelompokkan pada tampilan, tetapi setiap peristiwa tetap disimpan dalam riwayat.
Integrasi WhatsApp otomatis direncanakan setelah sistem inti stabil dan bukan bagian MVP.
17. Penanganan Pesanan oleh Beberapa Admin
Dashboard admin selalu menampilkan daftar pesanan yang perlu ditangani.
Jika beberapa admin dapat menangani pesanan yang sama, sistem harus menunjukkan admin yang sedang menangani pesanan tersebut.
Sistem mencegah perubahan yang saling bertentangan melalui mekanisme penguncian penanganan sementara.
Jika admin tidak aktif, penguncian dapat berakhir otomatis.
Berakhirnya penguncian tidak mengubah status pesanan dan tidak membatalkan tindakan yang sudah berhasil disimpan.
Riwayat tindakan setiap admin tetap dipertahankan.
18. Toko Libur
18.1 Pengaturan Toko Libur
Hanya Admin Utama yang dapat membuka dan menutup Toko Libur secara manual.
Setiap tindakan membuka atau menutup toko harus memiliki alasan dengan batas maksimal 200 karakter.
Tidak ada jadwal otomatis untuk membuka atau menutup toko.
Admin Biasa hanya dapat melihat status toko dan riwayatnya, tanpa kontrol untuk mengubah status.
18.2 Perilaku Ketika Toko Tutup
Ketika toko tutup:
Pengunjung tetap dapat melihat katalog.
Customer tetap dapat mendaftar dan login.
Customer tetap dapat mengelola akun.
Customer tetap dapat menambahkan buku ke keranjang.
Customer tidak dapat membuat pesanan baru.
Pesanan yang sudah ada tetap diproses sesuai statusnya.
Tenggat pembayaran yang sudah berjalan tidak dihentikan hanya karena toko tutup.
Penjualan offline tetap dicatat sesuai kegiatan toko.
Server harus menolak checkout ketika toko sedang tutup.
Jika status toko tidak dapat dipastikan karena gangguan komunikasi atau pemeriksaan sistem, checkout juga harus diblokir sementara sampai status toko dapat dipastikan.
18.3 Pembaruan Status
Status toko diperbarui melalui polling setiap 5 detik pada halaman yang relevan, seperti halaman toko, katalog, dan checkout.
Polling tidak diperlukan pada halaman login.
Polling dapat dihentikan sementara ketika halaman atau tab tidak aktif.
Jika status toko belum dapat dipastikan, sistem tidak boleh mengizinkan checkout.
Tidak perlu mengirim notifikasi Customer hanya karena toko dibuka atau ditutup.
Informasi status toko ditampilkan pada halaman toko, katalog, dan halaman Customer yang relevan.
18.4 Riwayat Toko Libur
Sistem menyimpan riwayat pembukaan dan penutupan toko, termasuk:
Admin yang melakukan tindakan.
Waktu tindakan.
Status toko.
Alasan.
Riwayat ditampilkan dengan pagination sebanyak 20 data per halaman.
Admin Utama dapat menghapus riwayat Toko Libur.
Penghapusan massal harus bersifat atomik. Jika satu bagian proses gagal, seluruh proses dibatalkan agar tidak terjadi penghapusan sebagian.
Penghapusan riwayat tidak memerlukan alasan tambahan, tetapi tetap menghasilkan audit log.
19. Riwayat Aktivitas dan Audit
Sistem harus menyimpan riwayat aktivitas yang relevan, terutama untuk:
Perubahan harga.
Perubahan modal.
Penjualan offline.
Koreksi transaksi.
Verifikasi pembayaran.
Pembatalan.
Perubahan jadwal.
Perubahan tenggat.
Perubahan hak akses.
Penonaktifan dan penghapusan akun.
Perubahan QRIS.
Pengelolaan banner.
Perubahan status Toko Libur.
Backup dan pemulihan data.
Riwayat mencakup pelaku, waktu, tindakan, alasan jika diwajibkan, serta perubahan nilai lama dan baru jika relevan.
Audit log hanya dapat dilihat oleh Admin Utama.
Audit log bersifat immutable. Setelah dibuat, catatan audit tidak dapat diedit atau dihapus melalui fungsi aplikasi, termasuk oleh Admin Utama.
Riwayat transaksi tidak boleh hilang hanya karena data katalog berubah atau akun Customer dinonaktifkan maupun dihapus.
20. Backup dan Pemulihan Data
Sistem harus menyediakan backup otomatis dan manual.
Backup otomatis dilakukan setiap hari dengan masa retensi 30 hari.
Backup harus mencakup:
Database.
Foto buku.
Gambar QRIS.
Bukti pembayaran.
Gambar banner.
File penting lain yang dibutuhkan untuk memulihkan aplikasi.
Backup harus dienkripsi menggunakan mekanisme yang sesuai. Kunci enkripsi disimpan terpisah dari file backup.
Akses backup dibatasi untuk Admin Utama dan pihak teknis yang memang diberi izin.
Backup tidak dianggap berhasil hanya karena file cadangan berhasil dibuat. Proses pemulihan harus diuji sebelum peluncuran dan secara berkala setelah sistem digunakan.
21. Desain dan Pengalaman Pengguna
21.1 Identitas Visual
Akira Books menggunakan gaya hangat dan klasik dengan nuansa kertas.
Arah visual:
Krem sebagai warna dasar.
Cokelat untuk navigasi dan elemen penting.
Tipografi yang mudah dibaca.
Foto buku sebagai fokus utama.
Tata letak bersih dan nyaman.
Tampilan minimalis yang konsisten.
21.2 Bahasa
Seluruh antarmuka menggunakan Bahasa Indonesia, termasuk:
Menu.
Tombol.
Status pesanan.
Notifikasi.
Validasi formulir.
Pesan kesalahan.
Petunjuk pembayaran dan pengambilan.
21.3 Responsivitas
Website harus nyaman digunakan pada layar HP, tablet, dan komputer.
Admin harus dapat mengelola buku, pesanan, bukti pembayaran, jadwal, dan transaksi melalui browser HP.
Dashboard tidak boleh mengandalkan tabel lebar tanpa penyesuaian. Informasi penting harus mudah dibaca, tombol mudah disentuh, dan formulir tidak merepotkan pada layar kecil.
22. Status Utama Sistem
Status pesanan dan status pendukung tidak boleh dicampur menjadi satu kolom yang menyebabkan alur membingungkan.
22.1 Status Pesanan
Status utama:
Menunggu Pembayaran.
Sudah Dibayar.
Menunggu Diambil.
Selesai.
Dibatalkan.
22.2 Status Jadwal
Status jadwal dikelola terpisah, meliputi:
Menunggu Konfirmasi.
Disetujui.
Perlu Tanggal Baru.
Perubahan Jadwal Menunggu Persetujuan.
22.3 Status Bukti Pembayaran
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
22.4 Status Refund
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
22.5 Status Pengajuan Banner
Menunggu Persetujuan.
Disetujui.
Ditolak.
Dibatalkan.
22.6 Status Banner Terbit
Aktif.
Nonaktif.
22.7 Aturan Transisi
Perubahan status harus dilakukan melalui logika server yang memvalidasi:
Status sebelumnya.
Peran pelaku.
Tenggat.
Kondisi stok.
Persetujuan yang diperlukan.
Setiap perubahan penting harus menghasilkan riwayat yang dapat ditelusuri.
Status pesanan, jadwal, bukti pembayaran, refund, pengajuan banner, dan banner terbit harus dikelola secara terpisah sesuai fungsi masing-masing.
23. Batasan MVP
Fokus versi pertama adalah operasional inti Akira Books.
Termasuk MVP:
Login dan pengelolaan akun.
Hak akses Pengunjung, Customer, Admin Biasa, dan Admin Utama.
Pengamanan login, OTP, dan pemulihan akun.
Katalog, pencarian, filter, serta detail buku.
Pengelolaan buku fisik dan kategori.
Modal per buku yang hanya dikelola Admin Utama.
Keranjang dan pembuatan pesanan.
QRIS dan unggah bukti pembayaran.
Verifikasi pembayaran dua tahap.
Tenggat pembayaran dan pembatalan.
Jadwal pengambilan hari Minggu.
Pembatalan dan penyelesaian pesanan.
Pengembalian dana.
Penjualan offline.
Koreksi transaksi dan riwayat.
Laporan penjualan khusus Admin Utama.
Notifikasi website.
Banner promosi dan pengelolaannya.
Toko Libur.
Audit log.
Backup otomatis dan manual.
Tampilan responsif untuk HP.
Belum termasuk MVP:
Aplikasi Android atau iOS terpisah.
Integrasi WhatsApp otomatis.
Ekspor Excel.
Laporan buku terlaris.
Sistem pembayaran gateway otomatis.
Fitur marketplace atau multi-toko.

Catatan pembagian dokumen:
Bagian 24 (Tahapan Implementasi) dan bagian 25 (Kriteria Kesiapan Sebelum Coding) dari dokumen lama dipindahkan ke 04-implementation-plns.md. Keduanya tetap menjadi acuan pengerjaan proyek dan tidak dihapus dari dokumentasi Akira Books.


