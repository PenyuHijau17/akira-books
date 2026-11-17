AKIRA BOOKS — BUSINESS RULES
1. Prinsip Dasar
Database dan server menjadi sumber kebenaran untuk status, transaksi, stok, pembayaran, dan data operasional.
Stok buku dihitung sebagai kuantitas total numerik (integer >= 0) untuk setiap data judul buku gabungan tanpa memisahkan rincian kondisi fisik per item. .
Setiap perubahan sensitif harus melalui validasi hak akses dan memiliki riwayat yang sesuai.
Status pesanan utama, status bukti pembayaran, status jadwal, dan status refund merupakan hal berbeda dan tidak boleh digabung.
Pesanan yang sudah dibatalkan bersifat final dan tidak dapat diaktifkan kembali.
Gangguan koneksi atau pengiriman permintaan berulang tidak boleh menyebabkan transaksi maupun tindakan tercatat dua kali.
Semua penentuan waktu menggunakan waktu server. Zona waktu yang digunakan untuk tampilan adalah Asia/Jakarta (WIB).
Admin Utama adalah pemilik toko dan hanya ada satu Admin Utama.
Audit administratif bersifat immutable (tidak dapat diubah atau dihapus melalui fungsi aplikasi) dan hanya dapat dibaca Admin Utama.
Keputusan bisnis final harus dibedakan dari rekomendasi teknis yang masih perlu disetujui.
2. Hak Akses Berdasarkan Peran
2.1 Pengunjung
Pengunjung dapat melihat katalog, detail buku, informasi toko, dan banner aktif.
Pengunjung tidak dapat membuat pesanan.
Pengunjung harus memiliki akun dan login untuk melakukan pemesanan.
2.2 Customer
Customer hanya dapat mengakses profil, keranjang, pesanan, pembayaran, jadwal, dan riwayat miliknya sendiri.
Customer tidak boleh melihat data Customer lain.
Customer tidak boleh melihat modal, keuntungan, laporan keuangan, atau bukti pembayaran milik orang lain.
Customer yang akunnya dinonaktifkan tidak dapat login atau membuat pesanan baru.
Penonaktifan sementara Customer tidak berakhir otomatis. Akun hanya aktif kembali setelah Admin mengaktifkannya secara manual.
Penonaktifan akun tidak menghapus riwayat transaksi dan tidak otomatis membatalkan pesanan yang sudah ada.
Permintaan penghapusan akun ditunda selama masih ada pesanan aktif atau kewajiban yang belum selesai. Catatan transaksi yang wajib dipertahankan tidak ikut dihapus.
2.3 Admin Biasa
Admin Biasa menangani operasional sesuai hak aksesnya.
Admin Biasa boleh mengelola buku, kategori, pesanan, jadwal, penjualan offline, dan tindakan operasional lain yang diizinkan.
Admin Biasa tidak boleh melihat atau mengubah modal dan keuntungan.
Admin Biasa tidak boleh mengakses laporan keuangan.
Admin Biasa tidak boleh mengelola akun admin atau mengubah peran admin.
Admin Biasa tidak boleh menyetujui pembayaran pada tahap final.
Admin Biasa tidak boleh mengelola banner yang sudah diterbitkan.
Admin Biasa tidak boleh membuka atau menutup Toko Libur.
Admin Biasa hanya boleh membatalkan pesanan sesuai batas kewenangan pada bagian Pembatalan Pesanan.
2.4 Admin Utama
Sistem hanya memiliki satu Admin Utama.
Admin Utama memiliki kewenangan khusus untuk mengelola akun admin, hak akses, modal, laporan keuangan, QRIS, persetujuan final pembayaran, koreksi transaksi, audit, Toko Libur, dan banner.
Hanya Admin Utama yang dapat menetapkan atau mengubah pihak yang menjadi Admin Utama.
Tidak ada mekanisme persetujuan final oleh Admin Utama kedua.
2.5 Penegakan Hak Akses
Semua pemeriksaan izin harus dilakukan di server.
Menyembunyikan menu atau tombol pada UI tidak cukup untuk melindungi data dan tindakan.
Admin Biasa tidak boleh menerima data modal atau keuntungan dalam respons server, API, DTO, maupun data yang dikirim ke browser.
Identitas historis admin yang dinonaktifkan atau dihapus tetap harus dapat ditelusuri.
3. Status dan Ketersediaan Buku
Status buku:
Tersedia.
Sedang Dipesan.
Terjual.
Nonaktif.
Aturan:
Buku hanya dapat dipesan jika statusnya Tersedia dan masih layak dijual.
Keranjang tidak menahan stok.
Stok ditahan ketika pesanan berhasil dibuat dan validasi server berhasil.
Satu eksemplar tidak boleh ditahan oleh dua pesanan aktif.
Buku yang dibatalkan pesanannya kembali tersedia hanya jika masih aktif dan layak dijual.
Buku nonaktif atau terjual tidak otomatis tersedia kembali setelah pembatalan.
Buku yang memiliki riwayat transaksi tidak boleh dihapus permanen.
Admin boleh mengubah harga jual atau kondisi buku meskipun masih ada pesanan aktif. Pesanan yang sudah dibuat tetap menggunakan snapshot harga dan kondisi ketika pesanan dibuat.
Hanya Admin Utama yang boleh menggabungkan data buku duplikat. Penggabungan harus mempertahankan keterhubungan seluruh riwayat pesanan dan transaksi.
Modal dicatat per eksemplar dan hanya dapat dikelola Admin Utama.
3.1 Penjualan Offline dan Keranjang
Jika buku terjual secara offline:
Buku harus dihapus dari keranjang Customer yang terdampak.
Customer diberi tahu bahwa buku tersebut tidak lagi tersedia.
Jika masih ada buku lain di keranjang, Customer wajib memeriksa dan menyetujui kembali isi keranjang sebelum melanjutkan pesanan.
Persetujuan ulang dicatat sebagai versi atau snapshot keranjang yang disetujui.
Ketersediaan buku lain tetap diperiksa kembali ketika pesanan dibuat.
4. Pembuatan Pesanan dan Pencegahan Duplikat
Server memeriksa stok ketika Customer menekan Buat Pesanan.
Pemeriksaan dan penahanan stok harus dilakukan secara atomik.
Jika stok sudah dipesan Customer lain, permintaan berikutnya ditolak dengan pesan yang jelas.
Pengulangan permintaan yang sama harus mengembalikan hasil pesanan yang sudah dibuat, bukan membuat pesanan baru.
Jika penyimpanan pesanan berhasil tetapi respons gagal dikirim, pengulangan permintaan tidak boleh membuat pesanan baru.
Data pesanan menyimpan snapshot judul, kondisi, harga, tenggat, dan informasi lain yang diperlukan pada waktu pemesanan.
Server memeriksa status toko setiap kali Customer membuat pesanan.
Jika toko tutup, pesanan ditolak.
Status toko, ketersediaan buku, stok, dan harga diperiksa kembali di server saat Customer mengirim pesanan.
Jika status toko tidak dapat dipastikan, pesanan ditolak sementara sampai status terkonfirmasi.
Jika Admin Utama menutup toko ketika Customer sedang membuka checkout, server tetap harus menolak pembuatan pesanan.
Buku di keranjang tidak otomatis dihapus ketika stok habis, harga berubah, atau buku dinonaktifkan. Customer diberi tahu mengenai perubahan yang menghalangi pemesanan.
Pengecualian berlaku untuk buku yang terjual secara offline: buku tersebut dikeluarkan dari keranjang Customer terdampak dan Customer harus menyetujui kembali keranjang yang tersisa.
Perubahan harga, kondisi, atau ketersediaan setelah persetujuan ulang keranjang harus diperiksa kembali saat checkout.
Keranjang dipertahankan ketika pesanan ditolak.
5. Status Pesanan dan Status Terkait
Status utama dan status pendukung harus disimpan secara terpisah.
5.1 Status Pesanan Utama
Menunggu Pembayaran.
Sudah Dibayar.
Menunggu Diambil.
Selesai.
Dibatalkan.
Alur normal:
Menunggu Pembayaran → Sudah Dibayar → Menunggu Diambil → Selesai.
Dibatalkan merupakan status akhir.
Aturan:
Setelah pembayaran memperoleh persetujuan final, status pesanan menjadi Sudah Dibayar.
Status tetap Sudah Dibayar sampai admin mengonfirmasi jadwal pengambilan.
Setelah jadwal dikonfirmasi admin, status pesanan menjadi Menunggu Diambil.
Setelah buku benar-benar diserahkan kepada Customer, status menjadi Selesai.
Menunggu Konfirmasi hanya boleh digunakan sebagai status jadwal, bukan status pesanan utama.
Pembayaran langsung di CFD merupakan pengecualian alur persetujuan pembayaran, bukan alasan menghilangkan alur status pesanan utama.
Jika pembayaran dan penyerahan terjadi bersamaan, transisi dapat dicatat dalam satu operasi atomik dengan riwayat setiap kejadian.
5.2 Status Bukti Pembayaran
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
5.3 Status Jadwal Pengambilan
Menunggu Konfirmasi.
Disetujui.
Perlu Tanggal Baru.
Perubahan Jadwal Menunggu Persetujuan.
5.4 Status Pengembalian Dana
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
Perubahan status harus melalui logika server yang memvalidasi status sebelumnya, peran pelaku, tenggat, persetujuan, dan kondisi stok.
Status-status tersebut tidak boleh digabung menjadi satu kolom yang menyebabkan informasi saling menimpa.
6. Aturan Pembayaran
6.1 Metode Pembayaran
Metode pembayaran yang tersedia:
QRIS.
Pembayaran langsung ketika Customer datang ke booth CFD.
Pesanan dengan metode pembayaran langsung tidak memakai tenggat QRIS. Pesanan mengikuti batas waktu pengambilan yang disetujui admin.
6.2 Verifikasi Pembayaran QRIS
Admin Biasa memeriksa bukti pembayaran dan mengirim hasil pemeriksaan awal.
Pembayaran baru dinyatakan final setelah disetujui satu-satunya Admin Utama.
Setelah persetujuan final, status pesanan menjadi Sudah Dibayar dan status bukti menjadi Terverifikasi.
Tidak ada persetujuan pembayaran otomatis.
Tidak ada eskalasi kepada Admin Utama kedua karena sistem hanya memiliki satu Admin Utama.
Pemeriksaan awal oleh Admin Biasa dan persetujuan final oleh Admin Utama merupakan alur yang wajib digunakan.
Semua hasil pemeriksaan, keputusan, pelaku, alasan jika diwajibkan, dan waktu harus dicatat.
6.3 Bukti Ditolak dan Bukti Baru
Bukti yang ditolak wajib memiliki alasan dan tenggat penggantian.
Bukti lama tetap tersimpan sebagai riwayat.
Bukti terbaru menjadi bukti aktif.
Status bukti menjadi Perlu Bukti Baru.
Status pesanan tetap Menunggu Pembayaran.
Setelah Customer mengunggah bukti baru, status bukti kembali Menunggu Verifikasi.
Bukti yang berhasil diunggah sebelum tenggat tidak otomatis menyebabkan pembatalan hanya karena belum selesai diperiksa.
Customer yang mengunggah tepat waktu tetap dianggap tepat waktu meskipun admin terlambat memeriksa.
Waktu unggah ditentukan berdasarkan catatan server.
Bukti yang diunggah setelah pesanan resmi dibatalkan tidak dapat mengaktifkan kembali pesanan.
Pengulangan unggahan atau pengiriman hasil pemeriksaan tidak boleh menghasilkan catatan duplikat.
6.4 Satu Pembayaran untuk Beberapa Pesanan
Satu pembayaran yang mencakup beberapa pesanan harus memiliki hubungan yang dapat ditelusuri ke setiap pesanan.
Jumlah dan status pembayaran harus dapat ditelusuri tanpa menghilangkan identitas masing-masing pesanan.
6.5 Pembayaran Langsung di CFD
Admin Biasa boleh mencatat pembayaran langsung tanpa persetujuan final Admin Utama.
Pembayaran dan penyerahan buku harus dicatat sebagai kejadian yang berbeda.
Buku tidak dianggap diserahkan sebelum admin mengonfirmasi penyerahan.
Jika pembayaran dan penyerahan terjadi bersamaan, transisi status utama dapat dicatat dalam satu operasi atomik dengan riwayat setiap kejadian.
Setelah pembayaran dan penyerahan dikonfirmasi, pesanan langsung berstatus Selesai.
Pembayaran langsung tidak menggunakan bukti pembayaran QRIS.
6.6 Perubahan Metode Pembayaran
Customer boleh mengajukan perubahan metode pembayaran setelah pesanan dibuat.
Admin Biasa boleh menyetujui atau menolak permintaan tersebut.
Seluruh permintaan dan keputusan dicatat.
Selama permintaan perubahan metode pembayaran menunggu keputusan, hitung mundur QRIS dijeda.
Jika permintaan ditolak, hitung mundur dilanjutkan dari sisa waktu yang tersimpan, bukan dimulai ulang.
Setelah pembayaran disetujui, perubahan metode pembayaran biasa tidak diperbolehkan.
Koreksi metode setelah pembayaran disetujui hanya dapat dilakukan Admin Utama dengan alasan dan audit.
6.7 Koreksi Pembayaran
Koreksi catatan pembayaran yang telah disetujui hanya boleh dilakukan Admin Utama.
Koreksi wajib:
Memiliki alasan.
Mempertahankan persetujuan dan riwayat awal.
Mencatat nilai lama dan nilai baru jika ada perubahan data yang diperbolehkan.
Mencatat pelaku dan waktu.
Jumlah uang pada pembayaran yang sudah disetujui tidak boleh diubah melalui proses koreksi.
Koreksi pembayaran tidak otomatis berarti dana telah dikembalikan.
7. Tenggat Pembayaran
Tenggat QRIS default adalah 24 jam sejak pesanan dibuat.
Tenggat global hanya dapat diubah Admin Utama.
Perubahan tenggat global hanya berlaku untuk pesanan baru.
Pesanan yang sudah dibuat menggunakan snapshot tenggat saat pesanan dibuat.
Perubahan tenggat global tidak mengubah tenggat pesanan lama.
Perubahan tenggat global tidak memerlukan catatan perubahan khusus.
Tenggat khusus setiap pesanan dapat berbeda dari tenggat global.
Permintaan perpanjangan melalui website atau WhatsApp dapat disetujui atau ditolak Admin Biasa.
Permintaan melalui WhatsApp harus dicatat di website, termasuk alasan, keputusan, dan tenggat baru jika disetujui.
Permintaan perpanjangan tidak otomatis menghentikan hitung mundur.
Jeda hitung mundur hanya berlaku ketika permintaan perubahan metode pembayaran sedang menunggu keputusan.
Jika permintaan perubahan metode pembayaran ditolak, hitung mundur dilanjutkan dari sisa waktu sebelumnya.
Jika tidak ada bukti sampai tenggat, pesanan dibatalkan otomatis sesuai aturan.
Pembatalan otomatis mencatat alasan, waktu, aktor System, dan riwayat.
Jika bukti telah diunggah tepat waktu tetapi belum diperiksa, pesanan tidak boleh dibatalkan hanya karena pemeriksaan belum selesai.
Admin Utama menyelesaikan persetujuan atau penolakan bukti yang masih menunggu keputusan final.
Sistem mengingatkan admin setiap dua jam selama bukti tepat waktu masih menunggu pemeriksaan.
Pengingat harus tetap berjalan setelah server restart dan tidak boleh terkirim berulang kali secara tidak sengaja.
Jika bukti baru diwajibkan dan tenggat penggantian terlewati tanpa unggahan, sistem menjalankan aturan tenggat yang berlaku.
Jika unggahan dan pembatalan terjadi bersamaan, server harus memastikan hanya satu hasil yang sah berdasarkan waktu dan status terbaru.
8. Jadwal Pengambilan
Tanggal pengambilan harus berupa hari Minggu di masa mendatang.
Customer memilih tanggal, bukan jam.
Jam tutup booth adalah pukul 09.00.
Status jadwal terpisah dari status pesanan utama.
Setelah pembayaran memperoleh persetujuan final, status pesanan tetap Sudah Dibayar sampai admin mengonfirmasi jadwal pengambilan.
Setelah jadwal dikonfirmasi, status pesanan menjadi Menunggu Diambil.
Setelah buku diserahkan, status menjadi Selesai.
Penolakan jadwal wajib memiliki alasan.
Perubahan jadwal yang diusulkan admin wajib memiliki alasan dan baru berlaku setelah disetujui Customer.
Customer boleh menolak usulan jadwal admin dengan alasan dan mengajukan tanggal baru.
Customer boleh mengajukan perubahan jadwal berkali-kali.
Customer boleh membatalkan permintaan perubahan jadwal yang masih menunggu keputusan.
Jika tanggal terlewati sebelum keputusan dibuat, Customer harus memilih tanggal baru.
Permintaan perubahan jadwal yang belum diputuskan admin menghasilkan pengingat setiap dua jam.
Ketidakhadiran Customer tidak otomatis membatalkan pesanan.
Admin menentukan apakah pesanan ditunggu, dijadwalkan ulang, atau dibatalkan.
Pembatalan akibat Customer melewatkan jadwal wajib memiliki alasan.
Jika pesanan ditunggu, admin menetapkan tenggat baru dan alasan.
Buku tetap direservasi sampai pembatalan dilakukan secara resmi.
Penggabungan jadwal beberapa pesanan tidak menggabungkan status pembayaran atau riwayat masing-masing pesanan.
9. Pembatalan Pesanan
9.1 Pembatalan oleh Admin Biasa
Admin Biasa boleh membatalkan:
Pesanan yang belum dibayar.
Pesanan yang belum memperoleh persetujuan final pembayaran dari Admin Utama, termasuk pesanan yang bukti pembayarannya sedang diperiksa.
Setiap pembatalan wajib:
Memiliki alasan.
Dicatat dalam riwayat pesanan.
Dicatat dalam audit administratif.
Mencatat Admin Biasa yang melakukan pembatalan dan waktu tindakan.
Mengirim notifikasi kepada Customer.
Mengirim notifikasi kepada Admin Utama.
9.2 Pembatalan oleh Admin Utama
Setelah pembayaran memperoleh persetujuan final Admin Utama, pembatalan hanya boleh ditangani Admin Utama.
Pembatalan oleh admin wajib memiliki alasan dan riwayat.
9.3 Pembatalan Otomatis
Sistem dapat membatalkan pesanan ketika tenggat pembayaran terlewati dan tidak ada bukti yang berhasil diunggah tepat waktu.
Pembatalan otomatis mencatat aktor System, alasan, waktu, dan perubahan status.
9.4 Aturan Umum Pembatalan
Pesanan batal bersifat final dan tidak dapat diaktifkan kembali.
Pembatalan tidak otomatis berarti pengembalian dana telah dilakukan.
Pesanan selesai yang bukunya sudah diserahkan tidak boleh dibatalkan seperti pesanan biasa.
Koreksi catatan pesanan selesai hanya boleh dilakukan Admin Utama dengan alasan dan riwayat perubahan.
Koreksi data tidak otomatis mengaktifkan kembali pesanan atau menandakan bahwa dana sudah dikembalikan.
Buku yang dibatalkan pesanannya hanya kembali tersedia jika masih aktif dan layak dijual.
Pembatalan pesanan tidak boleh mengembalikan stok lebih dari satu kali.
10. Pengembalian Dana
Refund merupakan proses terpisah dari pembatalan.
Hanya Admin Utama yang boleh menyetujui pengembalian dana.
Status refund:
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
Setiap pengembalian dana mencatat jumlah, waktu, pelaku, dan riwayat.
Refund sebagian atau beberapa kali harus tetap dapat ditelusuri.
Status pesanan dan status refund tidak boleh digabung.
Pembatalan tidak boleh otomatis dianggap sebagai refund selesai.
Koreksi pembayaran tidak otomatis dianggap sebagai pengembalian dana.
11. Penjualan Offline
Admin dapat mencatat penjualan langsung di booth tanpa melalui pesanan online atau bukti pembayaran QRIS.
Penjualan offline dicatat sebagai jenis transaksi terpisah.
Catatan penjualan meliputi buku atau eksemplar, harga jual aktual, waktu transaksi, admin yang mencatat, dan data modal sesuai hak akses.
Harga jual offline boleh berbeda dari harga katalog.
Penjualan offline yang sudah mencatat pembayaran dan penyerahan buku berstatus Selesai.
Penjualan offline memperbarui ketersediaan buku.
Jika buku terjual secara offline, buku harus dikeluarkan dari keranjang Customer terdampak dan Customer diberi tahu.
Jika keranjang masih memiliki buku lain, Customer wajib memeriksa dan menyetujui ulang keranjang.
Admin dapat mengajukan koreksi harga penjualan offline dengan alasan.
Koreksi harga harus disetujui Admin Utama.
Nilai lama tetap berlaku sampai koreksi disetujui.
Riwayat koreksi mencatat nilai lama, nilai baru, alasan, admin pengaju, Admin Utama yang menyetujui, dan waktu.
12. Modal dan Perhitungan Laba
Modal dicatat untuk setiap buku fisik.
Hanya Admin Utama yang boleh menetapkan atau mengoreksi modal.
Koreksi modal wajib memiliki alasan.
Riwayat koreksi mencatat modal lama, modal baru, alasan, pelaku, dan waktu.
Laba kotor dihitung dari harga jual aktual dikurangi modal buku.
Laba baru dianggap terealisasi setelah buku diserahkan dan pesanan berstatus Selesai, atau setelah penjualan offline selesai dicatat.
Koreksi modal tidak boleh menghapus atau menimpa nilai laba historis.
Laporan harus menyediakan laba historis dan hasil perhitungan ulang berdasarkan modal terbaru sebagai pembanding.
Hanya Admin Utama yang boleh melihat modal dan keuntungan.
Informasi modal dan keuntungan tidak boleh disertakan dalam respons API, DTO, laporan, atau tampilan yang ditujukan kepada Admin Biasa.
Hanya Admin Utama yang boleh menggabungkan data buku duplikat, dengan seluruh riwayat pesanan dan transaksi tetap terhubung.
13. Laporan
Hanya Admin Utama yang boleh melihat laporan keuangan dan keuntungan.
Pembayaran terverifikasi dicatat sebagai uang diterima.
Penjualan selesai dicatat setelah buku diserahkan dan pesanan ditandai Selesai.
Penjualan offline dicatat sebagai jenis transaksi terpisah.
Laba kotor dihitung dari harga jual aktual dikurangi modal.
Pembayaran yang sudah diverifikasi tetapi buku belum diserahkan tidak boleh dihitung sebagai penjualan selesai atau laba terealisasi.
Laporan laba historis harus tetap menggunakan nilai modal yang berlaku saat transaksi selesai.
Perhitungan ulang menggunakan modal terbaru ditampilkan secara terpisah.
Laporan MVP mencakup penjualan harian, bulanan, tahunan, total pembayaran terverifikasi, jumlah buku terjual, riwayat transaksi, laba kotor, pemisahan transaksi online/offline, serta riwayat pembatalan dan refund.
14. Notifikasi
Notifikasi website menjadi kanal utama.
Integrasi otomatis WhatsApp bukan bagian MVP. Permintaan melalui WhatsApp ditangani manual dan dicatat di website.
Kegagalan notifikasi tidak membatalkan pesanan yang berhasil dibuat.
Notifikasi gagal disimpan dan dicoba kembali dengan jeda yang makin panjang.
Kegagalan berulang ditandai dan memunculkan peringatan kepada admin.
Pengiriman ulang tidak boleh menghasilkan notifikasi duplikat.
Notifikasi sejenis boleh dikelompokkan, tetapi riwayat setiap kejadian tetap tersedia.
Sistem mengingatkan admin setiap dua jam selama bukti tepat waktu masih menunggu pemeriksaan.
Pengingat harus tetap berjalan setelah server restart dan tidak boleh terkirim berulang kali secara tidak sengaja.
Admin Utama harus menerima notifikasi ketika Admin Biasa membatalkan pesanan yang belum memperoleh persetujuan final pembayaran.
Notifikasi banner mengikuti aturan penerima pada proses pengajuan, pembatalan, persetujuan, dan penolakan banner.
15. Penanganan Pesanan oleh Beberapa Admin
Sistem mencatat admin yang sedang menangani pesanan.
Admin lain boleh melihat detail pesanan, tetapi perubahan yang bertentangan harus dicegah.
Penanda penanganan memiliki masa berlaku.
Penanda berakhir otomatis jika admin tidak aktif.
Kedaluwarsa penanda tidak mengubah status pesanan.
Kedaluwarsa penanda tidak membatalkan tindakan yang sudah berhasil disimpan.
Penguncian penanganan tidak boleh menjadi pengganti validasi hak akses dan status transaksi.
Setiap tindakan yang berhasil tetap memiliki riwayat pelaku dan waktu.
16. Banner Promosi
16.1 Pengajuan Banner
Admin Biasa mengajukan banner kepada Admin Utama.
Gambar wajib disertakan.
URL tujuan, judul, dan deskripsi bersifat opsional.
Judul dan deskripsi dapat diisi terpisah atau bersamaan.
Maksimal terdapat 3 pengajuan pending untuk setiap Admin Biasa.
Batas 3 dihitung per admin, bukan keseluruhan admin.
Pengajuan yang dibatalkan, ditolak, atau disetujui tidak dihitung sebagai pending.
Admin Biasa boleh membatalkan pengajuannya sendiri selama masih pending.
Pembatalan mengubah status menjadi Dibatalkan.
Pembatalan pengajuan tidak mengirim notifikasi kepada Admin Utama.
Pengajuan banner tidak otomatis mengirim notifikasi kepada Admin Utama.
Admin Utama memeriksa pengajuan secara manual.
Admin Utama dapat melihat jumlah keseluruhan pengajuan pending.
Admin Biasa hanya dapat melihat jumlah pengajuan pending miliknya sendiri.
16.2 Persetujuan Pengajuan
Hanya Admin Utama yang dapat menyetujui atau menolak pengajuan.
Admin Utama melihat gambar, URL, judul, deskripsi, dan identitas pengaju.
Admin Utama tidak mengedit isi pengajuan.
Alasan penolakan bersifat opsional.
Admin Biasa dapat melihat status pengajuannya sendiri, tetapi tidak dapat melihat alasan penolakan.
Identitas pengaju hanya terlihat oleh Admin Utama.
Pengajuan yang ditolak tidak dapat diedit atau diajukan ulang. Admin Biasa harus membuat pengajuan baru.
Pengajuan yang dibatalkan tidak lagi dihitung sebagai pending.
16.3 Penerbitan dan Jumlah Banner Aktif
Admin Utama dapat membuat dan menerbitkan banner sendiri tanpa proses persetujuan.
Banner yang disetujui langsung diterbitkan jika kapasitas banner aktif tersedia.
Maksimal terdapat 7 banner aktif pada satu waktu.
Banner pending tidak dihitung dalam batas 7 banner aktif.
Banner nonaktif tidak dihitung dalam batas 7 banner aktif.
Jika jumlah banner aktif telah mencapai batas maksimal 7 banner, sistem harus memblokir publikasi banner tambahan. Admin Utama harus menonaktifkan atau menghapus salah satu banner aktif terlebih dahulu sebelum dapat menerbitkan banner lainnya. Sistem tidak boleh menonaktifkan atau mengganti banner secara otomatis.


