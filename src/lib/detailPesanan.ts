// src/lib/detailPesanan.ts
// Helper murni untuk ringkasan dan pengajuan pada detail pesanan Customer.
// 100% Bahasa Indonesia, tanpa akses database dan tanpa field modal/laba (GR-03).

export const TEKS_BATAS_PENGAMBILAN =
  'Batas waktu pengambilan ditutup pukul 09.00 WIB (tanpa pilihan jam tertentu).'

type RingkasanUsulan = {
  jenis?: string | null
  status?: string | null
}

type PengajuanTenggat = {
  status?: string | null
}

/** Baris refund hanya tampil jika ada proses/riwayat refund yang benar-benar tercatat. */
export function statusRefundBerlaku(status: string | null | undefined): boolean {
  return Boolean(status && status !== 'TIDAK_BERLAKU')
}

/** Kunci form jadwal saat pengajuan Customer masih menunggu keputusan admin. */
export function jadwalMenungguKonfirmasi(args: {
  pickupStatus: string | null | undefined
  usulanTertunda?: RingkasanUsulan | null
}): boolean {
  const status = args.pickupStatus || ''
  if (status === 'MENUNGGU_KONFIRMASI') return true

  const usulan = args.usulanTertunda
  if (usulan?.status === 'MENUNGGU_PERSETUJUAN') {
    // Usulan admin tetap perlu tanggapan Customer, tetapi form ubah jadwal ditutup.
    return usulan.jenis !== 'USULAN_ADMIN'
  }

  // Status menunggu tanpa baris pengajuan aktif tidak boleh membuka form duplikat.
  return status === 'PERUBAHAN_MENUNGGU_PERSETUJUAN'
}

export function metodeMenungguKonfirmasi(status: string | null | undefined): boolean {
  return status === 'MENUNGGU_PERSETUJUAN'
}

export function tenggatMenungguKonfirmasi(
  perpanjangan: PengajuanTenggat[] | null | undefined
): boolean {
  return (perpanjangan || []).some((item) => item.status === 'MENUNGGU_PERSETUJUAN')
}

/** Redaksi ringkas: tanggal Minggu tidak lagi terlihat seperti jam buka booth. */
export function formatPengambilanRingkas(
  tanggal: string,
  formatTanggal: (nilai: string) => string
): string {
  return `${formatTanggal(tanggal)} (ditutup pukul 09.00 WIB)`
}
