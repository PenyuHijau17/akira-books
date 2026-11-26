// src/lib/pengingat.ts
// Logika murni pengingat persisten Tahap 12 (BR-025, FR-DUE-001, FR-PICK-001, NFR-06).
// Penjadwalan memakai batas 2 jam WIB dan langkah derivable dari waktu dibuat, sehingga
// tetap berlanjut setelah server/container di-restart tanpa mengirim ganda.

export type JenisPengingat = 'PENGINGAT_BUKTI' | 'PENGINGAT_PUTUSAN' | 'PENGINGAT_JADWAL'

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const INTERVAL_DEFAULT_MENIT = 120

export function jenisPengingatValid(nilai: string): nilai is JenisPengingat {
  return ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN', 'PENGINGAT_JADWAL'].includes(nilai)
}

/** Batas berikutnya pada jam genap WIB (00, 02, ..., 22) setelah `sekarang`. */
export function jadwalPengingatBerikutnya(
  sekarang: Date,
  intervalMenit: number = INTERVAL_DEFAULT_MENIT
): Date {
  const langkahMs = Math.max(1, Math.floor(intervalMenit)) * 60 * 1000
  const waktuWIB = sekarang.getTime() + WIB_OFFSET_MS
  const berikutWIB = Math.ceil((waktuWIB + 1) / langkahMs) * langkahMs
  return new Date(berikutWIB - WIB_OFFSET_MS)
}

/**
 * Langkah pengingat dihitung dari waktu pembuatan antrean, bukan dari memori proses.
 * Restart tidak mengulang dari langkah 1.
 */
export function langkahPengingat(
  dibuatPada: Date,
  sekarang: Date,
  intervalMenit: number = INTERVAL_DEFAULT_MENIT
): number {
  const langkahMs = Math.max(1, Math.floor(intervalMenit)) * 60 * 1000
  const selisih = Math.max(0, sekarang.getTime() - dibuatPada.getTime())
  return Math.max(1, Math.floor(selisih / langkahMs) + 1)
}

/** Kunci pengiriman unik per pesanan/jenis/langkah (anti-duplikasi BR-008). */
export function kunciPengingat(orderId: string, type: JenisPengingat, langkah: number): string {
  return `pengingat:${type}:${orderId}:${langkah}`
}

export function pesanPengingat(type: JenisPengingat, nomorPesanan: string): string {
  if (type === 'PENGINGAT_BUKTI') {
    return `Pengingat: bukti pembayaran pesanan ${nomorPesanan} belum diperiksa.`
  }
  if (type === 'PENGINGAT_PUTUSAN') {
    return `Pengingat: putusan final pembayaran pesanan ${nomorPesanan} belum diambil.`
  }
  return `Pengingat: jadwal pesanan ${nomorPesanan} masih menunggu keputusan.`
}

export type PenilaianPengingat = {
  masihPerlu: boolean
  harusBerhenti: boolean
  alasan: string
}

/** Hentikan pengingat segera setelah keputusan dibuat (BR-025). */
export function penilaianPengingat(args: {
  type: JenisPengingat
  orderStatus?: string | null
  paymentProofStatus?: string | null
  paymentReviewStatus?: string | null
  pickupStatus?: string | null
  cancelledAt?: Date | string | null
  completedAt?: Date | string | null
  isResolved?: boolean
}): PenilaianPengingat {
  const berhenti = (alasan: string): PenilaianPengingat => ({
    masihPerlu: false,
    harusBerhenti: true,
    alasan,
  })

  if (args.isResolved) return berhenti('Pengingat sudah diselesaikan')
  if (args.cancelledAt || args.orderStatus === 'DIBATALKAN') {
    return berhenti('Pesanan dibatalkan')
  }
  if (args.completedAt || args.orderStatus === 'SELESAI') {
    return berhenti('Pesanan selesai')
  }

  if (args.type === 'PENGINGAT_BUKTI') {
    if (args.paymentProofStatus !== 'MENUNGGU_VERIFIKASI') {
      return berhenti('Bukti pembayaran sudah diputuskan')
    }
  } else if (args.type === 'PENGINGAT_PUTUSAN') {
    if (args.paymentReviewStatus !== 'MENUNGGU_PUTUSAN_UTAMA') {
      return berhenti('Putusan final sudah diambil')
    }
  } else if (!['MENUNGGU_KONFIRMASI', 'PERUBAHAN_MENUNGGU_PERSETUJUAN'].includes(String(args.pickupStatus || ''))) {
    return berhenti('Jadwal pengambilan sudah diputuskan')
  }

  return { masihPerlu: true, harusBerhenti: false, alasan: 'Masih menunggu keputusan' }
}
