AKIRA BOOKS — BUSINESS RULES
1. Prinsip Dasar
Database dan server menjadi sumber kebenaran status serta transaksi.
Setiap eksemplar buku memiliki identitas unik dan stok 0 atau 1.
Setiap perubahan sensitif harus memiliki validasi izin dan riwayat yang sesuai.
Status pesanan, pembayaran, bukti pembayaran, jadwal, dan pengembalian dana merupakan hal berbeda.
Pesanan yang dibatalkan tidak dapat diaktifkan kembali.
Gangguan koneksi tidak boleh menyebabkan transaksi atau tindakan tercatat dua kali.
2. Status Buku
Status buku:
Tersedia.
Sedang Dipesan.
Terjual.
Nonaktif.
Aturan:
Buku hanya dapat dipesan jika tersedia dan layak dijual.
Keranjang tidak menahan stok.
Stok ditahan ketika pesanan berhasil dibuat dan validasi server berhasil.
Satu eksemplar tidak boleh ditahan oleh dua pesanan aktif.
Buku yang dibatalkan pesanannya kembali tersedia hanya jika masih aktif dan layak dijual.
Buku nonaktif atau terjual tidak otomatis tersedia kembali setelah pembatalan.
Buku yang memiliki riwayat transaksi tidak boleh dihapus permanen.
3. Status Pesanan dan Status Terkait
Status pembayaran/pesanan yang perlu dibedakan:
Menunggu Pembayaran.
Sudah Dibayar.
Menunggu Diambil.
Selesai.
Dibatalkan.
Status jadwal:
Menunggu Konfirmasi.
Disetujui.
Perlu Tanggal Baru.
Perubahan Jadwal Menunggu Persetujuan.
Status bukti pembayaran:
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
Status pengembalian dana:
Tidak Berlaku.
Perlu Diproses.
Dikembalikan Sebagian.
Selesai.
Status-status tersebut tidak boleh digabung menjadi satu kolom yang membuat informasi saling menimpa.
Status operasional pesanan harus dirancang dan ditinjau kembali sebelum coding agar perpindahan dari pembayaran ke pengambilan, penyelesaian, dan pembatalan tidak ambigu.
4. Pembuatan Pesanan dan Pencegahan Duplikat
Server memeriksa stok ketika pelanggan menekan Buat Pesanan.
Pemeriksaan dan penahanan stok dilakukan secara atomik.
Jika stok sudah dipesan pelanggan lain, permintaan berikutnya ditolak dengan pesan yang jelas.
Pengulangan permintaan yang sama harus mengembalikan pesanan yang sudah dibuat.
Sistem menggunakan mekanisme idempotensi untuk mencegah pesanan dan penahanan stok ganda.
Jika penyimpanan pesanan berhasil tetapi respons gagal dikirim, pengulangan tidak membuat pesanan baru.
Data pesanan menyimpan snapshot judul, kondisi, harga, dan informasi lain yang diperlukan pada waktu pemesanan.
5. Aturan Pembayaran
Pembayaran baru berstatus Sudah Dibayar setelah disetujui admin utama.
Pemeriksa awal bukti dan penyetuju final harus berbeda.
Jika tidak tersedia admin utama lain, persetujuan menunggu dan tidak dilakukan otomatis.
Bukti yang ditolak harus memiliki alasan dan tenggat penggantian.
Bukti yang berhasil diunggah sebelum tenggat tidak otomatis menyebabkan pembatalan hanya karena belum selesai diperiksa.
Waktu unggah ditentukan berdasarkan catatan server.
Bukti yang datang setelah pesanan resmi dibatalkan tidak dapat mengaktifkan kembali pesanan.
Pengulangan unggahan atau pengiriman hasil pemeriksaan harus mencegah catatan duplikat.
Satu pembayaran yang mencakup beberapa pesanan harus memiliki hubungan yang dapat ditelusuri ke setiap pesanan.
6. Tenggat Pembayaran
Tenggat global berlaku untuk pesanan baru.
Tenggat khusus pesanan dapat berbeda dari tenggat global.
Permintaan perpanjangan tidak otomatis menghentikan hitung mundur.
Jika tidak ada bukti sampai tenggat, pesanan dapat dibatalkan otomatis sesuai aturan.
Pembatalan otomatis mencatat alasan, waktu, aktor System, dan riwayat.
Jika bukti telah diunggah tepat waktu tetapi belum diperiksa, keputusan pembatalan harus ditangani admin utama.
Jika bukti baru diwajibkan dan tenggat penggantian terlewati tanpa unggahan, sistem menjalankan aturan tenggat yang berlaku.
Jika unggahan dan pembatalan terjadi bersamaan, server harus memastikan hanya satu hasil yang sah berdasarkan waktu dan status terbaru.
7. Jadwal Pengambilan
Tanggal pengambilan harus berupa hari Minggu di masa mendatang.
Pelanggan memilih tanggal, bukan jam.
Jam tutup booth adalah pukul 09.00.
Penolakan jadwal wajib memiliki alasan.
Perubahan jadwal yang diusulkan admin baru berlaku setelah disetujui pelanggan.
Jika tanggal terlewati sebelum keputusan dibuat, pelanggan harus memilih tanggal baru.
Ketidakhadiran pelanggan tidak otomatis membatalkan pesanan.
Jika pesanan ditahan, admin menetapkan tenggat baru dan alasan.
Buku tetap ditahan sampai pembatalan dilakukan secara resmi.
Penggabungan jadwal beberapa pesanan tidak menggabungkan status pembayaran atau riwayat masing-masing pesanan.
8. Pembatalan dan Pengembalian Dana
Pesanan batal bersifat final.
Pembatalan tidak otomatis berarti pengembalian dana telah dilakukan.
Pembatalan pesanan yang sudah dibayar memerlukan persetujuan admin utama.
Pembatalan oleh admin wajib memiliki alasan.
Status dan transaksi pengembalian dana dicatat secara terpisah.
Setiap pengembalian dana mencatat jumlah, waktu, pelaku, dan riwayat.
Buku yang dibatalkan pesanannya hanya kembali tersedia jika masih aktif dan layak dijual.
9. Laporan dan Modal
Hanya admin utama yang boleh melihat laporan keuangan dan modal.
Pembayaran terverifikasi dicatat sebagai uang diterima.
Penjualan selesai dicatat setelah buku diserahkan dan pesanan ditandai Selesai.
Penjualan offline dicatat sebagai jenis transaksi terpisah.
Laba kotor dihitung dari harga jual aktual dikurangi modal.
Koreksi modal tidak boleh menghapus nilai laba historis.
Laporan menyediakan laba historis dan laba berdasarkan modal terbaru.
Koreksi modal wajib memiliki alasan dan riwayat nilai lama serta nilai baru.
10. Koreksi dan Riwayat
Koreksi sensitif harus mencatat pelaku, waktu, nilai sebelum dan sesudah, serta alasan jika diwajibkan.
Koreksi status pesanan yang telah selesai hanya dapat mengembalikan status ke status sebelumnya yang tercatat.
Koreksi data tidak otomatis mengubah status transaksi.
Koreksi pembayaran tidak otomatis berarti dana telah dikembalikan.
Setiap tindakan yang diulang setelah gangguan koneksi harus mencegah perubahan atau catatan ganda.
11. Notifikasi dan Penanganan Bersamaan
Kegagalan notifikasi tidak membatalkan pesanan yang berhasil dibuat.
Notifikasi gagal disimpan dan dicoba kembali dengan jeda yang makin panjang.
Kegagalan berulang ditandai dan memunculkan peringatan kepada admin.
Pengiriman ulang tidak boleh menghasilkan notifikasi duplikat.
Notifikasi sejenis boleh dikelompokkan, tetapi riwayat setiap kejadian tetap tersedia.
Sistem mencatat admin yang sedang menangani pesanan.
Admin lain boleh melihat detail, tetapi perubahan yang bertentangan harus dicegah.
Penanda penanganan memiliki masa berlaku dan kedaluwarsa jika admin tidak aktif.
Kedaluwarsa penanda tidak mengubah status pesanan atau membatalkan tindakan yang sudah berhasil disimpan.
12. Aturan Implementasi
Semua pemeriksaan izin dan validasi transaksi wajib dilakukan di server.
UI tidak boleh menjadi satu-satunya perlindungan terhadap transaksi ganda.
Transaksi database harus menjaga konsistensi stok, pesanan, pembayaran, dan riwayat.
Ketika aturan belum jelas, OpenCode harus mencatat pertanyaan dan mengusulkan rancangan untuk ditinjau sebelum coding.
Aturan bisnis ini harus diselaraskan dengan REQUIREMENTS dan rancangan database sebelum implementasi.

