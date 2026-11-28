// src/lib/notifikasiKartu.ts
// Penyajian kotak masuk: satu kartu ringkas per jenis & konteks notifikasi.
// Logika murni (tanpa database) agar dapat diuji unit. GR-03: hanya field
// tampilan yang dikirim ke browser; metadata dan data finansial tidak ikut.

import {
  kategoriDariKunci,
  tautanDetailPesanan,
  type NotifikasiItem,
} from './notifikasi'
import {
  bersihkanPesanNotifikasi,
  jenisNotifikasiDariKunci,
  kunciBakuNotifikasi,
} from './notifikasiKunci'

export type PeranKartuNotifikasi =
  | 'PENGUNGGUNG'
  | 'CUSTOMER'
  | 'ADMIN_BIASA'
  | 'ADMIN_UTAMA'

export type InfoPesananKartu = {
  id: string
  orderNumber: string
  customerId: string
}

export type InfoPenggunaKartu = {
  id: string
  name: string | null
  avatarUrl?: string | null
}

export type FilterJenisNotifikasi =
  | 'semua'
  | 'pemesanan'
  | 'pembayaran'
  | 'jadwal'
  | 'pembatalan-refund'
  | 'sistem'

export type KartuNotifikasi = {
  kunci: string
  judul: string
  /** Label pendek huruf kapital yang tampil di badge kartu. */
  labelJenis: string
  filterJenis: FilterJenisNotifikasi
  kategori: string
  namaPelanggan: string | null
  avatarUrl: string | null
  /** Kode pesanan atau buku yang ditonjolkan (tebal) di bawah judul jenis. */
  kode: string | null
  kodePesanan: string | null
  ringkasan: string
  waktuTerbaru: string
  belumDibaca: boolean
  ids: string[]
  tautan: string | null
  labelTautan: string | null
}

const POLA_NOMOR_PESANAN = /AKB-\d{8}-\d{6}/i

function waktu(item: NotifikasiItem): number {
  const nilai =
    item.createdAt instanceof Date
      ? item.createdAt.getTime()
      : new Date(item.createdAt).getTime()
  return Number.isFinite(nilai) ? nilai : 0
}

function kategoriEfektif(item: NotifikasiItem): string {
  const kategori = String(item.kategori || '').toUpperCase()
  if (
    ['PEMBAYARAN', 'JADWAL', 'PESANAN', 'PENJUALAN', 'SISTEM', 'UMUM'].includes(
      kategori
    )
  )
    return kategori
  return kategoriDariKunci(item.groupKey)
}

/** Judul jenis ditaruh paling atas kartu agar mudah dipindai. */
export function judulKartuNotifikasi(jenis: string, kategori: string): string {
  if (jenis === 'OUTBOX_GAGAL') return 'Peringatan Email Sistem'
  if (jenis.startsWith('SISTEM') || kategori === 'SISTEM') return 'Peringatan Sistem'
  if (jenis.startsWith('PEMBATALAN')) return 'Pembatalan Pesanan'
  if (jenis.startsWith('REFUND')) return 'Pengembalian Dana'
  if (jenis === 'PESANAN_DIBUAT' || jenis.startsWith('PESANAN_BARU'))
    return 'Pemesanan Baru'
  if (jenis.startsWith('PENGINGAT_JADWAL') || jenis.startsWith('JADWAL'))
    return 'Jadwal Pengambilan'
  if (
    jenis.startsWith('PENGINGAT_BUKTI') ||
    jenis.startsWith('BUKTI') ||
    jenis.startsWith('PEMBAYARAN') ||
    jenis.startsWith('PUTUSAN') ||
    jenis.startsWith('METODE') ||
    jenis.startsWith('TENGGAT') ||
    jenis.startsWith('QRIS')
  )
    return 'Verifikasi Pembayaran'
  if (jenis.startsWith('KOREKSI')) return 'Koreksi Harga Offline'
  if (kategori === 'PENJUALAN') return 'Penjualan Offline'
  if (kategori === 'PESANAN') return 'Pemberitahuan Pesanan'
  return 'Informasi Toko'
}

/** Label badge pendek, tegas, dan seragam untuk dipindai sekilas. */
export function labelJenisKartu(judul: string): string {
  if (judul === 'Pemesanan Baru' || judul === 'Pemberitahuan Pesanan') return 'PEMESANAN'
  if (judul === 'Verifikasi Pembayaran') return 'PEMBAYARAN'
  if (judul === 'Jadwal Pengambilan') return 'JADWAL'
  if (judul === 'Pembatalan Pesanan') return 'PEMBATALAN'
  if (judul === 'Pengembalian Dana') return 'REFUND'
  if (judul === 'Koreksi Harga Offline' || judul === 'Penjualan Offline')
    return 'KOREKSI HARGA'
  return 'SISTEM'
}

