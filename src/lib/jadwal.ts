// src/lib/jadwal.ts
// Logika murni Jadwal & Pengambilan (Tahap 9) — tanpa akses database agar mudah diuji.
// Referensi: FR-PICK-001/002, FR-DONE-001, BR-006, BR-018, BR-019, BR-024, BR-025.

import { toWIB } from '@/lib/timezone'
import {
  daftarMingguBerikutnya,
  tanggalMingguKeDate,
  validasiTanggalMinggu,
} from '@/lib/pesanan'

// Jam tutup booth bersifat tetap dan tidak dapat diubah lewat pengaturan admin (BR-018).
export const JAM_TUTUP_WIB = 9
export const TENGGAT_TAHAN_NO_SHOW_JAM = 24
export const ALASAN_NO_SHOW =
  'Customer tidak hadir sebelum pukul 09.00 WIB pada hari Minggu yang dijadwalkan'

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/

export type HasilValidasiJadwal = {
  valid: boolean
  alasan: string | null
  tanggal: Date | null
}

/** Ubah sebuah tanggal/WIB date-string menjadi batas tutup pukul 09.00 WIB (02.00 UTC). */
export function batasWaktuPengambilan(tanggal: Date | string): Date {
  if (typeof tanggal === 'string' && POLA_TANGGAL.test(tanggal)) {
    return tanggalMingguKeDate(tanggal)
  }
  const asal = tanggal instanceof Date ? tanggal : new Date(tanggal)
  const wib = toWIB(asal)
  return new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), JAM_TUTUP_WIB - 7, 0, 0, 0)
  )
}

