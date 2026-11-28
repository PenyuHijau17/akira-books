// src/lib/dataDummyBuku.ts
// Data dummy katalog Akira Books untuk pengujian etalase, katalog, dan /admin/buku.
// 100% Bahasa Indonesia. Data ini sengaja dibuat realistis, tetapi bukan
// data bibliografi resmi: tahun/edisi disusun mendekati buku yang beredar di Indonesia.
//
// Catatan model (BR-026 / GR-08): skema Book tidak memiliki kolom kondisi fisik
// per eksemplar. Kondisi ORIGINAL/BEKAS disimpan di awal `description` dan
// ditampilkan juga pada sampul hasil generate, tanpa mengubah skema database.

export type KondisiBuku = 'ORIGINAL' | 'BEKAS'

export type BukuDummy = {
  code: string
  title: string
  author: string
  publisher: string
  publishYear: number
  kategori: string
  kondisi: KondisiBuku
  hargaJual: number
  hargaModal: number
  stok: number
  status: string
  sinopsis: string
}

export const daftarDummyBuku: BukuDummy[] = [
  {
    code: 'BK-0002',
    title: 'Negeri 5 Menara',
    author: 'A. Fuadi',
    publisher: 'Gramedia Pustaka Utama',
    publishYear: 2009,
    kategori: 'Fiksi',
    kondisi: 'ORIGINAL',
    hargaJual: 88000,
    hargaModal: 60000,
    stok: 9,
    status: 'TERSEDIA',
    sinopsis:
      'Kisah perjalanan lima sahabat dari pesantren hingga ke negeri orang, tentang mimpi, disiplin, dan persahabatan.',
  },
  {
    code: 'BK-0003',
    title: 'Laut Bercerita',
    author: 'Leila S. Chudori',
    publisher: 'Kepustakaan Populer Gramedia',
    publishYear: 2017,
    kategori: 'Sastra',
    kondisi: 'ORIGINAL',
    hargaJual: 99000,
    hargaModal: 68000,
    stok: 6,
    status: 'TERSEDIA',
    sinopsis:
      'Sebuah novel tentang kehilangan, pengorbanan, dan jejak-jejak yang tertinggal bagi mereka yang ditinggalkan.',
  },
  {
    code: 'BK-0004',
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    publisher: 'Kepustakaan Populer Gramedia',
    publishYear: 1980,
    kategori: 'Sastra',
    kondisi: 'BEKAS',
    hargaJual: 85000,
    hargaModal: 58000,
    stok: 4,
    status: 'TERSEDIA',
    sinopsis:
      'Kisah Minke dan Nyai Ontosoroh yang membuka mata pada ketidakadilan dan kebangkitan kesadaran kebangsaan.',
  },
  {
    code: 'BK-0005',
    title: 'Cantik Itu Luka',
    author: 'Eka Kurniawan',
    publisher: 'Bentang Pustaka',
    publishYear: 2002,
    kategori: 'Sastra',
    kondisi: 'BEKAS',
    hargaJual: 82000,
    hargaModal: 56000,
    stok: 3,
    status: 'TERSEDIA',
    sinopsis:
      'Kisah seorang perempuan yang melintasi masa dan turut mewarnai sejarah kecil sebuah desa di Jawa.',
  },
  {
    code: 'BK-0006',
    title: 'Bintang',
    author: 'Tere Liye',
    publisher: 'Sabakgrip',
    publishYear: 2015,
    kategori: 'Fiksi',
    kondisi: 'ORIGINAL',
    hargaJual: 92000,
    hargaModal: 64000,
    stok: 7,
    status: 'TERSEDIA',
    sinopsis:
      'Petualangan dua sahabat yang menyusuri kota dan hutan untuk menemukan jawaban atas kehilangan mereka.',
  },
  {
    code: 'BK-0007',
    title: 'Ayah',
    author: 'Andrea Hirata',
    publisher: 'Bentang Pustaka',
    publishYear: 2015,
    kategori: 'Sastra',
    kondisi: 'ORIGINAL',
    hargaJual: 79000,
    hargaModal: 54000,
    stok: 11,
    status: 'TERSEDIA',
    sinopsis:
      'Sebuah pengembaraan batin seorang ayah yang menemukan kembali akar keluarga dan makna kehadiran.',
  },
  {
    code: 'BK-0008',
    title: 'Sang Pemimpi',
    author: 'Andrea Hirata',
    publisher: 'Bentang Pustaka',
    publishYear: 2006,
    kategori: 'Sastra',
    kondisi: 'BEKAS',
    hargaJual: 76000,
    hargaModal: 52000,
    stok: 8,
    status: 'TERSEDIA',
    sinopsis:
      'Cerita Ikal dan sahabatnya tentang mimpi besar, cinta pertama, dan sekolah yang tak pernah mereka lupakan.',
  },
  {
    code: 'BK-0009',
    title: 'Perahu Kertas',
    author: 'Dee Lestari',
    publisher: 'Bentang Pustaka',
    publishYear: 2009,
    kategori: 'Fiksi',
    kondisi: 'ORIGINAL',
    hargaJual: 89000,
    hargaModal: 61000,
    stok: 10,
    status: 'TERSEDIA',
    sinopsis:
      'Kisah cinta dan seni yang bergerak pelan, seperti perahu kertas yang mengarungi ruang dan waktu.',
  },
  {
    code: 'BK-0010',
    title: 'Aroma',
    author: 'Dee Lestari',
    publisher: 'Bentang Pustaka',
    publishYear: 2004,
    kategori: 'Fiksi',
    kondisi: 'BEKAS',
    hargaJual: 74000,
    hargaModal: 50000,
    stok: 0,
    status: 'TERJUAL',
    sinopsis:
      'Novel yang merangkai ingatan, makanan, dan relasi manusia dalam alur yang lembut serta penuh detail.',
  },
  {
    code: 'BK-0011',
    title: 'Filosofi Teras',
    author: 'Henry Manampiring',
    publisher: 'Kompas',
    publishYear: 2018,
    kategori: 'Pengembangan Diri',
    kondisi: 'ORIGINAL',
    hargaJual: 72000,
    hargaModal: 48000,
    stok: 15,
    status: 'TERSEDIA',
    sinopsis:
      'Pengantar stoikisme untuk kehidupan sehari-hari: mengelola emosi, fokus pada yang bisa dikendalikan.',
  },
  {
    code: 'BK-0012',
    title: 'Ayat-Ayat Cinta',
    author: 'Habiburrahman El Shirazy',
    publisher: 'Mizan',
    publishYear: 2004,
    kategori: 'Fiksi',
    kondisi: 'ORIGINAL',
    hargaJual: 78000,
    hargaModal: 52000,
    stok: 12,
    status: 'TERSEDIA',
    sinopsis:
      'Kisah cinta, iman, dan pilihan hidup yang mengantar tokohnya mencari makna kebahagiaan yang sesungguhnya.',
  },
  {
    code: 'BK-0013',
    title: 'Geez & Ann',
    author: 'Riswanda Pratama',
    publisher: 'Sabakgrip',
    publishYear: 2017,
    kategori: 'Fiksi',
    kondisi: 'BEKAS',
    hargaJual: 68000,
    hargaModal: 44000,
    stok: 5,
    status: 'TERSEDIA',
    sinopsis:
      'Cerita remaja yang jujur tentang persahabatan, cinta pertama, dan keberanian menghadapi kehilangan.',
  },
  {
    code: 'BK-0014',
    title: 'Bung Karno: Penyambung Lidah Rakyat Indonesia',
    author: 'Cindy Adams',
    publisher: 'Gramedia Pustaka Utama',
    publishYear: 1966,
    kategori: 'Biografi',
    kondisi: 'BEKAS',
    hargaJual: 95000,
    hargaModal: 66000,
    stok: 0,
    status: 'TERSEDIA',
    sinopsis:
      'Catatan perjalanan hidup Soekarno dari sudut pandang wawancara yang intim, penuh semangat, dan kontroversial.',
  },
  {
    code: 'BK-0015',
    title: 'The Lean Startup',
    author: 'Eric Ries',
    publisher: 'Mizan',
    publishYear: 2012,
    kategori: 'Bisnis',
    kondisi: 'ORIGINAL',
    hargaJual: 105000,
    hargaModal: 72000,
    stok: 6,
    status: 'TERSEDIA',
    sinopsis:
      'Panduan membangun usaha dengan percobaan cepat, ukuran yang jelas, dan pembelajaran berkelanjutan.',
  },
  {
    code: 'BK-0016',
    title: 'Catatan Sejarah Indonesia: Dari Proklamasi ke Reformasi',
    author: 'Anhar Gonggong',
    publisher: 'Kompas',
    publishYear: 2015,
    kategori: 'Sejarah',
    kondisi: 'BEKAS',
    hargaJual: 108000,
    hargaModal: 75000,
    stok: 6,
    status: 'TERSEDIA',
    sinopsis:
      'Ringkasan perjalanan bangsa dari masa proklamasi hingga reformasi untuk memahami akar persoalan masa kini.',
  },
]