/** Filter jenis yang tersedia di atas daftar notifikasi. */
export function filterJenisKartu(label: string): FilterJenisNotifikasi {
  if (label === 'PEMESANAN') return 'pemesanan'
  if (label === 'PEMBAYARAN' || label === 'KOREKSI HARGA') return 'pembayaran'
  if (label === 'JADWAL') return 'jadwal'
  if (label === 'PEMBATALAN' || label === 'REFUND') return 'pembatalan-refund'
  return 'sistem'
}

/** Satu aksi utama yang sesuai dengan jenis notifikasi dan peran penerima. */
export function aksiKartuNotifikasi(args: {
  jenis: string
  kategori: string
  peran: PeranKartuNotifikasi | null
  tautanPesanan: string | null
}): { tautan: string | null; labelTautan: string | null } {
  const { jenis, kategori, peran, tautanPesanan } = args
  const admin = peran === 'ADMIN_BIASA' || peran === 'ADMIN_UTAMA'

  if (admin) {
    // Peringatan email/sistem dibuka di panel khusus, bukan di halaman pesanan.
    if (jenis === 'OUTBOX_GAGAL' || jenis.startsWith('SISTEM') || kategori === 'SISTEM')
      return { tautan: '/admin/notifikasi', labelTautan: 'Buka Peringatan Notifikasi' }
    if (jenis.startsWith('PEMBATALAN'))
      return { tautan: '/admin/pembatalan', labelTautan: 'Tinjau Pembatalan' }
    if (jenis.startsWith('REFUND'))
      return { tautan: '/admin/refund', labelTautan: 'Proses Refund' }
    // Koreksi harga offline punya halaman sendiri; jangan salah arahkan ke bayar.
    if (jenis.startsWith('KOREKSI') || kategori === 'PENJUALAN')
      return { tautan: '/admin/penjualan-offline', labelTautan: 'Buka Penjualan Offline' }
    if (jenis.startsWith('PENGINGAT_JADWAL') || jenis.startsWith('JADWAL'))
      return { tautan: '/admin/jadwal', labelTautan: 'Proses Jadwal' }
    if (
      jenis.startsWith('PESANAN_DIBUAT') ||
      jenis.startsWith('PESANAN_BARU') ||
      jenis.startsWith('PENGINGAT_BUKTI') ||
      jenis.startsWith('BUKTI') ||
      jenis.startsWith('PEMBAYARAN') ||
      jenis.startsWith('PUTUSAN') ||
      jenis.startsWith('METODE') ||
      jenis.startsWith('TENGGAT') ||
      jenis.startsWith('QRIS')
    )
      return { tautan: '/admin/pembayaran', labelTautan: 'Proses Pembayaran' }
    return { tautan: null, labelTautan: null }
  }

  if (tautanPesanan)
    return { tautan: tautanPesanan, labelTautan: 'Lihat Detail Pesanan' }
  return { tautan: null, labelTautan: null }
}

/**
 * Kode yang ditebalkan di bawah judul: nomor pesanan untuk pesanan, atau
 * judul/kode buku untuk notifikasi penjualan & koreksi harga offline.
 */
function kodeKonteksKartu(args: {
  kodePesanan: string | null
  kategori: string
  jenis: string
  pesan: string
}): string | null {
  const { kodePesanan, kategori, jenis, pesan } = args
  if (kodePesanan) return kodePesanan
  if (jenis.startsWith('KOREKSI') || kategori === 'PENJUALAN') {
    const buku = pesan.match(/\(([^)]{2,80})\)/)?.[1]?.trim()
    return buku || (jenis.startsWith('KOREKSI') ? 'Koreksi Harga Offline' : 'Penjualan Offline')
  }
  return null
}

/**
 * Gabungkan baris notifikasi menjadi kartu tunggal. Kunci kanonik dipakai
 * kembali agar duplikat lama yang belum dibersihkan tetap tampil sekali.
 */
