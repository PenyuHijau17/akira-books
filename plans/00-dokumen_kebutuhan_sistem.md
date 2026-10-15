AKIRA BOOKS — DOKUMEN KEBUTUHAN SISTEM
Versi: 1.0 — Draf untuk ditinjau
Status: Perencanaan sebelum implementasi
1. Tujuan Proyek
Akira Books adalah aplikasi web untuk mendukung operasional toko buku yang menjual buku bacaan original dan bekas.
Saat ini, kegiatan penjualan dilakukan melalui lapak fisik pada hari Minggu pagi, sedangkan pemesanan dan komunikasi dengan pelanggan dilakukan melalui WhatsApp dan grup percakapan. Pencatatan transaksi masih mengandalkan buku catatan dan ingatan.
Akira Books dikembangkan untuk:
Menyediakan katalog buku yang bisa diakses secara online.
Mempermudah pelanggan memesan buku dan mengunggah bukti pembayaran.
Membantu admin mengelola buku, pesanan, jadwal pengambilan, dan transaksi.
Mencatat modal serta menghitung laba kotor per buku.
Menyediakan laporan penjualan yang hanya dapat diakses admin utama.
Menyimpan riwayat aktivitas penting agar perubahan data dapat ditelusuri.
Mengurangi risiko kehilangan data melalui backup otomatis dan manual.
Aplikasi ini bukan marketplace. Pembayaran dilakukan melalui QRIS milik toko, sedangkan validasi pembayaran dan penyerahan buku dilakukan oleh admin.
2. Teknologi
Teknologi yang direncanakan:
Docker untuk menjalankan lingkungan aplikasi dan database.
Next.js untuk aplikasi web, antarmuka pengguna, dan logika server.
TypeScript untuk membantu menjaga konsistensi kode.
Prisma sebagai ORM untuk berinteraksi dengan database.
PostgreSQL sebagai database utama.
Sistem autentikasi dengan pengelolaan sesi yang aman.
Layanan email untuk verifikasi, pemulihan password, dan OTP.
Penyimpanan file untuk foto buku, QRIS, dan bukti pembayaran.
Versi paket dan konfigurasi teknis akan ditentukan saat implementasi. Dependensi dipilih berdasarkan kompatibilitas dan stabilitas, bukan sekadar menggunakan versi terbaru.
Aplikasi harus bisa digunakan melalui browser komputer, tablet, dan HP. MVP tidak memerlukan aplikasi Android atau iOS terpisah.
3. Jenis Pengguna dan Hak Akses
3.1 Pengunjung
Pengunjung tidak perlu login untuk:
Melihat beranda.
Melihat katalog buku yang tersedia.
Mencari dan memfilter buku.
Melihat detail buku.
Melihat informasi toko yang bersifat publik.
Pengunjung wajib membuat akun dan login sebelum melakukan pemesanan atau interaksi yang membutuhkan identitas pelanggan.
3.2 Customer
Customer dapat:
Mengelola profil.
Mengubah nama, password, dan nomor WhatsApp.
Melihat katalog serta detail buku.
Membuat pesanan dan memilih tanggal pengambilan.
Mengunggah dan mengganti bukti pembayaran sesuai status pesanan.
Melihat status pembayaran dan jadwal pengambilan.
Mengajukan perubahan jadwal.
Meminta perpanjangan batas waktu pembayaran.
Meminta penggabungan jadwal pengambilan beberapa pesanan.
Melihat pesanan aktif dan riwayat pesanan yang dibatalkan.
Mengajukan penghapusan akun.
Menerima notifikasi dalam website.
Email tidak dapat diubah langsung oleh customer. Nomor WhatsApp bersifat opsional.
Customer hanya boleh melihat data dan bukti pembayaran miliknya sendiri.
3.3 Admin biasa
Admin biasa menangani operasional toko sesuai izin yang diberikan, termasuk:
Mengelola data buku dan foto.
Mengelola kategori buku.
Melihat dan menangani pesanan.
Memeriksa bukti pembayaran dan mengajukan hasil pemeriksaan.
Mengelola permintaan perubahan jadwal.
Menangani permintaan perpanjangan tenggat.
Mencatat penjualan offline.
Menangani akun customer sesuai aturan yang ditetapkan.
Menjalankan tindakan operasional lain yang diizinkan.
Admin biasa tidak boleh:
Melihat laporan penjualan dan laporan keuangan.
Melihat atau mengubah modal buku.
Mengatur atau mengoreksi modal buku.
Menambahkan, mengubah peran, atau menonaktifkan akun admin lain.
Menyetujui pembayaran yang memerlukan persetujuan admin utama.
Melakukan pembatalan pesanan berbayar tanpa persetujuan admin utama.
3.4 Admin utama
Admin utama memiliki hak akses operasional dan hak akses khusus, yaitu:
Melihat laporan penjualan dan laporan keuangan.
Melihat dan mengoreksi modal setiap buku fisik.
Mengelola akun admin dan menetapkan perannya.
Mengatur backup database.
Mengelola pengaturan toko dan QRIS.
Menyetujui hasil verifikasi pembayaran.
Menyetujui pembatalan pesanan yang sudah dibayar.
Menangani kasus pembayaran yang membutuhkan keputusan khusus.
Melakukan koreksi transaksi sesuai aturan persetujuan.
Mengakses riwayat aktivitas administratif yang diperlukan untuk audit.
Hanya admin utama yang boleh membuat akun admin, mengubah peran admin, dan menonaktifkan akun admin.
3.5 Penegakan hak akses
Hak akses harus diperiksa di server untuk setiap operasi yang dilindungi.
Menyembunyikan tombol atau menu pada antarmuka saja tidak cukup. Admin biasa tidak boleh dapat membuka laporan, membaca modal, atau mengubah data terlarang melalui URL, permintaan API, maupun manipulasi browser.
4. Akun dan Keamanan
4.1 Login
Customer dan admin menggunakan email serta password.
Password disimpan dalam bentuk hash menggunakan algoritma yang sesuai, bukan teks biasa.
Sistem harus memiliki:
Pembatasan percobaan login.
Pengelolaan sesi yang aman.
Cookie sesi dengan atribut keamanan yang sesuai.
Prosedur logout.
Perlindungan terhadap akses tanpa izin.
4.2 OTP untuk admin
Admin menggunakan OTP untuk tindakan sensitif, bukan untuk setiap login.
Tindakan yang memerlukan OTP meliputi:
Mengganti gambar QRIS.
Mengelola akun admin.
Tindakan sensitif lain yang ditetapkan pada implementasi.
OTP harus memiliki masa berlaku, pembatasan percobaan, dan perlindungan terhadap penggunaan ulang. Mekanisme pengiriman OTP menggunakan layanan email atau layanan lain yang dipilih saat implementasi.
4.3 Pemulihan akun admin utama
Pemulihan akun menggunakan:
Tautan pemulihan melalui email.
Kode pemulihan cadangan untuk keadaan darurat ketika email tidak dapat diakses.
Kode pemulihan harus dibuat dengan aman, ditampilkan saat dibuat, dan disimpan pengguna di tempat aman. Server tidak menyimpan kode dalam bentuk teks biasa.
Proses pemulihan harus membatasi percobaan dan mencatat aktivitas pemulihan yang penting.
4.4 Pemulihan password customer
Customer dapat meminta tautan pemulihan melalui email terdaftar. Tautan memiliki masa berlaku dan hanya dapat digunakan sesuai aturan keamanan.
4.5 Penonaktifan customer
Admin dapat memberikan peringatan, menonaktifkan sementara, atau menonaktifkan permanen akun customer. Tindakan memerlukan alasan dan riwayat.
Akun yang dinonaktifkan tidak dapat login atau membuat pesanan baru. Pesanan yang sudah ada tetap diproses sesuai statusnya.
Penonaktifan sementara memiliki tanggal berakhir. Setelah waktunya habis, akun kembali aktif kecuali admin mengubah keputusan sesuai prosedur.
Customer harus dapat melihat alasan penonaktifan serta tanggal aktivasi kembali jika bersifat sementara.
4.6 Penghapusan akun customer
Customer dapat mengajukan penghapusan akun. Jika masih ada pesanan aktif, penghapusan ditunda sampai seluruh pesanan selesai atau dibatalkan.
Sebelum penghapusan benar-benar dilakukan, customer dapat membatalkan permintaannya. Sistem mencatat riwayat permintaan dan pembatalannya.
Penghapusan permanen tidak dapat dibatalkan setelah selesai.
Data transaksi yang wajib dipertahankan untuk kebutuhan operasional, keamanan, atau kewajiban hukum harus diperlakukan sesuai kebijakan retensi. Permintaan penghapusan akun tidak boleh menghapus riwayat transaksi secara sembarangan.
5. Pengelolaan Buku
5.1 Data buku
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
5.2 Kondisi buku
Pilihan kondisi standar:
Baru.
Sangat Baik.
Baik.
Cukup.
Admin dapat menambahkan deskripsi kerusakan, kekurangan, atau kelebihan buku. Deskripsi tambahan bersifat opsional.
Harga jual ditentukan untuk setiap buku fisik. Perbedaan kondisi dapat menghasilkan perbedaan harga.
5.3 Modal buku
Modal disimpan per eksemplar, bukan per judul.
Hanya admin utama yang boleh mengatur atau mengoreksi modal.
Setiap koreksi modal wajib memiliki alasan dan mencatat:
Modal sebelumnya.
Modal baru.
Alasan koreksi.
Admin utama yang melakukan koreksi.
Waktu koreksi.
Setelah koreksi, sistem menghitung ulang laba berdasarkan modal terbaru.
Admin biasa tidak boleh melihat modal atau mengubahnya melalui antarmuka maupun akses server.
5.4 Stok
Setiap buku fisik merupakan satu data dengan stok tersedia 0 atau 1.
Status buku harus membedakan antara:
Tersedia.
Sedang dipesan atau ditahan.
Terjual.
Dinonaktifkan.
Buku yang sedang dipesan tetap dapat terlihat di katalog, tetapi tidak dapat dipesan customer lain.
Buku yang terjual atau dinonaktifkan tidak tampil sebagai buku tersedia. Riwayat buku tetap dipertahankan sesuai aturan penyimpanan data.
5.5 Perubahan dan penghapusan buku
Admin dapat menambahkan satu atau beberapa buku, mengubah data, mengganti foto, mengatur kategori, dan mengelola status buku.
Jika buku belum memiliki riwayat pesanan atau transaksi, penghapusan permanen dapat dilakukan sesuai aturan sistem.
Jika buku sudah memiliki riwayat, buku dinonaktifkan daripada dihapus permanen agar riwayat transaksi tetap dapat ditelusuri.
Perubahan harga atau kondisi yang memengaruhi kesepakatan pesanan dibatasi ketika buku memiliki pesanan aktif. Foto dan deskripsi dapat diperbarui sesuai aturan, tetapi data historis dalam pesanan harus tetap sama.
Buku dengan riwayat duplikat dapat digabungkan melalui proses yang menjaga identitas serta keterlacakan transaksi lama.
6. Katalog dan Beranda
6.1 Beranda
Beranda menampilkan:
Pengenalan singkat Akira Books.
Beberapa buku terbaru yang tersedia.
Akses yang jelas menuju katalog lengkap.
Navigasi menuju informasi toko dan login.
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
Buku yang sedang dipesan dapat ditampilkan dengan status yang jelas, tetapi tidak bisa ditambahkan ke pesanan baru. Buku terjual dan buku yang dinonaktifkan tidak ditampilkan sebagai buku tersedia.
6.3 Detail buku
Halaman detail menampilkan informasi lebih lengkap, termasuk penerbit, tahun terbit, kondisi, harga, deskripsi, kategori, foto, dan status ketersediaan.
6.4 Informasi toko
Halaman informasi toko menampilkan informasi Akira Books dan QRIS sesuai aturan akses serta status pesanan.
7. Keranjang dan Pemesanan
7.1 Keranjang
Customer yang sudah login dapat memilih beberapa buku untuk satu pesanan.
Keranjang tidak menahan stok. Stok baru ditahan ketika customer menekan tombol “Buat Pesanan”.
7.2 Pembuatan pesanan
Ketika pesanan dibuat, server memeriksa kembali ketersediaan seluruh buku secara aman.
Jika satu atau beberapa buku tidak lagi tersedia, sistem tidak boleh membuat pesanan yang menyebabkan stok ganda. Customer diberi tahu buku mana yang tidak tersedia.
Jika berhasil:
Pesanan dibuat.
Buku yang dipesan ditahan.
Data buku, harga, dan kondisi saat pemesanan disimpan sebagai snapshot.
Status pesanan menjadi “Menunggu Pembayaran”.
Status jadwal menjadi “Menunggu Konfirmasi”.
Tenggat pembayaran ditentukan berdasarkan pengaturan yang berlaku saat pesanan dibuat.
Customer menerima notifikasi website.
Snapshot menjaga agar perubahan katalog setelah pesanan dibuat tidak mengubah kesepakatan historis.
7.3 Beberapa pesanan aktif
Customer dapat memiliki beberapa pesanan aktif sekaligus. Setiap pesanan memiliki status, tenggat pembayaran, riwayat, dan jadwal sendiri.
Customer dapat meminta agar beberapa pesanan diambil pada jadwal yang sama. Admin meninjau permintaan tersebut.
Penggabungan jadwal tidak otomatis menggabungkan identitas pesanan atau catatan pembayaran. Setiap pesanan tetap memiliki riwayatnya sendiri.
Jika salah satu pesanan dalam jadwal gabungan dibatalkan, jadwal pesanan lain tetap berlaku.
8. Pembayaran QRIS
8.1 QRIS toko
Toko menggunakan satu gambar QRIS yang dikelola admin utama.
Penggantian QRIS memerlukan konfirmasi dan password, serta OTP sesuai aturan keamanan. Sistem memperingatkan admin jika ada pesanan aktif yang mungkin masih menggunakan gambar lama.
QRIS terbaru ditampilkan pada halaman informasi toko hanya jika customer memiliki pesanan “Menunggu Pembayaran”, serta pada detail pesanan yang relevan.
Penggantian gambar QRIS tidak mengubah status pembayaran atau bukti pembayaran yang sudah ada.
8.2 Unggah bukti pembayaran
Customer membayar melalui QRIS di luar sistem, kemudian mengunggah tangkapan layar bukti pembayaran.
Status bukti pembayaran:
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
Bukti pembayaran hanya dapat dilihat customer pemilik pesanan dan admin yang berwenang.
Sistem menyimpan riwayat bukti pembayaran, dengan bukti terbaru yang masih aktif ditampilkan lebih dahulu.
Customer boleh mengganti bukti ketika statusnya masih “Menunggu Verifikasi”. Bukti lama tetap disimpan sebagai riwayat. Setelah bukti terverifikasi, penggantian normal tidak diizinkan.
8.3 Verifikasi dua tahap
Semua admin dapat memeriksa bukti pembayaran dan mengajukan hasil pemeriksaan.
Namun, pesanan baru menjadi “Sudah Dibayar” setelah admin utama menyetujui hasil tersebut.
Admin utama yang menyetujui harus berbeda dari admin yang memeriksa bukti pada tahap awal.
Jika tidak ada admin utama lain yang dapat menyetujui, pesanan tetap menunggu keputusan. Sistem tidak boleh menyetujui pembayaran secara otomatis.
Jika admin utama menolak hasil pemeriksaan pertama, alasan wajib diisi. Kasus dikembalikan kepada admin pemeriksa yang sama untuk diperiksa ulang.
Jika pemeriksaan ulang kembali ditolak, admin utama mengambil alih kasus dan dapat meminta bukti baru. Alasan dan tenggat baru wajib ditetapkan.
Jika hanya ada satu admin utama, mekanisme persetujuan tidak boleh dilewati diam-diam. Kasus tersebut harus tetap menunggu admin yang berbeda atau ditangani melalui prosedur pengecualian yang ditetapkan secara eksplisit sebelum implementasi.
8.4 Bukti baru
Jika bukti tidak valid, admin dapat meminta bukti baru dengan alasan dan tenggat baru.
Status bukti menjadi “Perlu Bukti Baru”, sedangkan status pesanan tetap “Menunggu Pembayaran”.
Ketika customer mengunggah bukti pengganti sebelum tenggat, status bukti kembali menjadi “Menunggu Verifikasi” dan admin menerima notifikasi.
Jika satu transfer QRIS mencakup beberapa pesanan, satu bukti pembayaran dapat dihubungkan ke beberapa pesanan dengan pencatatan yang jelas. Riwayat pembayaran setiap pesanan tetap harus dapat ditelusuri.
9. Tenggat Pembayaran
Sistem memiliki tenggat pembayaran default dan tenggat khusus per pesanan.
Perubahan tenggat default hanya berlaku untuk pesanan baru. Pesanan yang sudah ada tetap menggunakan tenggat tersimpan kecuali tenggat khususnya diubah.
Semua admin dapat mengubah tenggat pesanan. Setiap perubahan harus mencatat nilai lama, nilai baru, waktu, admin, alasan jika diwajibkan, serta mengirim notifikasi kepada customer.
Customer dapat mengajukan perpanjangan melalui website atau WhatsApp. Pengajuan perpanjangan tidak otomatis menghentikan tenggat. Semua admin dapat menyetujui atau menolak permintaan tersebut.
Perpanjangan yang disetujui berlaku setelah disimpan di server dan tidak bergantung pada apakah customer sudah membaca notifikasinya.
9.1 Jika tenggat terlewati
Jika tidak ada bukti pembayaran yang berhasil diunggah sampai tenggat, sistem membatalkan pesanan secara otomatis dengan alasan “Batas waktu pembayaran terlewati”.
Sistem mencatat waktu, pelaku “System”, dan riwayat perubahan status, memberi notifikasi kepada customer, serta mengembalikan stok yang ditahan jika masih relevan.
Jika bukti berhasil diunggah sebelum tenggat tetapi belum diperiksa, pesanan tidak otomatis dibatalkan. Admin harus memutuskan apakah pesanan dipertahankan atau dibatalkan. Pembatalan dalam kondisi ini memerlukan keputusan admin utama.
Jika bukti baru diminta dan tenggat penggantinya terlewati tanpa bukti baru, pesanan dapat dibatalkan sesuai aturan tenggat. Jika bukti pengganti sudah berhasil diunggah sebelum tenggat tetapi belum diperiksa, kasus mengikuti aturan menunggu keputusan admin.
Semua pengunggahan dan perubahan status harus menggunakan waktu yang tercatat di server. Proses bersamaan antara unggah bukti dan pembatalan harus ditangani secara atomik agar stok tidak dikembalikan dua kali atau status menjadi bertentangan.
9.2 Pengingat dan eskalasi
Jika bukti telah diunggah tetapi belum diperiksa saat tenggat terlewati, sistem mengirim pengingat setiap dua jam kepada admin yang harus bertindak.
Jika persetujuan pembayaran belum diputuskan, sistem juga mengirim pengingat setiap dua jam. Setelah 24 jam tanpa keputusan, kasus dieskalasikan kepada admin utama lain jika tersedia.
Pengingat dan eskalasi berhenti segera setelah keputusan terkait dibuat.
Tidak ada persetujuan pembayaran otomatis hanya karena admin belum merespons.
10. Jadwal Pengambilan
Pengambilan buku dilakukan pada hari Minggu pagi di lapak Akira Books.
Jam operasional lapak berakhir tepat pukul 09.00. Waktu penutupan ini bersifat tetap dan tidak dapat diubah melalui pengaturan admin.
Customer memilih tanggal pengambilan pada saat checkout. Customer tidak memilih jam pengambilan.
Tanggal yang dipilih harus merupakan hari Minggu dan berada di masa depan. Validasi dilakukan pada antarmuka dan server.
Status jadwal dikelola terpisah dari status pembayaran. Pesanan dapat berstatus “Sudah Dibayar” sementara jadwal masih “Menunggu Konfirmasi”.
10.1 Persetujuan jadwal
Admin menyetujui atau menolak tanggal yang diajukan.
Jika ditolak, alasan wajib diberikan dan customer diminta memilih tanggal Minggu lain. Status pembayaran tidak berubah hanya karena tanggal ditolak.
Jika tanggal baru belum dipilih setelah batas waktu yang ditentukan admin, admin utama memutuskan apakah pesanan tetap menunggu atau dibatalkan.
Jika customer meminta tanggal baru, admin meninjau permintaan tersebut. Pengingat kepada admin dikirim setiap dua jam selama permintaan menunggu keputusan.
Tanggal yang sudah berlalu tidak boleh disetujui. Jika tanggal berlalu sebelum keputusan admin, customer harus diminta memilih tanggal lain.
10.2 Perubahan jadwal oleh admin
Admin dapat mengusulkan perubahan jadwal dengan alasan. Customer harus menyetujui usulan tersebut.
Jadwal lama tetap berlaku sampai perubahan disetujui. Semua perubahan dicatat dalam riwayat dan diberitahukan kepada pihak terkait.
10.3 Customer tidak mengambil buku
Jika customer tidak datang sebelum lapak tutup pukul 09.00, sistem memberi notifikasi kepada admin.
Admin memutuskan apakah buku tetap ditahan, jadwal diubah, atau pesanan dibatalkan.
Jika buku tetap ditahan, admin menentukan tenggat baru dan alasan. Keputusan diberitahukan kepada customer serta dicatat. Ketika tenggat baru berlalu, admin harus mengambil keputusan lagi. Sistem tidak membatalkan otomatis hanya karena tenggat penahanan terlewati.
Pembatalan pesanan berbayar memerlukan persetujuan admin utama.
10.4 Pesanan gabungan
Permintaan menggabungkan jadwal beberapa pesanan harus ditinjau admin.
Jika salah satu pesanan dibatalkan, jadwal pesanan lain tetap berlaku.
Jika tenggat pembayaran salah satu pesanan terlewati, aturan pembayaran normal tetap berlaku. Jadwal gabungan tidak mengecualikan pesanan dari aturan pembayaran.
Jika ada perpanjangan pembayaran pada pesanan dalam jadwal gabungan, admin memutuskan apakah pesanan tetap dalam jadwal gabungan atau dipisahkan. Perubahan jadwal harus disertai alasan, riwayat, dan notifikasi.
11. Pembatalan Pesanan
Customer dapat membatalkan pesanan yang belum selesai selama statusnya memenuhi ketentuan pembatalan.
Jika pembayaran sudah diverifikasi, customer tidak dapat membatalkan sendiri dan harus menghubungi admin. Jika pesanan berbayar dibatalkan oleh admin, pembatalan memerlukan persetujuan admin utama.
Alasan pembatalan oleh customer bersifat opsional. Alasan pembatalan oleh admin wajib diisi.
Pembatalan yang sudah selesai bersifat final. Pesanan tidak dapat diaktifkan kembali. Customer dapat membuat pesanan baru jika buku masih tersedia.
Setiap pembatalan mencatat:
Pesanan yang dibatalkan.
Alasan.
Pelaku.
Waktu.
Admin utama yang menyetujui jika diperlukan.
Pengembalian stok.
Status pembayaran pada saat pembatalan.
Jika pembayaran sudah diverifikasi, sistem tidak menganggap dana otomatis telah dikembalikan. Customer diberi tahu bahwa pengembalian dana harus dibicarakan langsung dengan admin.
11.1 Persetujuan pembatalan berbayar
Admin yang mengusulkan pembatalan pesanan berbayar tidak boleh menjadi admin utama yang menyetujuinya.
Jika hanya ada satu admin utama dan orang tersebut mengusulkan pembatalan, pengecualian dapat dilakukan dengan alasan tambahan yang wajib dicatat.
Pesanan yang dibatalkan tetap tersimpan dalam riwayat customer dan laporan terkait.
12. Penyelesaian Pesanan
Pesanan hanya boleh ditandai “Selesai” setelah buku benar-benar diserahkan kepada customer.
Admin menekan tombol “Selesai” setelah penyerahan fisik dilakukan.
Status selesai tidak boleh terjadi hanya karena pembayaran telah diverifikasi atau tanggal pengambilan telah tiba.
Jika status perlu dikoreksi, admin harus mengikuti aturan koreksi status, memberikan alasan, dan mempertahankan riwayat status sebelumnya. Koreksi status selesai hanya boleh mengembalikan pesanan ke status sebelumnya yang tercatat, bukan mengubah status ke sembarang nilai.
Perbaikan data nonstatus dapat dilakukan sesuai hak akses dan harus dicatat bila memengaruhi transaksi.
13. Penjualan Offline
Buku yang terjual langsung di lapak tanpa pesanan online harus dapat dicatat melalui fitur penjualan offline.
Admin memilih buku fisik yang dijual dan memasukkan harga transaksi aktual. Harga aktual boleh berbeda dari harga katalog.
Sistem mencatat:
Buku yang terjual.
Harga jual aktual.
Modal per buku.
Laba kotor.
Waktu transaksi.
Admin yang mencatat.
Jenis transaksi “Offline”.
Setelah penjualan berhasil dicatat, buku tidak lagi tampil sebagai buku tersedia.
Penjualan offline tidak memerlukan unggahan bukti pembayaran melalui sistem. Namun, transaksi harus tetap masuk ke laporan penjualan dan riwayat.
13.1 Koreksi harga jual offline
Semua admin boleh mengajukan koreksi harga jual transaksi offline dengan alasan wajib.
Koreksi harus disetujui admin utama. Idealnya, admin utama yang menyetujui berbeda dari pengusul.
Sebelum persetujuan, harga dan laba lama tetap berlaku. Setelah disetujui, sistem menerapkan harga baru dan menghitung ulang laba.
Riwayat mencatat harga lama, harga baru, alasan, pengusul, penyetuju, dan waktu perubahan.
13.2 Koreksi modal offline
Modal tetap mengikuti aturan modal buku: hanya admin utama yang boleh mengatur atau mengoreksi modal. Koreksi modal memerlukan alasan dan riwayat serta memperbarui perhitungan laba.
14. Laporan Penjualan dan Keuangan
Hanya admin utama yang dapat melihat laporan penjualan dan laporan keuangan.
Laporan MVP mencakup:
Penjualan harian.
Penjualan bulanan.
Penjualan tahunan.
Total pendapatan penjualan.
Jumlah buku terjual.
Riwayat transaksi.
Pembedaan transaksi online dan offline.
Modal dan laba kotor sesuai data yang tercatat.
Laporan harus membedakan antara pembayaran yang telah diverifikasi dan penjualan yang benar-benar selesai.
Pembayaran diverifikasi saat admin utama menyetujui bukti pembayaran. Penjualan selesai dicatat ketika buku diserahkan dan admin menekan “Selesai”.
Jika pesanan berbayar dibatalkan, catatan pembayaran dan pembatalan tetap ada. Sistem tidak boleh menganggap pembatalan sebagai pengembalian dana tanpa pencatatan terpisah.
Laporan menggunakan data transaksi dan snapshot yang sesuai agar perubahan katalog tidak mengubah histori penjualan secara keliru.
Ekspor Excel dan laporan buku terlaris tidak termasuk MVP.
14.1 Perhitungan laba kotor
Laba kotor per buku dihitung sebagai:
Laba kotor = Harga jual aktual − Modal buku
Contoh:
Harga jual: Rp50.000.
Modal: Rp30.000.
Laba kotor: Rp20.000.
Perhitungan menggunakan harga transaksi aktual untuk penjualan offline dan harga kesepakatan yang tersimpan untuk transaksi online.
Laporan harus menjelaskan definisi angka yang ditampilkan. Laba kotor tidak sama dengan laba bersih karena belum memperhitungkan biaya operasional lain.
15. Notifikasi
15.1 Notifikasi website
MVP menggunakan notifikasi di dalam website.
Notifikasi diberikan untuk kejadian penting, antara lain:
Pesanan baru.
Perubahan status pembayaran.
Bukti pembayaran yang membutuhkan tindakan.
Persetujuan atau penolakan jadwal.
Perubahan tenggat.
Permintaan perpanjangan pembayaran.
Pembatalan pesanan.
Pengambilan yang terlewat.
Keputusan admin yang membutuhkan perhatian customer.
Notifikasi harus memiliki penerima, isi, waktu, dan status telah dibaca atau belum dibaca.
Notifikasi yang memerlukan tindakan harus berhenti atau diperbarui setelah keputusan terkait dibuat. Pengingat tidak boleh terus dikirim setelah kasus selesai.
15.2 Integrasi WhatsApp
Integrasi WhatsApp tidak termasuk tahap pertama.
Arsitektur notifikasi harus disiapkan agar integrasi WhatsApp dapat ditambahkan setelah fitur utama selesai tanpa membangun ulang logika inti notifikasi.
Pengiriman WhatsApp otomatis memerlukan layanan integrasi, konfigurasi akun, serta evaluasi biaya dan kebijakan penyedia.
16. Backup dan Pemulihan Data
Akira Books membutuhkan backup otomatis dan manual.
16.1 Backup otomatis
Sistem membuat backup database secara berkala. Jadwal, jumlah salinan yang dipertahankan, dan masa retensi ditentukan pada implementasi.
16.2 Backup manual
Admin utama dapat membuat backup dan mengunduhnya sesuai kebutuhan.
16.3 Penyimpanan backup
Backup harus disimpan terpisah dari database utama agar kerusakan database atau server tidak otomatis menghancurkan seluruh salinan.
Backup yang berisi data sensitif harus dilindungi. Akses backup dibatasi untuk admin utama dan pihak teknis yang memang diberi izin.
16.4 Pengujian pemulihan
Backup tidak dianggap berhasil hanya karena file cadangan berhasil dibuat. Proses pemulihan harus diuji secara berkala agar data dapat benar-benar dipulihkan ketika dibutuhkan.
Foto buku, bukti pembayaran, QRIS, dan file terkait harus ikut dipertimbangkan dalam strategi backup. Backup database saja tidak cukup jika file disimpan di lokasi terpisah.
17. Desain dan Pengalaman Pengguna
17.1 Identitas visual
Akira Books menggunakan gaya hangat dan klasik dengan nuansa kertas.
Arah visual:
Krem sebagai warna dasar.
Cokelat untuk navigasi dan elemen penting.
Tipografi yang mudah dibaca.
Foto buku sebagai fokus utama.
Tata letak bersih dan nyaman.
17.2 Bahasa
Seluruh antarmuka menggunakan Bahasa Indonesia, termasuk:
Menu.
Tombol.
Status pesanan.
Notifikasi.
Validasi formulir.
Pesan kesalahan.
Petunjuk pembayaran dan pengambilan.
17.3 Responsivitas
Website harus nyaman digunakan pada layar HP, tablet, dan komputer.
Admin harus dapat mengelola buku, pesanan, bukti pembayaran, jadwal, dan transaksi melalui browser HP.
Dashboard tidak boleh mengandalkan tabel lebar tanpa penyesuaian. Informasi penting harus mudah dibaca, tombol mudah disentuh, dan formulir tidak merepotkan pada layar kecil.
18. Status Utama Sistem
Status pesanan dan status pendukung tidak boleh dicampur menjadi satu kolom yang menyebabkan alur membingungkan.
18.1 Status pesanan
Status utama yang direncanakan:
Menunggu Pembayaran.
Sudah Dibayar.
Menunggu Diambil.
Selesai.
Dibatalkan.
Status “Menunggu Konfirmasi” yang pernah digunakan dalam pembahasan awal perlu dipetakan secara tepat sebelum implementasi agar tidak bertabrakan dengan status pembayaran dan jadwal.
18.2 Status jadwal
Status jadwal dikelola terpisah, misalnya:
Menunggu Konfirmasi.
Disetujui.
Perlu Tanggal Baru.
Perubahan Jadwal Menunggu Persetujuan.
Status akhir dan transisi lengkapnya harus ditetapkan dalam diagram alur teknis sebelum kode dibuat.
18.3 Status bukti pembayaran
Belum Diunggah.
Menunggu Verifikasi.
Perlu Bukti Baru.
Terverifikasi.
18.4 Aturan transisi
Perubahan status harus dilakukan melalui logika server yang memvalidasi status sebelumnya, peran pelaku, tenggat, dan kondisi stok.
Setiap perubahan penting harus menghasilkan riwayat yang dapat ditelusuri.
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
Backup dan pemulihan data.
Riwayat mencakup pelaku, waktu, tindakan, alasan jika diwajibkan, dan perubahan nilai lama serta baru jika relevan.
Riwayat transaksi tidak boleh hilang hanya karena data katalog berubah atau akun customer dinonaktifkan.
20. Batasan MVP
Fokus versi pertama adalah operasional inti Akira Books.
Termasuk MVP:
Login dan pengelolaan akun.
Hak akses pengunjung, customer, admin, dan admin utama.
Katalog, pencarian, filter, serta detail buku.
Pengelolaan buku fisik dan kategori.
Modal per buku yang hanya dikelola admin utama.
Keranjang dan pembuatan pesanan.
QRIS dan unggah bukti pembayaran.
Verifikasi pembayaran dua tahap.
Jadwal pengambilan hari Minggu.
Pembatalan dan penyelesaian pesanan.
Penjualan offline.
Koreksi transaksi dan riwayat.
Laporan penjualan khusus admin utama.
Notifikasi website.
Backup otomatis dan manual.
Pengamanan login, OTP, dan pemulihan akun.
Tampilan responsif untuk HP.
Belum termasuk MVP:
Aplikasi Android atau iOS terpisah.
Integrasi WhatsApp otomatis.
Ekspor Excel.
Laporan buku terlaris.
Sistem pembayaran gateway otomatis.
Fitur marketplace atau multi-toko.
21. Tahapan Implementasi
Tahap 1 — Finalisasi kebutuhan
Meninjau dokumen ini bersama pemilik proyek.
Menyelesaikan konflik aturan status dan persetujuan.
Menetapkan alur final untuk pesanan, pembayaran, pembatalan, dan pengambilan.
Menentukan batas MVP.
Tahap 2 — Fondasi proyek
Membuat struktur proyek Docker.
Menyiapkan Next.js dan TypeScript.
Menyiapkan PostgreSQL.
Menyiapkan Prisma.
Menyiapkan variabel lingkungan dan pengelolaan rahasia.
Menguji koneksi aplikasi dan database.
Tahap 3 — Data dan autentikasi
Merancang skema database.
Membuat migrasi.
Membangun login, sesi, dan hak akses.
Membangun pengelolaan akun dan keamanan admin.
Tahap 4 — Katalog dan pengelolaan buku
CRUD buku.
Kategori.
Foto.
Kondisi dan harga.
Modal khusus admin utama.
Status ketersediaan.
Tahap 5 — Pesanan dan pembayaran
Keranjang.
Pembuatan pesanan dan penahanan stok.
QRIS.
Unggah bukti.
Verifikasi dua tahap.
Tenggat dan pembatalan.
Tahap 6 — Pengambilan dan penjualan offline
Pemilihan tanggal Minggu.
Persetujuan jadwal.
Perubahan jadwal.
Penyelesaian pesanan.
Penjualan offline.
Koreksi transaksi.
Tahap 7 — Laporan dan operasional
Laporan penjualan.
Perhitungan laba.
Notifikasi website.
Backup.
Riwayat audit.
Tahap 8 — Pengujian dan peluncuran
Pengujian hak akses.
Pengujian stok dan transaksi bersamaan.
Pengujian tenggat.
Pengujian unggah bukti.
Pengujian backup dan pemulihan.
Pengujian tampilan HP.
Pengujian seluruh alur customer dan admin.
22. Aturan Kerja Pengembangan
Tidak langsung coding sebelum kebutuhan disetujui.
Setiap fitur harus memiliki tujuan, aturan, dan kriteria selesai.
Perubahan aturan bisnis harus diperbarui di dokumen.
Rahasia aplikasi tidak boleh dimasukkan ke GitHub.
Migrasi database harus disimpan dalam repositori.
Setelah checkpoint GitHub, berhenti sejenak untuk commit dan push, kemudian tinjau perubahan sejak checkpoint sebelumnya.
Pada setiap checkpoint, jelaskan kembali konsep dan alur teknis yang baru dipelajari.
Gunakan langkah bertahap dan perintah yang dapat dijalankan serta diperiksa satu per satu.
23. Kriteria Kesiapan Sebelum Coding
Dokumen ini siap menjadi dasar implementasi setelah:
Pemilik proyek menyetujui kebutuhan utama.
Status pesanan, pembayaran, dan jadwal telah diselaraskan.
Hak akses admin biasa dan admin utama telah dipastikan.
Aturan modal dan koreksi transaksi telah dipastikan.
Alur pembatalan dan pengembalian stok telah diperiksa.
Ketentuan penjualan offline telah diselaraskan dengan laporan.
Strategi backup dan penyimpanan file telah direncanakan.
Dokumen ini adalah spesifikasi kebutuhan awal. Detail implementasi, diagram alur, skema database, dan pengujian akan diturunkan dari dokumen yang telah disetujui.

