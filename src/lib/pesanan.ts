// src/lib/pesanan.ts
// Logika murni Pembuatan Pesanan (Tahap 7) — tanpa akses database agar mudah diuji.
// Referensi: FR-ORD-002, BR-008 (idempotensi), BR-011 (snapshot), BR-013 (toko libur), BR-018 (Minggu).

import type { BukuUntukKeranjang, ItemKeranjang } from '@/lib/keranjang'

export const TENGGAT_PEMBAYARAN_JAM = 24

// ==========================================
// Toko Libur (BR-013)
// ==========================================
export type StatusToko = { isOpen: boolean } | null

export type HasilCekToko = {
  boleh: boolean
  alasan: string | null
}

/**
 * Checkout hanya boleh saat toko terbuka DAN statusnya berhasil diverifikasi.
 * Status null berarti belum ada catatan status -> dianggap terbuka (default sistem).
 */
export function cekTokoBuka(
  status: StatusToko,
  terverifikasi: boolean = true
): HasilCekToko {
  if (!terverifikasi) {
    return {
      boleh: false,
      alasan:
        'Status toko belum dapat diverifikasi. Checkout ditolak sementara; keranjang Anda tetap tersimpan.',
    }
  }

  if (status === null) {
    return { boleh: true, alasan: null }
  }

  if (!status.isOpen) {
    return {
      boleh: false,
      alasan:
        'Toko sedang libur sehingga checkout tidak dapat diproses. Keranjang Anda tetap tersimpan.',
    }
  }

  return { boleh: true, alasan: null }
}

// ==========================================
// Tanggal pengambilan (BR-018: hanya Minggu, tutup 09.00)
// ==========================================
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000

export type HasilValidasiTanggal = { valid: boolean; alasan: string | null }

export function validasiTanggalMinggu(
  tanggal: Date | string,
  sekarang: Date = new Date()
): HasilValidasiTanggal {
  const d = tanggal instanceof Date ? tanggal : new Date(tanggal)

  if (Number.isNaN(d.getTime())) {
    return { valid: false, alasan: 'Tanggal pengambilan tidak valid' }
  }

  if (d.getTime() <= sekarang.getTime()) {
    return { valid: false, alasan: 'Tanggal pengambilan harus di masa depan' }
  }

  // Hari dalam zona WIB (Asia/Jakarta = UTC+7)
  const hariWIB = new Date(d.getTime() + OFFSET_WIB_MS).getUTCDay()
  if (hariWIB !== 0) {
    return { valid: false, alasan: 'Pengambilan hanya tersedia pada hari Minggu' }
  }

  return { valid: true, alasan: null }
}

/** Daftar tanggal Minggu berikutnya (untuk pilihan di UI checkout). */
export function daftarMingguBerikutnya(
  jumlah: number = 8,
  sekarang: Date = new Date()
): string[] {
  const hasil: string[] = []
  // Mulai dari besok, cari hari Minggu dalam WIB
  const kursor = new Date(sekarang.getTime() + 24 * 60 * 60 * 1000)

  while (hasil.length < jumlah) {
    const hariWIB = new Date(kursor.getTime() + OFFSET_WIB_MS).getUTCDay()
    if (hariWIB === 0) {
      // Simpan sebagai tanggal WIB pukul 09.00 (jam tutup booth)
      const y = new Date(kursor.getTime() + OFFSET_WIB_MS)
      const iso = `${y.getUTCFullYear()}-${String(y.getUTCMonth() + 1).padStart(2, '0')}-${String(
        y.getUTCDate()
      ).padStart(2, '0')}`
      hasil.push(iso)
    }
    kursor.setUTCDate(kursor.getUTCDate() + 1)
  }

  return hasil
}

/** Ubah "YYYY-MM-DD" (tanggal WIB) menjadi Date pukul 09.00 WIB. */
export function tanggalMingguKeDate(tanggal: string): Date {
  // 09.00 WIB = 02.00 UTC
  return new Date(`${tanggal}T02:00:00.000Z`)
}

// ==========================================
// Tenggat pembayaran (BR-009)
// ==========================================
export function hitungTenggatPembayaran(
  dari: Date = new Date(),
  jam: number = TENGGAT_PEMBAYARAN_JAM
): Date {
  return new Date(dari.getTime() + jam * 60 * 60 * 1000)
}

// ==========================================
// Nomor pesanan
// ==========================================
export function buatNomorPesanan(
  dari: Date = new Date(),
  acak: () => number = Math.random
): string {
  const wib = new Date(dari.getTime() + OFFSET_WIB_MS)
  const tahun = wib.getUTCFullYear()
  const bulan = String(wib.getUTCMonth() + 1).padStart(2, '0')
  const hari = String(wib.getUTCDate()).padStart(2, '0')
  const urutan = Math.floor(acak() * 900000 + 100000)
  return `AKB-${tahun}${bulan}${hari}-${urutan}`
}

// ==========================================
// Idempotensi (BR-008)
// ==========================================
export type HasilIdempotensi = 'BARU' | 'GUNAKAN_PESANAN_LAMA' | 'KONFLIK_PENGGUNA'