export function kelompokkanNotifikasiMenjadiKartu(
  daftar: NotifikasiItem[],
  opsi: {
    userId?: string
    peran?: PeranKartuNotifikasi | null
    pesanan?: InfoPesananKartu[]
    pengguna?: InfoPenggunaKartu[]
  } = {}
): KartuNotifikasi[] {
  const userId = String(opsi.userId || '')
  const peran = opsi.peran ?? null
  const semuaPesanan = opsi.pesanan || []
  const admin =
    peran === 'ADMIN_BIASA' || peran === 'ADMIN_UTAMA'
  const pesananTampil = admin
    ? semuaPesanan
    : semuaPesanan.filter((pesanan) => pesanan.customerId === userId)
  const pengguna = opsi.pengguna || []
  const peta = new Map<
    string,
    {
      item: NotifikasiItem
      baku: ReturnType<typeof kunciBakuNotifikasi>
      ids: string[]
      belumDibaca: boolean
      pesan: string
    }
  >()

  for (const mentah of [...daftar].sort((a, b) => waktu(b) - waktu(a))) {
    const item: NotifikasiItem = {
      id: String(mentah.id || ''),
      kategori: kategoriEfektif(mentah),
      entitasId: mentah.entitasId ?? null,
      groupKey: mentah.groupKey ?? null,
      message: bersihkanPesanNotifikasi(mentah.message),
      isRead: Boolean(mentah.isRead),
      createdAt: mentah.createdAt,
    }
    const baku = kunciBakuNotifikasi({
      groupKey: item.groupKey,
      kategori: item.kategori,
      entitasId: item.entitasId,
      message: item.message,
      userId,
    })
    const kunci = baku.groupKey
    const grup = peta.get(kunci) || {
      item,
      baku,
      ids: [],
      belumDibaca: false,
      pesan: item.message,
    }
    grup.ids.push(item.id)
    grup.pesan = `${grup.pesan} ${item.message}`.trim()
    if (!item.isRead) grup.belumDibaca = true
    peta.set(kunci, grup)
  }

  return [...peta.entries()]
    .map(([kunci, grup]): KartuNotifikasi => {
      const { item, baku, ids, belumDibaca, pesan: pesanGrup } = grup
      const kategori = kategoriEfektif(item)
      const jenis =
        jenisNotifikasiDariKunci(item.groupKey, item.kategori) || baku.jenis
      // Peringatan sistem boleh menyebut kode pesanan, tetapi tidak boleh
      // mengarah ke halaman pesanan (terutama untuk Admin yang memakai panel).
      const bolehTautanPesanan =
        !jenis.startsWith('SISTEM') &&
        jenis !== 'OUTBOX_GAGAL' &&
        ['PEMBAYARAN', 'JADWAL', 'PESANAN'].includes(kategori)
      const tautanPesanan = bolehTautanPesanan
        ? tautanDetailPesanan(item, pesananTampil)
        : null
      const pesanan = tautanPesanan
        ? semuaPesanan.find((p) => `/pesanan/${p.id}` === tautanPesanan)
        : undefined
      const penggunaTerkait = pesanan
        ? pengguna.find((p) => p.id === pesanan.customerId)
        : undefined
      const namaPelanggan = admin
        ? penggunaTerkait?.name || null
        : penggunaTerkait
          ? penggunaTerkait.name
          : null
      const kodePesanan =
        pesanan?.orderNumber ||
        String(item.message || '').match(POLA_NOMOR_PESANAN)?.[0]?.toUpperCase() ||
        null
      const kode = kodeKonteksKartu({
        kodePesanan,
        kategori,
        jenis,
        pesan: pesanGrup,
      })
      const pesanRingkas = String(item.message || '')
        .replace(/^Pengingat:\s*/i, '')
        .replace(
          /^Usul koreksi harga penjualan offline menunggu persetujuan Admin Utama\s*/i,
          'Usul koreksi harga: '
        )
        .trim()
      const cuplikan =
        pesanRingkas.length > 72 ? `${pesanRingkas.slice(0, 69)}…` : pesanRingkas
      const ringkasan = [namaPelanggan, cuplikan]
        .filter((bagian): bagian is string => Boolean(bagian))
        .join(' • ')
      const aksi = aksiKartuNotifikasi({
        jenis,
        kategori,
        peran,
        tautanPesanan: admin ? null : tautanPesanan,
      })

      const judul = judulKartuNotifikasi(jenis, kategori)
      const labelJenis = labelJenisKartu(judul)

      return {
        kunci,
        judul,
        labelJenis,
        filterJenis: filterJenisKartu(labelJenis),
        kategori,
        namaPelanggan,
        avatarUrl: penggunaTerkait?.avatarUrl ?? null,
        kode,
        kodePesanan,
        ringkasan: ringkasan || 'Tidak ada ringkasan tambahan.',
        waktuTerbaru: new Date(waktu(item)).toISOString(),
        belumDibaca,
        ids,
        tautan: aksi.tautan,
        labelTautan: aksi.labelTautan,
      }
    })
    .sort(
      (a, b) =>
        new Date(b.waktuTerbaru).getTime() - new Date(a.waktuTerbaru).getTime()
    )
}
