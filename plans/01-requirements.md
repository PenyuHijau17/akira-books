AKIRA BOOKS — REQUIREMENTS
1. Tujuan Proyek
Akira Books adalah website untuk membantu pengelolaan toko buku bacaan original dan bekas, mulai dari katalog, pesanan, pembayaran, jadwal pengambilan, hingga pencatatan transaksi.
Website mendukung kegiatan penjualan langsung di booth CFD yang beroperasi setiap Minggu pagi dan berakhir tepat pukul 09.00.
Website bukan marketplace. Pengelolaan toko dilakukan oleh admin, sedangkan pelanggan dapat melihat katalog dan melakukan pemesanan melalui website.
Akira Books dikembangkan untuk:
Menyediakan katalog buku yang dapat diakses secara online.
Mempermudah pelanggan memesan buku dan mengunggah bukti pembayaran.
Membantu admin mengelola buku, pesanan, jadwal pengambilan, dan transaksi.
Mencatat modal serta menghitung laba kotor per unit buku.
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
Deskripsi.
Harga jual.
Modal per unit buku.
Jumlah stok total (kuantitas numerik integer >= 0). 
Riwayat perubahan data.
Buku yang memiliki judul, penulis, penerbit, dan tahun terbit sama tetap dapat memiliki kondisi, foto, harga jual, serta modal yang berbeda.
5.2 Modal Buku
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
5.3 Stok
Setiap buku fisik merupakan satu data dengan stok tersedia 0 atau 1.
Status buku harus membedakan antara:
Tersedia.
Sedang Dipesan.
Terjual.
Nonaktif.
Buku yang sedang dipesan tetap dapat terlihat di katalog, tetapi tidak dapat dipesan Customer lain.
Buku yang terjual atau dinonaktifkan tidak tampil sebagai buku tersedia. Riwayat buku tetap dipertahankan sesuai aturan penyimpanan data.
5.4 Perubahan dan Penghapusan Buku
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
Jumlah unit buku terjual.
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


