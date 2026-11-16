AKIRA BOOKS — IMPLEMENTATION PLAN
1. Tujuan
Dokumen ini mengatur tahapan pengembangan website Akira Books berdasarkan:
plans/01-requirements.md
plans/02-business-rules.md
plans/03-project-rules.md
plans/04-implementation-plns.md
Setiap tahap harus diperiksa dan diuji sebelum melanjutkan ke tahap berikutnya.
Dokumen ini merupakan panduan pelaksanaan teknis, bukan tempat untuk membuat keputusan bisnis baru.
Keputusan bisnis final tetap mengacu pada Requirements, Business Rules, dan keputusan pengguna yang telah disetujui.
Rekomendasi teknis yang belum disetujui tidak boleh dianggap sebagai keputusan final.
2. Tahap 1 — Analisis dan Rancangan
Sebelum implementasi:
Membaca seluruh dokumen acuan.
Membaca AGENTS.md jika tersedia.
Membaca dokumentasi Next.js lokal sesuai versi yang terpasang.
Memeriksa struktur folder dan konfigurasi project.
Memeriksa kondisi kode dan lingkungan Docker yang sudah tersedia.
Memeriksa konsistensi kebutuhan dan aturan bisnis.
Mengidentifikasi aturan yang belum jelas atau bertentangan.
Memisahkan keputusan bisnis final dari rekomendasi teknis.
Mengusulkan arsitektur aplikasi.
Merancang struktur folder.
Merancang model database dan relasinya.
Merancang alur autentikasi dan hak akses.
Merancang alur status buku, pesanan, pembayaran, jadwal, pembatalan, dan pengembalian dana.
Merancang state machine untuk memastikan transisi status hanya terjadi melalui aturan yang sah.
Merancang strategi pengujian.
Rancangan database harus mempertimbangkan:
Pemisahan status pesanan utama, bukti pembayaran, jadwal, dan pengembalian dana.
Identitas setiap eksemplar buku.
Snapshot harga, kondisi, dan tenggat pada pesanan.
Riwayat pembayaran dan koreksi.
Audit administratif append-only.
Relasi pembayaran yang dapat mencakup beberapa pesanan.
Riwayat banner dan status pengajuan sesuai aturan yang disepakati.
Status Toko Libur dan riwayat penutupannya.
Penanganan akun customer dan admin yang dinonaktifkan atau dihapus.
Rancangan keamanan harus mempertimbangkan:
Pemeriksaan hak akses di server.
Verifikasi ulang tindakan sensitif.
Pembatasan percobaan login dan OTP.
Pemisahan data modal dan keuntungan.
Perlindungan sesi.
Penyimpanan file yang aman.
Pemulihan akun Admin Utama.
Rancangan transaksi harus mempertimbangkan:
Reservasi stok secara atomik.
Pencegahan pemesanan ganda.
Idempotensi.
Penanganan permintaan bersamaan.
Konsistensi pembatalan dan pengembalian stok.
Penanganan kegagalan jaringan dan penyimpanan.
Hasil yang diharapkan: rancangan teknis, rancangan database, alur sistem, serta daftar keputusan yang masih memerlukan persetujuan pengguna.
Rancangan belum boleh dianggap sebagai implementasi.
3. Tahap 2 — Persiapan Lingkungan
Memeriksa dan melanjutkan project yang sudah tersedia.
Pekerjaan:
Memverifikasi project Next.js dengan TypeScript yang sudah ada.
Menyiapkan dan memeriksa Docker serta Docker Compose.
Menyiapkan PostgreSQL.
Mengintegrasikan Prisma dengan database.
Memeriksa koneksi aplikasi dan database.
Memeriksa environment variables.
Memastikan .env tidak dimasukkan ke repository.
Menyiapkan .env.example tanpa nilai rahasia.
Memeriksa .gitignore.
Menyiapkan Git dan repository GitHub setelah mendapat persetujuan pengguna.
Mailpit tidak ditambahkan.
Penyedia email untuk verifikasi, pemulihan kata sandi, dan OTP belum ditetapkan. Penambahan Mailpit atau layanan email lain memerlukan persetujuan terpisah.
Hasil yang diharapkan: lingkungan pengembangan berjalan dan dapat diperiksa tanpa menghilangkan data project yang sudah ada.
4. Tahap 3 — Fondasi Aplikasi
Menyiapkan fondasi teknis yang akan digunakan oleh seluruh fitur.
Pekerjaan:
Menyiapkan struktur layout dan navigasi.
Menyiapkan tampilan dasar Bahasa Indonesia.
Menyiapkan pola validasi data.
Menyiapkan penanganan error.
Menyiapkan kontrak respons API.
Menyiapkan pola akses database menggunakan Prisma.
Menyiapkan mekanisme transaksi database.
Menyiapkan pemeriksaan hak akses di server.
Menyiapkan audit administratif append-only.
Menyiapkan mekanisme pembacaan audit khusus Admin Utama.
Menyiapkan fondasi pekerjaan terjadwal dan outbox untuk pengingat serta notifikasi.
Menyiapkan pemisahan data sensitif dari respons Admin Biasa.
Menyiapkan penanganan waktu server dan tampilan zona waktu Asia/Jakarta.
Menyiapkan mekanisme penyimpanan file.
Hasil yang diharapkan: fondasi aplikasi konsisten dan siap digunakan untuk pengembangan fitur berikutnya.
5. Tahap 4 — Autentikasi dan Hak Akses
Membangun sistem akun dan keamanan.
Pekerjaan:
Registrasi customer.
Login customer.
Login admin.
Pengelolaan sesi.
Logout.
Perlindungan login dan pembatasan percobaan gagal.
Pembagian hak akses Visitor, Customer, Admin Biasa, dan Admin Utama.
Pengelolaan profil customer.
Pemulihan password customer melalui tautan email.
Pengelolaan akun admin oleh Admin Utama.
Penetapan dan pengelolaan peran admin.
Penonaktifan akun admin sampai diaktifkan kembali secara manual.
Penghapusan permanen akun admin sesuai kewenangan.
Pencabutan sesi ketika akun dinonaktifkan atau dihapus.
Pemulihan akun Admin Utama melalui email pemulihan dan kode pemulihan cadangan.
Penonaktifan sementara customer sampai diaktifkan kembali secara manual.
Penonaktifan permanen customer sesuai aturan.
Penanganan permintaan penghapusan akun customer.
Penundaan penghapusan customer selama masih ada pesanan atau kewajiban yang belum selesai.
Pemertahanan catatan transaksi yang wajib disimpan.
Verifikasi ulang kata sandi atau OTP untuk tindakan sensitif.
Pembatasan sementara percobaan password atau OTP yang gagal berulang.
Penyediaan tampilan audit administratif khusus Admin Utama.
Aturan penting:
Hanya ada satu Admin Utama.
Hanya Admin Utama yang dapat mengelola akun admin dan perannya.
Audit administratif tidak boleh diedit atau dihapus melalui fungsi aplikasi, termasuk oleh Admin Utama.
Customer yang dinonaktifkan sementara tidak otomatis aktif berdasarkan tanggal.
Email untuk pemulihan dan OTP harus ditentukan sebelum pengujian alur email.
Hasil yang diharapkan: setiap pengguna hanya dapat mengakses fitur dan data sesuai kewenangannya.
6. Tahap 5 — Katalog dan Pengelolaan Buku
Membangun pengelolaan data buku dan katalog.
Pekerjaan:
Pengelolaan data buku oleh admin.
Pengelolaan setiap eksemplar secara individual.
Pengelolaan kode unik buku.
Pengelolaan judul, penulis, penerbit, tahun terbit, dan kategori.
Pengelolaan foto buku.
Pengelolaan kondisi dan catatan kondisi.
Pengelolaan harga jual.
Pengelolaan modal per eksemplar oleh Admin Utama.
Pencatatan riwayat koreksi modal.
Pemisahan data modal dari akses Admin Biasa.
Pencarian dan filter katalog.
Halaman detail buku.
Pengelolaan status ketersediaan.
Penghapusan buku yang belum memiliki riwayat transaksi.
Penonaktifan buku yang sudah memiliki riwayat.
Penggabungan data buku duplikat hanya oleh Admin Utama.
Pemertahanan seluruh riwayat pesanan dan transaksi setelah penggabungan.
Perubahan harga jual atau kondisi tidak boleh mengubah snapshot pesanan yang sudah dibuat.
Koreksi modal hanya dapat dilakukan Admin Utama dengan alasan dan pencatatan nilai lama serta nilai baru.
Toko Libur
Pada tahap ini juga dibangun pengelolaan status toko.
Pekerjaan:
Pembukaan dan penutupan toko secara manual oleh Admin Utama.
Alasan pembukaan atau penutupan sesuai aturan.
Status toko tersimpan di server atau database.
Dashboard status toko.
Tampilan informasi Toko Libur kepada customer.
Riwayat penutupan toko.
Pengeditan alasan penutupan sesuai kewenangan.
Penghapusan satu atau beberapa riwayat sesuai aturan.
Audit atas penghapusan riwayat.
Penghapusan massal secara atomik.
Sinkronisasi status:
Polling setiap 5 detik pada halaman toko, katalog, dan checkout.
Polling dijeda ketika tab browser tidak aktif.
Polling dilanjutkan ketika tab aktif kembali.
Status toko diambil ulang dari server setelah koneksi pulih.
Checkout diblokir jika toko tutup atau status toko tidak dapat dipastikan.
Keranjang customer tetap dipertahankan ketika toko tutup.
Status toko tidak boleh hanya mengandalkan penyimpanan lokal browser.
Hasil yang diharapkan: katalog dan data buku dapat dikelola dengan aman serta status toko konsisten di seluruh perangkat.
7. Tahap 6 — Sistem Banner
Membangun pengajuan dan pengelolaan banner beranda.
Pengajuan banner
Pekerjaan:
Admin Biasa dapat mengajukan banner kepada Admin Utama.
Gambar wajib disertakan.
URL tujuan bersifat opsional.
Judul dan deskripsi bersifat opsional serta dapat diisi terpisah atau bersamaan.
Admin Utama dapat melihat daftar pengajuan dan jumlah pengajuan tertunda.
Admin Biasa hanya melihat pengajuan miliknya dan jumlah pengajuan tertunda miliknya.
Maksimal 3 pengajuan tertunda untuk setiap Admin Biasa.
Admin Biasa dapat membatalkan pengajuan sendiri selama masih menunggu persetujuan.
Pengajuan yang dibatalkan tidak lagi dihitung sebagai pengajuan tertunda.
Pembatalan pengajuan tidak mengirim notifikasi kepada Admin Utama.
Pengajuan tidak mengirim notifikasi otomatis kepada Admin Utama.
Identitas pengaju hanya terlihat oleh Admin Utama.
Admin Utama dapat menyetujui atau menolak pengajuan.
Alasan penolakan bersifat opsional.
Admin Biasa dapat melihat status pengajuan sendiri, tetapi tidak melihat alasan penolakan.
Pengajuan yang ditolak tidak dapat diedit atau diajukan ulang.
Admin Utama dapat membuat dan menerbitkan banner sendiri secara langsung.
Pengelolaan banner terbit
Pekerjaan:
Pengelolaan banner aktif dan nonaktif oleh Admin Utama.
Pemisahan daftar banner aktif dan nonaktif.
Pengurutan banner aktif secara manual.
Maksimal 7 banner aktif.
Banner yang disetujui diterbitkan langsung jika kapasitas tersedia.
Banner yang dinonaktifkan tidak ditampilkan kepada customer dan tidak dihitung sebagai banner aktif.
Banner nonaktif dapat diaktifkan kembali jika kapasitas tersedia.
Banner yang diaktifkan kembali masuk ke posisi terakhir.
Jika sudah ada 7 banner aktif, penerbitan atau aktivasi ulang harus diblokir sampai Admin Utama menonaktifkan atau menghapus banner lain.
Tidak ada penggantian banner otomatis.
Banner yang sudah diterbitkan tidak dapat diedit.
Perubahan isi banner dilakukan dengan menghapus banner lama dan membuat banner baru.
Penghapusan banner permanen tanpa fitur pemulihan.
Penghapusan banner langsung dilakukan ketika Admin Utama menekan tindakan hapus.
Pengurutan hanya berlaku untuk banner aktif.
Admin Biasa dapat melihat banner aktif dan nonaktif, tetapi tidak dapat mengelolanya.
Identitas pengaju tidak ditampilkan kepada Admin Biasa.
Tampilan dan carousel
Pekerjaan:
Penyesuaian gambar dengan area banner.
Dukungan gambar dengan rasio dan dimensi berbeda.
Penampilan judul dan deskripsi di dalam gambar.
Blur pada area kiri gambar jika teks diisi.
Penentuan posisi dan warna teks secara otomatis.
Banner tanpa CTA.
Seluruh area banner dapat diklik jika memiliki URL tujuan.
URL internal membuka halaman website secara normal.
URL eksternal membuka tab baru.
Penggunaan ulang gambar atau URL secara terpisah diperbolehkan.
Kombinasi gambar dan URL yang sama tidak boleh digunakan bersamaan oleh dua banner aktif.
Perilaku carousel:
Autoplay setelah jeda beberapa detik.
Navigasi manual.
Autoplay berhenti sementara ketika pointer berada di atas banner pada desktop.
Autoplay berhenti sementara ketika customer menyentuh atau berinteraksi pada perangkat mobile.
Autoplay berjalan kembali setelah interaksi selesai.
Indikator titik ditampilkan di bawah banner.
Setiap titik dapat dipilih untuk berpindah banner.
Pemilihan manual tidak menghentikan autoplay secara permanen.
Jika hanya satu banner aktif, tampilkan secara statis tanpa autoplay, navigasi, dan titik.
Jika tidak ada banner aktif, seluruh area banner disembunyikan.
Penghapusan banner mempertahankan urutan relatif banner lain yang tersisa.
Durasi autoplay ditentukan sebagai spesifikasi teknis sebelum implementasi.
Hasil yang diharapkan: sistem banner berjalan sesuai batas kapasitas, alur persetujuan, dan perilaku tampilan yang telah disepakati.
8. Tahap 7 — Keranjang dan Pemesanan
Membangun proses pemesanan customer.
Pekerjaan:
Keranjang beberapa buku.
Validasi stok di server.
Pemeriksaan status toko saat checkout.
Penolakan checkout jika toko tutup.
Pemblokiran checkout sementara jika status toko tidak dapat dipastikan.
Pemeriksaan ulang stok, harga, kondisi, dan status buku.
Penahanan stok secara atomik.
Pencegahan pemesanan ganda dengan idempotensi.
Penyimpanan snapshot buku, harga, kondisi, dan tenggat.
Penyimpanan versi keranjang yang disetujui customer.
Pembuatan nomor pesanan.
Halaman detail pesanan.
Daftar pesanan aktif dan riwayat pesanan customer.
Notifikasi setelah pesanan berhasil dibuat.
Jika buku terjual secara offline ketika masih berada di keranjang customer:
Buku tersebut dihapus dari keranjang customer yang terdampak.
Customer menerima notifikasi.
Jika masih ada buku lain, customer harus memeriksa dan menyetujui ulang keranjang sebelum membuat pesanan.
Status utama pesanan:
Menunggu Pembayaran → Sudah Dibayar → Menunggu Diambil → Selesai.
Dibatalkan merupakan status akhir dan tidak dapat diaktifkan kembali.
Status jadwal, bukti pembayaran, dan pengembalian dana disimpan terpisah dari status utama pesanan.
Hasil yang diharapkan: pemesanan konsisten meskipun terjadi permintaan bersamaan atau koneksi bermasalah.
9. Tahap 8 — Pembayaran dan QRIS
Membangun sistem pembayaran QRIS dan pembayaran langsung di booth.
QRIS
Pekerjaan:
Pengelolaan gambar QRIS oleh Admin Utama.
Verifikasi ulang tindakan sensitif ketika mengganti QRIS.
Penyimpanan riwayat gambar QRIS sebelumnya.
Notifikasi kepada customer yang memiliki pesanan aktif ketika QRIS berubah.
Penampilan QRIS sesuai status pesanan.
Unggah bukti pembayaran customer.
Validasi jenis dan ukuran file.
Penyimpanan bukti pembayaran.
Penyimpanan riwayat bukti lama.
Penetapan bukti terbaru sebagai bukti aktif.
Pengelolaan status bukti pembayaran.
Penanganan bukti tidak valid dengan alasan.
Permintaan bukti baru.
Pencegahan unggahan berulang yang menyebabkan duplikasi proses.
Verifikasi pembayaran
Alur wajib:
Admin Biasa memeriksa bukti pembayaran.
Admin Biasa mengajukan hasil pemeriksaan.
Admin Utama memeriksa hasil pemeriksaan.
Admin Utama memberikan persetujuan final.
Pesanan berubah menjadi Sudah Dibayar setelah persetujuan final.
Hanya ada satu Admin Utama.
Tidak ada mekanisme eskalasi kepada Admin Utama kedua, persetujuan otomatis, atau pelewatan persetujuan final.
Jika keputusan belum diberikan, pesanan tetap menunggu keputusan dan sistem mengirim pengingat setiap 2 jam kepada pihak yang perlu bertindak.
Jika bukti tidak valid:
Alasan wajib dicatat.
Status pesanan tetap Menunggu Pembayaran.
Status bukti menjadi Perlu Bukti Baru.
Customer menerima notifikasi.
Bukti pengganti yang berhasil diunggah kembali masuk Menunggu Verifikasi.
Tenggat pembayaran
Pekerjaan:
Tenggat QRIS default 24 jam.
Snapshot tenggat pada setiap pesanan.
Perubahan tenggat global hanya oleh Admin Utama.
Perubahan tenggat global berlaku untuk pesanan baru.
Perpanjangan tenggat per pesanan dapat diajukan customer melalui website atau WhatsApp.
Permintaan WhatsApp dicatat ke website.
Admin Biasa dapat menyetujui atau menolak permintaan perpanjangan.
Perubahan tenggat dicatat beserta nilai lama, nilai baru, waktu, dan pelaku.
Permintaan perubahan metode pembayaran yang masih menunggu keputusan menghentikan sementara hitung mundur QRIS.
Jika perubahan metode pembayaran ditolak, sisa waktu dilanjutkan, bukan dimulai ulang.
Jika tenggat berlalu tanpa bukti, sistem dapat membatalkan pesanan secara otomatis.
Bukti yang berhasil diunggah sebelum tenggat tidak boleh dianggap terlambat hanya karena pemeriksaan dilakukan setelah tenggat.
Penanganan perlombaan proses unggah bukti dan pembatalan otomatis harus aman dan atomik.
Pembayaran langsung di CFD
Pekerjaan:
Admin mencatat pembayaran langsung.
Tidak memerlukan persetujuan final Admin Utama.
Admin mencatat penyerahan buku.
Setelah pembayaran dan penyerahan dikonfirmasi, pesanan langsung menjadi Selesai.
Koreksi pembayaran
Koreksi catatan pembayaran yang telah disetujui hanya dapat dilakukan Admin Utama.
Koreksi wajib memiliki alasan dan riwayat nilai sebelumnya.
Jumlah uang tidak boleh diubah melalui mekanisme koreksi tersebut.
Hasil yang diharapkan: seluruh pembayaran, bukti, keputusan, tenggat, dan koreksi dapat ditelusuri.
10. Tahap 9 — Jadwal dan Pengambilan
Membangun pengaturan jadwal pengambilan buku.
Pekerjaan:
Customer memilih tanggal pengambilan hari Minggu.
Tidak ada pilihan jam pengambilan.
Validasi tanggal dilakukan pada antarmuka dan server.
Admin dapat menyetujui atau menolak tanggal.
Penolakan jadwal wajib memiliki alasan.
Customer dapat memilih tanggal baru.
Customer dapat mengajukan perubahan jadwal berulang kali.
Customer dapat membatalkan permintaan perubahan jadwal yang masih menunggu keputusan.
Admin dapat mengusulkan perubahan jadwal dengan alasan.
Customer harus menyetujui usulan perubahan admin.
Customer dapat menolak usulan dengan alasan dan mengajukan tanggal baru.
Pengingat kepada admin setiap 2 jam selama permintaan jadwal menunggu keputusan.
Jadwal pesanan yang sudah dikonfirmasi tetap berlaku sampai perubahan disetujui.
Penggabungan jadwal beberapa pesanan tanpa menggabungkan status atau riwayat masing-masing.
Jam tutup lapak tetap pukul 09.00.
Customer tidak datang
Pekerjaan:
Admin menerima informasi bahwa customer tidak datang sebelum pukul 09.00.
Admin memutuskan apakah buku tetap ditahan, jadwal diubah, atau pesanan dibatalkan.
Jika buku tetap ditahan, admin menetapkan tenggat baru dan alasan.
Customer menerima pemberitahuan.
Stok tetap ditahan sampai ada pembatalan resmi.
Sistem tidak membatalkan otomatis hanya karena tenggat penahanan terlewati.
Setelah jadwal disetujui, status pesanan mengikuti alur yang telah ditetapkan.
Pesanan hanya menjadi Selesai setelah buku benar-benar diserahkan dan Admin mengonfirmasi penyelesaian.
Hasil yang diharapkan: jadwal dan penyerahan buku mengikuti aturan operasional Akira Books.
11. Tahap 10 — Pembatalan dan Pengembalian Dana
Membangun mekanisme pembatalan dan pengembalian dana.
Pekerjaan:
Pembatalan oleh customer sesuai haknya.
Pembatalan oleh Admin Biasa untuk pesanan yang belum dibayar.
Pembatalan oleh Admin Biasa untuk pesanan yang belum memperoleh persetujuan final Admin Utama.
Setiap pembatalan oleh Admin Biasa wajib memiliki alasan.
Setiap pembatalan oleh Admin Biasa menghasilkan audit dan notifikasi kepada Admin Utama.
Setelah pembayaran memperoleh persetujuan final Admin Utama, pembatalan hanya dapat dilakukan Admin Utama.
Pembatalan oleh Admin Utama mengikuti kewajiban alasan dan pencatatan riwayat.
Pencatatan pelaku, waktu, alasan, dan perubahan status.
Pengembalian stok setelah pembatalan resmi.
Pemeriksaan apakah buku masih aktif dan layak dijual sebelum dikembalikan menjadi tersedia.
Pencegahan pengembalian stok dua kali.
Pengembalian dana dipisahkan dari pembatalan.
Pekerjaan pengembalian dana:
Pencatatan status pengembalian dana.
Pencatatan nominal.
Pencatatan waktu.
Pencatatan admin yang menangani.
Pencatatan riwayat pengembalian sebagian atau beberapa kali.
Persetujuan pengembalian dana oleh Admin Utama.
Pemertahanan riwayat pembayaran awal.
Pesanan yang sudah selesai dan bukunya telah diserahkan tidak dapat dibatalkan melalui mekanisme normal.
Koreksi pesanan selesai hanya dilakukan Admin Utama dengan alasan dan riwayat.
Koreksi tidak boleh mengaktifkan kembali pesanan yang sudah dibatalkan atau otomatis menandakan dana sudah dikembalikan.
Hasil yang diharapkan: pembatalan dan pengembalian dana dapat ditelusuri secara terpisah serta tidak merusak riwayat transaksi.
12. Tahap 11 — Penjualan Offline dan Laporan
Membangun pencatatan transaksi booth dan laporan.
Penjualan offline
Pekerjaan:
Admin mencatat penjualan langsung di booth.
Pencatatan buku atau eksemplar.
Pencatatan harga jual aktual.
Pencatatan modal sesuai hak akses.
Pencatatan waktu transaksi.
Pencatatan admin yang melakukan transaksi.
Penandaan transaksi sebagai Offline.
Perhitungan laba kotor.
Penghapusan buku terjual dari keranjang customer yang terdampak.
Notifikasi kepada customer terkait.
Persetujuan ulang keranjang jika masih ada buku lain.
Koreksi harga transaksi offline:
Admin dapat mengajukan koreksi harga.
Alasan koreksi wajib dicatat.
Admin Utama memberikan persetujuan.
Nilai lama tetap berlaku sebelum persetujuan.
Nilai lama dan baru, pengaju, penyetuju, alasan, serta waktu harus tercatat.
Modal dan laba
Pekerjaan:
Pengelolaan modal per eksemplar oleh Admin Utama.
Koreksi modal dengan alasan.
Penyimpanan riwayat modal lama dan baru.
Perhitungan ulang laba berdasarkan modal terbaru.
Pemertahanan laba historis transaksi yang sudah selesai.
Pemisahan laba historis dan laba hasil perhitungan ulang.
Laba kotor = harga jual aktual dikurangi modal.
Laba baru dianggap terealisasi setelah buku diserahkan dan pesanan berstatus Selesai atau transaksi offline selesai.
Laporan
Pekerjaan:
Laporan penjualan harian.
Laporan penjualan bulanan.
Laporan penjualan tahunan.
Total pembayaran terverifikasi.
Jumlah buku terjual.
Riwayat transaksi.
Laba kotor dari penjualan selesai.
Pemisahan transaksi online dan offline.
Riwayat pembatalan.
Riwayat pengembalian dana.
Perbandingan laba historis dengan perhitungan berdasarkan modal terbaru.
Hanya Admin Utama yang dapat melihat laporan, modal, dan keuntungan.
Pembayaran yang sudah diterima tetapi buku belum diserahkan dicatat sebagai pembayaran diterima, bukan penjualan selesai.
Ekspor Excel dan laporan buku terlaris tidak termasuk MVP.
Hasil yang diharapkan: pencatatan dan laporan keuangan akurat serta tidak mencampur pembayaran diterima dengan penjualan selesai.
13. Tahap 12 — Notifikasi dan Pengingat
Membangun notifikasi website.
Pekerjaan:
Notifikasi pembuatan pesanan.
Notifikasi perubahan status pesanan.
Notifikasi pembayaran.
Notifikasi bukti pembayaran.
Notifikasi permintaan bukti baru.
Notifikasi perubahan jadwal.
Notifikasi perpanjangan tenggat.
Notifikasi pembatalan.
Notifikasi perubahan QRIS.
Notifikasi perubahan ketersediaan buku.
Notifikasi keputusan banner.
Notifikasi terkait akun customer.
Pengelompokan notifikasi sejenis.
Penanda belum dibaca.
Riwayat notifikasi lengkap.
Pencatatan penerima, isi, waktu, dan status baca.
Penanganan kegagalan pengiriman.
Percobaan ulang dengan jeda yang meningkat.
Peringatan kepada admin jika pengiriman akhirnya gagal.
Pencegahan notifikasi duplikat.
Pengingat:
Pengingat bukti pembayaran setiap 2 jam selama menunggu pemeriksaan atau keputusan.
Pengingat permintaan jadwal setiap 2 jam selama menunggu keputusan.
Pengingat menggunakan jadwal persisten.
Pengingat harus tetap berjalan setelah server restart.
Pengingat berhenti setelah keputusan terkait dibuat.
Tidak ada eskalasi kepada Admin Utama kedua.
Tidak ada persetujuan pembayaran otomatis.
Integrasi otomatis WhatsApp bukan bagian MVP.
Permintaan yang diterima melalui WhatsApp ditangani manual dan dicatat di website.
Hasil yang diharapkan: kejadian penting tetap tercatat dan dapat ditindaklanjuti meskipun pengiriman notifikasi mengalami kegagalan.
14. Tahap 13 — Backup, Keamanan, dan Pengujian Menyeluruh
Backup
Pekerjaan:
Backup otomatis harian.
Backup manual yang dapat dijalankan Admin Utama.
Penyimpanan backup di lokasi terpisah dan aman.
Retensi backup selama 30 hari.
Enkripsi backup menggunakan age.
Pemisahan kunci pembuka backup dari file backup dan repository.
Penyimpanan kunci oleh pemilik toko.
Backup database.
Backup file penting, termasuk foto buku, gambar QRIS, dan bukti pembayaran.
Pengujian pemulihan backup sebelum operasional dan secara berkala.
Penyedia atau layanan penyimpanan backup ditentukan pada tahap implementasi setelah mempertimbangkan keamanan dan kebutuhan operasional.
Pengujian keamanan dan transaksi
Pemeriksaan:
Hak akses Visitor, Customer, Admin Biasa, dan Admin Utama.
Pembatasan akses modal dan laporan.
Audit administratif append-only.
Audit hanya dapat dibaca Admin Utama.
Verifikasi ulang tindakan sensitif.
Pembatasan percobaan password dan OTP.
Pemulihan akun.
Penonaktifan dan penghapusan akun.
Snapshot harga, kondisi, dan tenggat.
Idempotensi pemesanan.
Pencegahan reservasi ganda.
Pencegahan pembayaran ganda.
Konsistensi pembatalan dan pengembalian stok.
Penanganan unggahan bukti yang gagal atau berulang.
Pengingat setelah restart.
Pencegahan notifikasi dan pengingat duplikat.
Penghapusan massal Toko Libur secara atomik.
Pengelolaan banner sesuai batas kapasitas dan kewenangan.
Pengujian Toko Libur
Skenario:
Toko ditutup ketika customer sedang membuka katalog.
Toko dibuka kembali tanpa customer memuat ulang halaman.
Admin menutup toko ketika customer sedang membuka checkout.
Permintaan checkout dikirim ketika toko sudah tutup.
Polling gagal kemudian koneksi pulih.
Tab browser tidak aktif kemudian kembali aktif.
Sesi Admin Utama kedaluwarsa saat melakukan perubahan.
Dua permintaan perubahan status terjadi hampir bersamaan.
Penyimpanan status atau riwayat gagal.
Riwayat dihapus kemudian perangkat lain melakukan sinkronisasi.
Keranjang tetap tersedia selama toko tutup.
Stok dan ketersediaan diperiksa kembali ketika checkout.
Pengujian banner
Skenario:
Pengajuan banner oleh Admin Biasa.
Pembatalan pengajuan yang masih tertunda.
Batas maksimal pengajuan tertunda per admin.
Persetujuan dan penolakan Admin Utama.
Banner langsung diterbitkan setelah disetujui jika kapasitas tersedia.
Batas maksimal 7 banner aktif.
Aktivasi ulang banner nonaktif.
Penolakan penerbitan ketika kapasitas penuh.
Penghapusan banner dan pemeliharaan urutan banner lain.
Banner tanpa URL.
Banner dengan URL internal dan eksternal.
Banner dengan judul saja, deskripsi saja, keduanya, atau tanpa teks.
Carousel satu banner, beberapa banner, dan tanpa banner.
Autoplay, navigasi manual, hover, serta interaksi mobile.
Pengujian menyeluruh
Pengujian alur transaksi lengkap.
Pengujian permintaan bersamaan.
Pengujian kegagalan jaringan dan percobaan ulang.
Pengujian idempotensi.
Pengujian status pesanan dan status pendukung.
Pengujian pembatalan dan pengembalian dana.
Pengujian penjualan offline.
Pengujian laporan dan perhitungan laba.
Pengujian backup dan pemulihan.
Pengujian tampilan HP, tablet, dan komputer.
Pemeriksaan Bahasa Indonesia pada seluruh antarmuka.
Pemeriksaan bahwa MVP tidak membutuhkan aplikasi Android atau iOS terpisah.
Pemeriksaan error, validasi, dan build aplikasi.
Hasil yang diharapkan: seluruh alur utama telah diuji dan masalah penting ditangani sebelum aplikasi dipersiapkan untuk penggunaan nyata.
15. Tahap 14 — Persiapan Penggunaan
Pekerjaan:
Pemeriksaan akhir seluruh fitur.
Pemeriksaan seluruh dokumen dan kesesuaian implementasi.
Pemeriksaan konfigurasi lingkungan penggunaan.
Pengamanan kredensial.
Pemeriksaan hak akses.
Peninjauan backup dan prosedur pemulihan.
Peninjauan penyimpanan file.
Pemeriksaan alur pemulihan akun.
Dokumentasi penggunaan customer.
Dokumentasi penggunaan admin.
Dokumentasi tindakan yang membutuhkan verifikasi ulang.
Pemeriksaan tampilan HP, tablet, dan komputer.
Pemeriksaan seluruh antarmuka menggunakan Bahasa Indonesia.
Penentuan prosedur pemeliharaan.
Pemeriksaan bahwa tidak ada fitur yang diklaim selesai tanpa pengujian.
Hasil yang diharapkan: aplikasi siap dievaluasi untuk penggunaan nyata setelah seluruh persyaratan, keamanan, dan pengujian terpenuhi.
16. Aturan Checkpoint
Pada akhir setiap tahap:
Ringkas pekerjaan yang selesai sejak checkpoint sebelumnya.
Tampilkan daftar file yang dibuat atau diubah.
Jalankan pemeriksaan yang relevan.
Jelaskan hasil pengujian.
Jelaskan masalah yang belum selesai.
Jelaskan konsep teknis yang perlu dipahami pengguna.
Bedakan keputusan bisnis final dari rekomendasi teknis.
Pastikan perubahan hanya mencakup lingkup tahap tersebut.
Berikan kesempatan kepada pengguna untuk meninjau hasil.
Ingatkan pengguna untuk commit dan push ke GitHub jika checkpoint disetujui.
Jangan melakukan commit atau push tanpa persetujuan pengguna.
Tunggu persetujuan sebelum melanjutkan ke tahap besar berikutnya.
Urutan tahap dapat disesuaikan jika terdapat ketergantungan teknis. Perubahan urutan harus dijelaskan dan disetujui pengguna.
17. Prinsip Pelaksanaan
Jangan mengimplementasikan seluruh fitur sekaligus.
Utamakan keamanan, konsistensi database, ketepatan aturan bisnis, pengujian, dan pemahaman pengguna.
Jika ada aturan yang belum jelas atau bertentangan, hentikan bagian yang terdampak dan minta keputusan sebelum coding.
Rekomendasi teknis tidak boleh dianggap sebagai keputusan bisnis baru tanpa persetujuan.
Jangan mengubah konfigurasi, dependensi, skema database, migrasi, atau file di luar lingkup tugas tanpa persetujuan.
Jangan menghapus data atau volume Docker tanpa persetujuan.
Jangan menyatakan fitur sudah diterapkan jika baru tercantum dalam rencana.
Setiap tahap harus memiliki hasil yang dapat diperiksa sebelum melanjutkan ke tahap berikutnya.
Dokumen ini menjadi panduan pelaksanaan pengembangan Akira Books dan harus dijalankan bersama tiga dokumen acuan lainnya.