Tidak ada penggantian banner otomatis.
Banner yang disetujui tidak memiliki jadwal mulai atau berakhir otomatis.
Banner tetap aktif sampai Admin Utama menonaktifkan atau menghapusnya.
16.4 Pengelolaan Banner Terbit
Hanya Admin Utama yang boleh mengelola banner terbit.
Admin Utama dapat mengaktifkan, menonaktifkan, mengurutkan, dan menghapus banner.
Banner nonaktif tidak ditampilkan kepada Customer.
Banner nonaktif dapat diaktifkan kembali jika jumlah banner aktif kurang dari 7.
Apabila jumlah banner aktif sudah mencapai 7, Admin Utama tidak dapat menerbitkan atau mengaktifkan kembali banner lain sampai tersedia slot. Slot dapat tersedia setelah Admin Utama menonaktifkan atau menghapus salah satu banner aktif. Banner yang dinonaktifkan tidak dihitung dalam batas maksimal 7 banner aktif.
Banner yang diaktifkan kembali ditempatkan pada posisi terakhir daftar aktif.
Admin Utama dapat mengurutkan ulang banner aktif.
Hanya banner aktif yang dapat diurutkan.
Banner yang sudah diterbitkan tidak dapat diedit, baik aktif maupun nonaktif.
Jika konten perlu diubah, banner harus dihapus permanen dan dibuat sebagai banner baru.
Penghapusan bersifat permanen tanpa tempat sampah atau pemulihan.
Penghapusan langsung dilakukan ketika Admin Utama memilih tindakan hapus.
Admin Utama memiliki daftar terpisah untuk banner aktif dan nonaktif.
Admin Biasa dapat melihat banner aktif maupun nonaktif beserta gambar, judul, deskripsi, URL, dan status, tetapi tidak dapat mengelolanya.
Admin Biasa tidak dapat melihat identitas pengaju banner.
16.5 Konten dan Tampilan
Gambar banner boleh memiliki ukuran dan rasio aspek berbeda. Sistem menyesuaikannya dengan area banner.
URL tujuan boleh tidak diisi.
URL internal membuka halaman website terkait.
URL eksternal dibuka pada tab baru.
Gambar atau URL boleh digunakan kembali secara terpisah.
Kombinasi gambar dan URL yang sama tidak boleh digunakan bersamaan pada banner aktif.
Judul dan deskripsi bersifat opsional dan dapat diisi sendiri-sendiri atau bersamaan.
Teks berada di dalam gambar, bukan di luar atau sebagai elemen terpisah di atas banner.
Posisi dan warna teks ditentukan secara otomatis.
Jika judul atau deskripsi diisi, area gambar di sebelah kiri diberi efek blur agar teks lebih mudah dibaca.
Tampilan banner bersifat minimalis dan tidak menggunakan tombol CTA terpisah.
Seluruh area banner dapat diklik apabila URL tujuan tersedia.
Batas karakter judul dan deskripsi ditentukan dalam spesifikasi teknis.
16.6 Carousel
Jika terdapat beberapa banner aktif, sistem menjalankan autoplay setelah jeda beberapa detik.
Pengunjung dapat berpindah banner secara manual.
Titik navigasi ditampilkan di bawah banner untuk menunjukkan posisi dan jumlah banner.
Setiap titik dapat diklik.
Perpindahan manual tidak menghentikan autoplay secara permanen.
Pada desktop, autoplay berhenti sementara ketika kursor berada di atas banner dan berjalan kembali setelah kursor meninggalkan area banner.
Pada mobile, autoplay berhenti sementara ketika pengguna menyentuh atau berinteraksi dengan banner dan berjalan kembali setelah interaksi selesai.
Jika hanya ada satu banner aktif, banner tampil statis tanpa autoplay, titik navigasi, atau kontrol perpindahan.
Jika tidak ada banner aktif, seluruh area banner disembunyikan.
Penghapusan satu banner tidak mengubah urutan relatif banner lain yang masih aktif.
Durasi autoplay ditentukan pada spesifikasi teknis.
17. Toko Libur
17.1 Status dan Operasional
Toko Libur berarti pemesanan online dihentikan, bukan operasional fisik toko. Admin tetap dapat berjualan di booth seperti biasa.
Hanya Admin Utama yang boleh membuka dan menutup toko secara manual.
Tidak ada penutupan atau pembukaan otomatis berdasarkan jadwal.
Status toko disimpan di server dan berlaku sama di seluruh perangkat dan browser.
Admin Biasa boleh melihat status toko, tetapi tidak boleh mengubah status atau alasan.
Keranjang tidak mengunci stok dan tidak dihapus otomatis saat toko tutup.
Customer tetap dapat mendaftar, login, melihat katalog, mengelola akun, dan menambah buku ke keranjang ketika toko tutup.
Customer tidak dapat membuat pesanan online ketika toko tutup.
Penolakan checkout wajib dilakukan di server.
Jika status toko tidak dapat dipastikan, checkout diblokir sementara sampai status terkonfirmasi.
Jika Admin Utama menutup toko saat Customer sedang membuka checkout, server tetap menolak pembuatan pesanan.
Perubahan katalog, harga, dan stok tetap dapat dilakukan saat toko tutup.
Admin tetap dapat mencatat penjualan offline saat toko tutup.
Menutup toko tidak membatalkan, menangguhkan, atau mengubah aturan pesanan aktif.
Tenggat pembayaran dan jadwal pengambilan pesanan aktif tetap berjalan.
Tidak ada notifikasi khusus kepada Customer hanya karena toko dibuka atau ditutup.
Customer tidak melihat perkiraan tanggal pembukaan kembali.
17.2 Penyegaran Status dan Antarmuka
Status toko diperbarui melalui polling setiap 5 detik pada halaman yang membutuhkan status terkini.
Polling berlaku pada halaman toko, katalog pelanggan, dan checkout pelanggan.
Polling tidak diperlukan pada halaman login dan halaman akun yang tidak membutuhkan status toko secara langsung.
Polling dijeda ketika tab browser tidak aktif dan dilanjutkan ketika tab aktif.
Kegagalan jaringan tidak boleh dianggap sebagai bukti bahwa toko otomatis terbuka atau tertutup.
Kegagalan polling tidak boleh menghapus keranjang Customer.
Jika koneksi pulih, perangkat mengambil status terbaru dari server.
Jika status belum dapat dipastikan, checkout tetap diblokir.
Tampilan mempertahankan status terakhir yang berhasil diterima dengan indikator bahwa status tersebut belum terverifikasi.
Banner Toko Libur beserta alasan terakhir yang diketahui tetap dipertahankan selama status belum dapat diverifikasi.
Waktu pembaruan status terakhir tidak perlu ditampilkan kepada Customer.
Dashboard Admin Utama menampilkan status toko dan kontrol untuk membuka atau menutup toko sesuai status terkini.
Dashboard Admin Biasa menampilkan status toko tanpa kontrol perubahan.
17.3 Alasan Penutupan
Alasan wajib diisi ketika Admin Utama menutup toko.
Panjang alasan maksimal 200 karakter.
Hanya ada satu kolom alasan yang ditampilkan kepada Customer dan admin.
Alasan tidak boleh memuat informasi internal atau rahasia.
Tidak ada pilihan alasan preset. Admin Utama mengetik alasan secara manual.
Alasan dapat diubah berulang kali selama toko masih tutup.
Perubahan alasan harus melalui pratinjau dan konfirmasi.
Jika konfirmasi dibatalkan, perubahan yang belum disimpan dibuang dan alasan lama tetap berlaku.
Jika penyimpanan gagal, alasan lama tetap berlaku dan sistem menampilkan pesan kegagalan.
Perubahan alasan tidak menyimpan versi-versi sebelumnya. Riwayat penutupan menyimpan alasan terakhir.
Ketika toko dibuka, alasan aktif dibersihkan, tetapi alasan terakhir tetap tersimpan dalam riwayat.
Membuka toko tidak memerlukan alasan.
Perubahan alasan dan status harus divalidasi di server.
17.4 Riwayat Toko Libur
Riwayat menyimpan:
Waktu toko ditutup.
Waktu toko dibuka kembali jika ada.
Nama dan peran pelaku.
Alasan terakhir.
Aturan:
Riwayat tetap tersedia setelah toko dibuka kembali.
Nama dan peran pelaku dipertahankan sebagaimana tercatat saat tindakan dilakukan, meskipun akun kemudian diganti nama, dinonaktifkan, atau dihapus.
Waktu ditampilkan sesuai zona waktu Asia/Jakarta.
Jika toko masih tutup, waktu pembukaan menampilkan Masih tutup.
Durasi dihitung otomatis. Penutupan yang masih berlangsung menampilkan durasi berjalan.
Jika data waktu tidak valid, tampilkan Tidak tersedia.
Riwayat diurutkan dari terbaru ke terlama dengan pagination 20 catatan per halaman.
Riwayat tidak menyediakan pencarian, filter, ekspor, unduhan, atau ringkasan jumlah total.
Tidak ada kolom status terpisah. Status tercermin dari kolom waktu pembukaan.
Alasan ditampilkan langsung pada setiap baris. Alasan panjang dapat dipotong dengan tanda elipsis pada daftar dan diperluas secara inline.
Beberapa alasan boleh diperluas sekaligus. Saat berpindah halaman, alasan kembali diciutkan.
Jika riwayat kosong, halaman tetap dapat dibuka dan menampilkan pesan bahwa belum ada riwayat Toko Libur.
Tombol Hapus Semua Riwayat dinonaktifkan ketika daftar kosong.
Admin Utama dan Admin Biasa boleh melihat seluruh riwayat penutupan.
Customer hanya melihat status dan alasan penutupan yang sedang berlaku, bukan riwayat historis.
17.5 Penghapusan Riwayat
Hanya Admin Utama yang boleh menghapus riwayat Toko Libur.
Riwayat penutupan yang masih aktif tidak boleh dihapus.
Admin Utama boleh menghapus satu catatan atau seluruh riwayat yang sudah tidak aktif.
Penghapusan tidak memerlukan alasan wajib.
Penghapusan memerlukan konfirmasi biasa, bukan kata konfirmasi khusus.
Penghapusan bersifat permanen tanpa tempat sampah atau pemulihan.
Setiap penghapusan wajib dicatat dalam audit administratif terpisah.
Audit tersebut tidak ikut terhapus.
Penghapusan massal harus atomik. Jika satu bagian gagal, seluruh operasi dibatalkan agar tidak terjadi penghapusan sebagian.
Penghapusan riwayat tidak mengubah status toko maupun banner pelanggan.
Setelah berhasil, daftar diperbarui tanpa memuat ulang seluruh halaman.
Jika penghapusan gagal, riwayat tetap utuh dan admin menerima pesan kegagalan.
Perangkat lain harus memperbarui riwayat secara otomatis. Jika perangkat sedang luring, setelah koneksi pulih perangkat mengambil ulang data terbaru dari server.
Riwayat yang sudah dihapus tidak boleh muncul kembali dari data lokal.
17.6 Konsistensi Toko Libur
Perubahan status toko dan pembuatan catatan riwayat dilakukan secara atomik.
Jika salah satunya gagal, tindakan tidak dianggap berhasil.
Penutupan atau pembukaan yang berulang maupun bersamaan tidak boleh membuat status tidak konsisten atau riwayat duplikat.
Penghapusan massal riwayat dilakukan secara atomik.
Setelah koneksi pulih, status toko dan riwayat disegarkan dari server.
Semua pemeriksaan otorisasi dan status penting dilakukan di server.
18. Koreksi Data dan Riwayat
Koreksi sensitif harus mencatat pelaku, waktu, nilai sebelum dan sesudah, serta alasan jika diwajibkan.
Koreksi status pesanan yang telah selesai hanya dapat dilakukan Admin Utama.
Koreksi status pesanan selesai hanya boleh mengembalikan status ke status sebelumnya yang benar-benar tercatat.
Koreksi status wajib memiliki alasan dan riwayat.
Koreksi transaksi yang sudah selesai hanya dapat dilakukan Admin Utama dengan alasan dan riwayat perubahan.
Koreksi catatan pembayaran yang telah disetujui hanya boleh dilakukan Admin Utama, wajib memiliki alasan, dan mempertahankan persetujuan serta riwayat awal.
Jumlah uang pada pembayaran yang telah disetujui tidak boleh diubah melalui koreksi.
Koreksi data tidak otomatis mengubah status transaksi, mengaktifkan kembali pesanan, atau menandakan dana sudah dikembalikan.
Koreksi pembayaran tidak otomatis berarti dana telah dikembalikan.
Audit administratif bersifat append-only dan hanya dapat dilihat Admin Utama.
Audit administratif tidak dapat diedit atau dihapus melalui fungsi aplikasi, termasuk oleh Admin Utama.
Penghapusan riwayat Toko Libur dicatat dalam audit administratif terpisah dan tidak menghapus audit tersebut.
Setiap tindakan yang diulang setelah gangguan koneksi harus mencegah perubahan atau catatan ganda.
19. Aturan Implementasi dan Konsistensi Sistem
19.1 Validasi dan Otorisasi
Semua pemeriksaan izin dan validasi transaksi wajib dilakukan di server.
UI tidak boleh menjadi satu-satunya perlindungan terhadap transaksi ganda atau kebocoran data.
Data modal dan keuntungan tidak boleh disertakan dalam respons untuk Admin Biasa.
Operasi sensitif harus memeriksa peran, status, dan kondisi terbaru sebelum disimpan.
Tindakan yang memerlukan autentikasi ulang atau OTP harus memverifikasi ulang sebelum perubahan dilakukan.
19.2 Transaksi dan Idempotensi
Transaksi database harus menjaga konsistensi stok, pesanan, pembayaran, dan riwayat.
Perubahan stok dan pembuatan pesanan harus aman terhadap permintaan bersamaan.
Operasi yang dapat terkirim berulang harus memiliki strategi idempotensi yang sesuai.
Pengulangan permintaan tidak boleh menghasilkan pesanan, pembayaran, notifikasi, perubahan status, atau catatan audit duplikat.
Operasi yang memerlukan beberapa perubahan sekaligus harus menggunakan transaksi atomik atau mekanisme setara.
Penghapusan massal riwayat Toko Libur harus memastikan seluruh operasi berhasil atau seluruhnya dibatalkan.
19.3 Pengingat dan Pekerjaan Terjadwal
Pengingat dua jam harus tetap berjalan setelah server restart.
Pengingat tidak boleh bergantung hanya pada timer yang hidup di proses aplikasi.
Pengingat harus mencegah pengiriman ganda untuk periode yang sama.
Pekerjaan tertunda harus dapat dilanjutkan setelah gangguan atau restart.
Pengiriman notifikasi dan pengingat yang gagal harus memiliki mekanisme retry yang aman.
19.4 Waktu dan Snapshot
Waktu transaksi dan tenggat menggunakan waktu server.
Tampilan waktu menggunakan zona waktu Asia/Jakarta (WIB).
Perbandingan tenggat tidak boleh menggunakan waktu perangkat Customer.
Snapshot harga, kondisi, tenggat, dan data pesanan harus tetap sesuai dengan keadaan ketika pesanan dibuat.
Snapshot tidak boleh ditimpa oleh perubahan katalog atau pengaturan global.
19.5 Audit dan Data Sensitif
Audit administratif dirancang append-only.
Aplikasi tidak menyediakan fungsi untuk mengubah atau menghapus catatan audit yang sudah tercatat.
Pembatasan audit perlu ditegakkan pada lapisan database dan aplikasi.
Hanya Admin Utama yang dapat membaca audit administratif.
Informasi modal dan keuntungan tidak boleh bocor ke Admin Biasa melalui API, DTO, log yang dapat diakses, atau tampilan.
19.6 Backup dan Pemulihan
Backup otomatis dijalankan setiap hari.
Backup manual dapat dijalankan Admin Utama jika diperlukan.
Backup disimpan selama 30 hari.
Backup dienkripsi menggunakan age sesuai ketentuan dokumen lama.
Salinan backup disimpan terpisah dari server utama.
Kunci pembuka backup disimpan terpisah secara aman oleh pemilik toko, bukan di repositori dan bukan bersama file backup.
Backup mencakup database dan file penting, termasuk foto buku, QRIS, bukti pembayaran, dan banner.
Backup tidak dianggap berhasil hanya karena file berhasil dibuat.
Pemulihan backup harus diuji sebelum operasional dan secara berkala.
19.7 Pemisahan Keputusan dan Rekomendasi Teknis
Aturan bisnis dalam dokumen ini merupakan acuan perilaku sistem.
Rekomendasi teknis seperti transaksi database, penguncian baris, outbox, worker, batasan unik, dan strategi idempotensi harus dipilih berdasarkan rancangan teknis.
Rekomendasi teknis tidak boleh diam-diam mengubah keputusan bisnis.
Jika implementasi membutuhkan perubahan perilaku bisnis, perubahan harus dijelaskan dan mendapat persetujuan pengguna terlebih dahulu.
Aturan bisnis harus diselaraskan dengan Requirements dan rancangan database sebelum implementasi.