function tanggalWIB(date: Date): string {
  const wib = toWIB(date)
  const tahun = wib.getUTCFullYear()
  const bulan = String(wib.getUTCMonth() + 1).padStart(2, '0')
  const hari = String(wib.getUTCDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${hari}`
}

/**
 * Validasi tanggal pengambilan di server.
 * Menerima "YYYY-MM-DD" (tanggal WIB) atau ISO yang tepat pada 09.00 WIB (02.00 UTC).
 */
export function validasiTanggalPengambilan(
  input: unknown,
  sekarang: Date = new Date()
): HasilValidasiJadwal {
  const gagal = (alasan: string): HasilValidasiJadwal => ({ valid: false, alasan, tanggal: null })

  if (typeof input !== 'string' || input.trim().length === 0) {
    return gagal('Tanggal pengambilan wajib diisi')
  }

  const nilai = input.trim()
  let tanggal: Date

  if (POLA_TANGGAL.test(nilai)) {
    tanggal = tanggalMingguKeDate(nilai)
    if (Number.isNaN(tanggal.getTime()) || tanggalWIB(tanggal) !== nilai) {
      return gagal('Tanggal pengambilan tidak valid')
    }
  } else {
    tanggal = new Date(nilai)
    if (Number.isNaN(tanggal.getTime())) return gagal('Tanggal pengambilan tidak valid')
    const tepat09WIB =
      tanggal.getUTCHours() === JAM_TUTUP_WIB - 7 &&
      tanggal.getUTCMinutes() === 0 &&
      tanggal.getUTCSeconds() === 0 &&
      tanggal.getUTCMilliseconds() === 0
    if (!tepat09WIB) return gagal('Waktu pengambilan tetap pukul 09.00 WIB')
  }

  const cek = validasiTanggalMinggu(tanggal, sekarang)
  if (!cek.valid) return gagal(cek.alasan || 'Tanggal pengambilan tidak valid')
  return { valid: true, alasan: null, tanggal }
}

/** Alasan wajib minimum 3 karakter untuk penolakan/usulan/jadwal no-show. */
export function validasiAlasan(alasan: unknown, wajib: boolean = true): HasilValidasiJadwal {
  const teks = typeof alasan === 'string' ? alasan.trim() : ''
  if (!wajib) return { valid: true, alasan: null, tanggal: null }
  if (teks.length < 3) {
    return { valid: false, alasan: 'Alasan wajib diisi minimal 3 karakter', tanggal: null }
  }
  return { valid: true, alasan: null, tanggal: null }
}

/** Pukul 09.00 WIB adalah batas tutup: pengajuan perubahan tidak diterima mulai detik itu. */
export function sudahLewatPengambilan(tanggal: Date | string, sekarang: Date): boolean {
  return sekarang.getTime() >= batasWaktuPengambilan(tanggal).getTime()
}

/** No-show hanya setelah pukul 09.00 WIB (tidak pada detik tepat 09.00). */
export function sudahLewatUntukNoShow(tanggal: Date | string, sekarang: Date): boolean {
  return sekarang.getTime() > batasWaktuPengambilan(tanggal).getTime()
}

const STATUS_AKTIF = new Set([
  'MENUNGGU_KONFIRMASI',
  'DISETUJUI',
  'PERLU_TANGGAL_BARU',
  'PERUBAHAN_MENUNGGU_PERSETUJUAN',
  'TIDAK_HADIR',
])

export type OpsiAjukanCustomer = {
  orderStatus: string
  pickupStatus: string
  pickupSundayDate: Date
  sekarang: Date
}

/** Customer boleh mengajukan/ubah jadwal sebelum batas 09.00 WIB pada hari pengambilan. */
export function bolehAjukanCustomer(args: OpsiAjukanCustomer): HasilValidasiJadwal {
  if (['SELESAI', 'DIBATALKAN'].includes(args.orderStatus)) {
    return { valid: false, alasan: 'Pesanan sudah selesai atau dibatalkan', tanggal: null }
  }
  if (!STATUS_AKTIF.has(args.pickupStatus)) {
    return { valid: false, alasan: 'Status jadwal tidak memungkinkan perubahan', tanggal: null }
  }
  if (args.pickupStatus === 'DISETUJUI' && sudahLewatPengambilan(args.pickupSundayDate, args.sekarang)) {
    return {
      valid: false,
      alasan: 'Jadwal sudah lewat. Hubungi admin untuk penanganan ketidakhadiran.',
      tanggal: null,
    }
  }
  return { valid: true, alasan: null, tanggal: null }
}

export type OpsiUsulAdmin = {
  orderStatus: string
  pickupStatus: string
}

/** Admin boleh mengusulkan tanggal pengganti; jadwal lama tetap berlaku sampai disetujui Customer. */
export function bolehUsulAdmin(args: OpsiUsulAdmin): HasilValidasiJadwal {
  if (['SELESAI', 'DIBATALKAN'].includes(args.orderStatus)) {
    return { valid: false, alasan: 'Pesanan sudah selesai atau dibatalkan', tanggal: null }
  }
  if (!['DISETUJUI', 'PERLU_TANGGAL_BARU', 'TIDAK_HADIR', 'PERUBAHAN_MENUNGGU_PERSETUJUAN'].includes(args.pickupStatus)) {
    return {
      valid: false,
      alasan: 'Setujui atau tolak pengajuan jadwal yang masih menunggu terlebih dahulu',
      tanggal: null,
    }
  }
  return { valid: true, alasan: null, tanggal: null }
}

export function statusSetelahSetujuAdmin(pickupStatus: string): string | null {
  if (pickupStatus === 'MENUNGGU_KONFIRMASI' || pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN') {
    return 'DISETUJUI'
  }
  return null
}

export function statusSetelahTolakAdmin(pickupStatus: string): string | null {
  if (pickupStatus === 'MENUNGGU_KONFIRMASI' || pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN') {
    return 'PERLU_TANGGAL_BARU'
  }
  return null
}

export function statusSetelahSetujuCustomer(pickupStatus: string): string | null {
  return pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN' ? 'DISETUJUI' : null
}

export function statusSetelahTolakCustomer(pickupStatus: string): string | null {
  return pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN' ? 'PERLU_TANGGAL_BARU' : null
}

export function statusSetelahBatalPengajuan(pickupStatus: string): string | null {
  return pickupStatus === 'MENUNGGU_KONFIRMASI' ? 'PERLU_TANGGAL_BARU' : null
}

/** Status aktif kembali saat pengaju membatalkan usulannya (hanya jika benar-benar tercatat). */
export function statusSaatUsulanDibatalkan(statusSebelumnya: string | null | undefined): string {
  return statusSebelumnya && STATUS_AKTIF.has(statusSebelumnya) ? statusSebelumnya : 'DISETUJUI'
}

export type OpsiStatusSetelahJadwal = {
  orderStatus: string
  paymentProofStatus: string
  paymentReviewStatus?: string | null
}

/**
 * OD-01: pembayaran final lebih dulu menghasilkan SUDAH_DIBAYAR. Saat jadwal akhirnya
 * disetujui, status pesanan naik menjadi MENUNGGU_DIAMBIL. Status pembayaran tidak berubah.
 */
export function statusPesananSetelahJadwalDisetujui(
  args: OpsiStatusSetelahJadwal
): 'MENUNGGU_DIAMBIL' | null {
  if (!['SUDAH_DIBAYAR', 'MENUNGGU_DIAMBIL'].includes(args.orderStatus)) return null
  if (args.paymentProofStatus !== 'TERVERIFIKASI') return null
  if (args.paymentReviewStatus && args.paymentReviewStatus !== 'DISETUJUI') return null
  return 'MENUNGGU_DIAMBIL'
}

export type HasilUsulanJadwal = {
  pickupStatus: 'PERUBAHAN_MENUNGGU_PERSETUJUAN'
  pickupSundayDate: Date // Tanggal aktif sengaja tidak diubah sampai pihak lawan menyetujui.
  tanggalUsulan: Date
}

/** Usulan Admin maupun Customer hanya menunggu; tanggal aktif tetap berlaku (AC-PICK-001). */
export function ringkasanUsulan(
  tanggalAktif: Date,
  tanggalUsulan: Date
): HasilUsulanJadwal {
  return {
    pickupStatus: 'PERUBAHAN_MENUNGGU_PERSETUJUAN',
    pickupSundayDate: tanggalAktif,
    tanggalUsulan,
  }
}

export type OrderUntukGabung = {
  id: string
  customerId: string
  orderStatus: string
  pickupSundayDate: Date
  pickupGroupId: string | null
}

export type HasilGabung = {
  valid: boolean
  alasan: string | null
  pembaruan: Array<{
    id: string
    pickupSundayDate: Date
    pickupGroupId: string
    pickupStatus: string
  }>
}

/**
 * Gabungkan jadwal beberapa pesanan milik Customer yang sama.
 * Hanya field jadwal yang berubah: status pembayaran, nominal, dan riwayat tidak disentuh.
 */
export function validasiPenggabungan(
  orders: OrderUntukGabung[],
  customerId: string,
  tanggal: Date,
  groupId: string,
  sekarang: Date = new Date()
): HasilGabung {
  const gagal = (alasan: string): HasilGabung => ({ valid: false, alasan, pembaruan: [] })

  if (!Array.isArray(orders) || orders.length < 2) {
    return gagal('Pilih minimal dua pesanan untuk digabungkan')
  }
  if (new Set(orders.map((o) => o.id)).size !== orders.length) {
    return gagal('Daftar pesanan mengandung duplikat')
  }
  if (orders.some((o) => o.customerId !== customerId)) {
    return gagal('Semua pesanan harus milik Customer yang sama')
  }
  if (orders.some((o) => ['SELESAI', 'DIBATALKAN'].includes(o.orderStatus))) {
    return gagal('Hanya pesanan aktif yang dapat digabungkan')
  }
  if (!groupId || groupId.trim().length === 0) {
    return gagal('Identifier grup jadwal tidak valid')
  }

  const cek = validasiTanggalPengambilan(tanggal.toISOString(), sekarang)
  if (!cek.valid || !cek.tanggal) return gagal(cek.alasan || 'Tanggal gabungan tidak valid')

  return {
    valid: true,
    alasan: null,
    pembaruan: orders.map((o) => ({
      id: o.id,
      pickupSundayDate: cek.tanggal!,
      pickupGroupId: groupId,
      pickupStatus: 'MENUNGGU_KONFIRMASI',
    })),
  }
}

export type PenilaianNoShowArgs = {
  pickupStatus: string
  orderStatus: string
  stockSold: boolean
  pickupSundayDate: Date
  sekarang: Date
  sudahDicatat: boolean
}

export type HasilNoShow = {
  harus: boolean
  alasan: string | null
  batasTahan: Date | null
}

/** No-show hanya ditandai jika jadwal disetujui, lewat 09.00 WIB, dan belum selesai/dibatalkan. */
export function penilaianNoShow(args: PenilaianNoShowArgs): HasilNoShow {
  const tidak = (): HasilNoShow => ({ harus: false, alasan: null, batasTahan: null })
  if (args.sudahDicatat) return tidak()
  if (args.stockSold || ['SELESAI', 'DIBATALKAN'].includes(args.orderStatus)) return tidak()
  if (args.pickupStatus !== 'DISETUJUI') return tidak()
  if (!sudahLewatUntukNoShow(args.pickupSundayDate, args.sekarang)) return tidak()

  return {
    harus: true,
    alasan: ALASAN_NO_SHOW,
    batasTahan: new Date(
      args.sekarang.getTime() + TENGGAT_TAHAN_NO_SHOW_JAM * 60 * 60 * 1000
    ),
  }
}

export type OpsiPerpanjangTahan = {
  alasan: unknown
  tenggatBaru: unknown
  sekarang: Date
}

/** Perpanjangan penahanan buku tidak pernah memicu auto-cancel. */
export function validasiPerpanjangTahan(args: OpsiPerpanjangTahan): HasilValidasiJadwal {
  const cekAlasan = validasiAlasan(args.alasan)
  if (!cekAlasan.valid) return cekAlasan

  const tenggat = new Date(String(args.tenggatBaru || ''))
  if (Number.isNaN(tenggat.getTime())) {
    return { valid: false, alasan: 'Tenggat penahanan baru tidak valid', tanggal: null }
  }
  if (tenggat.getTime() <= args.sekarang.getTime()) {
    return { valid: false, alasan: 'Tenggat penahanan baru harus di masa depan', tanggal: null }
  }
  return { valid: true, alasan: null, tanggal: tenggat }
}

export type OpsiSelesai = {
  orderStatus: string
  paymentProofStatus: string
  stockSold: boolean
}

/** Tombol Selesai hanya aktif setelah serah fisik untuk pesanan yang pembayarannya terverifikasi. */
export function validasiSelesai(args: OpsiSelesai): HasilValidasiJadwal {
  if (['SELESAI', 'DIBATALKAN'].includes(args.orderStatus)) {
    return { valid: false, alasan: 'Pesanan sudah selesai atau dibatalkan', tanggal: null }
  }
  if (!['MENUNGGU_DIAMBIL', 'SUDAH_DIBAYAR'].includes(args.orderStatus)) {
    return {
      valid: false,
      alasan: 'Pesanan belum siap diserahkan (status harus Menunggu Diambil atau Sudah Dibayar)',
      tanggal: null,
    }
  }
  if (args.paymentProofStatus !== 'TERVERIFIKASI') {
    return { valid: false, alasan: 'Pembayaran belum terverifikasi', tanggal: null }
  }
  if (args.stockSold) {
    return { valid: false, alasan: 'Stok pesanan ini sudah dikurangi sebelumnya', tanggal: null }
  }
  return { valid: true, alasan: null, tanggal: null }
}

export type ItemPenyerahan = { bookId: string; quantity: number }
export type StokPenyerahan = Record<string, { stockTotal: number; stockReserved: number }>
export type HasilStokPenyerahan = {
  valid: boolean
  alasan: string | null
  judulTidakCukup: string[]
}

/**
 * Penyerahan fisik bersifat all-or-nothing: semua item harus layak dikurangi sebelum
 * satu pun penurunan stok dijalankan. Dipakai di dalam transaksi atomik (BR-001).
 */
export function validasiStokPenyerahan(
  items: ItemPenyerahan[],
  stok: StokPenyerahan,
  judul: Record<string, string> = {}
): HasilStokPenyerahan {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, alasan: 'Item pesanan tidak ditemukan', judulTidakCukup: [] }
  }
  const tidakCukup = items
    .filter((item) => {
      const s = stok[item.bookId]
      return (
        !s ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        s.stockReserved < item.quantity ||
        s.stockTotal < item.quantity
      )
    })
    .map((item) => judul[item.bookId] || item.bookId)

  if (tidakCukup.length > 0) {
    return {
      valid: false,
      alasan: `Stok buku tidak mencukupi untuk penyerahan fisik: ${tidakCukup.join(', ')}`,
      judulTidakCukup: tidakCukup,
    }
  }
  return { valid: true, alasan: null, judulTidakCukup: [] }
}

/** Daftar Minggu masa depan yang bisa dipilih di UI (sumber tunggal: src/lib/pesanan.ts). */
export function daftarTanggalMinggu(jumlah: number = 8, sekarang: Date = new Date()): string[] {
  return daftarMingguBerikutnya(jumlah, sekarang)
}