export function validasiIdempotencyKey(key: unknown): boolean {
  return typeof key === 'string' && key.trim().length >= 8 && key.trim().length <= 128
}

export function cekIdempotensi(
  pesananLama: { customerId: string } | null | undefined,
  customerId: string
): HasilIdempotensi {
  if (!pesananLama) return 'BARU'
  return pesananLama.customerId === customerId
    ? 'GUNAKAN_PESANAN_LAMA'
    : 'KONFLIK_PENGGUNA'
}

// ==========================================
// Snapshot pesanan (BR-011)
// ==========================================
export type SnapshotItemPesanan = {
  bookId: string
  snapshotCode: string
  snapshotTitle: string
  snapshotSellingPrice: number
  snapshotCostPrice: number
  quantity: number
  subtotal: number
}

export type HasilSnapshotPesanan = {
  items: SnapshotItemPesanan[]
  total: number
}

/**
 * Bangun snapshot pesanan dari item keranjang + data buku saat transaksi.
 * Harga dan identitas buku dibekukan agar perubahan katalog tidak mengubah tagihan lama.
 */
export function hitungSnapshotPesanan(
  items: ItemKeranjang[],
  bukuMap: Record<string, BukuUntukKeranjang | null | undefined>
): HasilSnapshotPesanan {
  const snapshotItems: SnapshotItemPesanan[] = []

  for (const item of items) {
    const buku = bukuMap[item.bookId]
    if (!buku) continue

    const harga = buku.sellingPrice ?? 0
    const modal = (buku as BukuUntukKeranjang & { costPrice?: number }).costPrice ?? 0

    snapshotItems.push({
      bookId: buku.id,
      snapshotCode: buku.code ?? '',
      snapshotTitle: buku.title ?? '',
      snapshotSellingPrice: harga,
      snapshotCostPrice: modal,
      quantity: item.quantity,
      subtotal: harga * item.quantity,
    })
  }

  const total = snapshotItems.reduce((jumlah, item) => jumlah + item.subtotal, 0)
  return { items: snapshotItems, total }
}

// ==========================================
// Isolasi field modal (GR-03, BR-004)
// ==========================================
const FIELD_MODAL = new Set([
  'costPrice',
  'snapshotCostPrice',
  'oldCostPrice',
  'newCostPrice',
  'modalPerUnit',
  'modalAktual',
  'laba',
  'labaKotor',
  'margin',
  'marginLaba',
  'profit',
  'keuntungan',
])

function buangFieldModal(nilai: unknown): unknown {
  if (nilai instanceof Date) return nilai
  if (Array.isArray(nilai)) return nilai.map(buangFieldModal)
  if (nilai && typeof nilai === 'object') {
    const hasil: Record<string, unknown> = {}
    for (const [kunci, isi] of Object.entries(nilai as Record<string, unknown>)) {
      if (FIELD_MODAL.has(kunci)) continue
      hasil[kunci] = buangFieldModal(isi)
    }
    return hasil
  }
  return nilai
}

/** Hapus seluruh field modal/laba secara rekursif sebelum data dikirim ke Customer. */
export function saringFieldModal<T>(data: T): T {
  return buangFieldModal(data) as T
}

// ==========================================
// Label status (Bahasa Indonesia)
// ==========================================
const LABEL_STATUS_PESANAN: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: 'Menunggu Pembayaran',
  SUDAH_DIBAYAR: 'Sudah Dibayar',
  MENUNGGU_DIAMBIL: 'Menunggu Diambil',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
}

const LABEL_STATUS_JADWAL: Record<string, string> = {
  MENUNGGU_KONFIRMASI: 'Menunggu Konfirmasi',
  DISETUJUI: 'Disetujui',
  PERLU_TANGGAL_BARU: 'Perlu Tanggal Baru',
  PERUBAHAN_MENUNGGU_PERSETUJUAN: 'Perubahan Jadwal Menunggu Persetujuan',
  TIDAK_HADIR: 'Tidak Hadir (No-Show)',
}

const LABEL_STATUS_BUKTI: Record<string, string> = {
  BELUM_DIUNGGAH: 'Belum Diunggah',
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  PERLU_BUKTI_BARU: 'Perlu Bukti Baru',
  TERVERIFIKASI: 'Terverifikasi',
}

const LABEL_STATUS_REFUND: Record<string, string> = {
  TIDAK_BERLAKU: 'Tidak Berlaku',
  PERLU_DIPROSES: 'Perlu Diproses',
  DIKEMBALIKAN_SEBAGIAN: 'Dikembalikan Sebagian',
  SELESAI: 'Selesai Refund',
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan Admin Utama',
  DITOLAK: 'Ditolak',
}

export function labelStatusPesanan(status: string): string {
  return LABEL_STATUS_PESANAN[status] || status
}

export function labelStatusJadwal(status: string): string {
  return LABEL_STATUS_JADWAL[status] || status
}

export function labelStatusBukti(status: string): string {
  return LABEL_STATUS_BUKTI[status] || status
}

export function labelStatusRefund(status: string): string {
  return LABEL_STATUS_REFUND[status] || status
}
