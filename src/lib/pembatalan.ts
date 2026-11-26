// src/lib/pembatalan.ts
// Logika murni Pembatalan, Refund, dan Koreksi Selesai (Tahap 10) — tanpa akses database.
// Referensi: FR-CAN-001, FR-RFD-001, FR-DONE-001, BR-006, BR-007, BR-008, BR-020, BR-024.

export type PeranPembatal = 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA' | 'SYSTEM'

export type StatusRefund =
  | 'TIDAK_BERLAKU'
  | 'PERLU_DIPROSES'
  | 'DIKEMBALIKAN_SEBAGIAN'
  | 'SELESAI'

export const STATUS_REFUND: StatusRefund[] = [
  'TIDAK_BERLAKU',
  'PERLU_DIPROSES',
  'DIKEMBALIKAN_SEBAGIAN',
  'SELESAI',
]

export const METODE_REFUND = ['TRANSFER_BANK', 'TUNAI', 'QRIS', 'LAINNYA'] as const
export type MetodeRefund = (typeof METODE_REFUND)[number]

const PANJANG_ALASAN_MINIMAL = 3
const STATUS_SELESAI_ATAU_BATAL = new Set(['SELESAI', 'DIBATALKAN'])
const STATUS_SEBELUM_SELESAI_YANG_SAH = new Set(['MENUNGGU_DIAMBIL', 'SUDAH_DIBAYAR'])

function teks(alasan: unknown): string {
  return typeof alasan === 'string' ? alasan.trim() : ''
}

function alasanValid(alasan: unknown): boolean {
  return teks(alasan).length >= PANJANG_ALASAN_MINIMAL
}

export function validasiAlasanTeks(alasan: unknown): {
  valid: boolean
  alasan: string | null
} {
  if (alasanValid(alasan)) return { valid: true, alasan: null }
  return {
    valid: false,
    alasan: `Alasan wajib diisi minimal ${PANJANG_ALASAN_MINIMAL} karakter`,
  }
}

export type OrderUntukPembatalan = {
  orderStatus: string
  paymentProofStatus: string
  paidAt?: Date | string | null
  paymentReviewStatus?: string | null
}

/** Pembayaran final = lunas tercatat, bukti terverifikasi, atau keputusan final Admin Utama. */
export function sudahDisetujuiFinal(order: OrderUntukPembatalan): boolean {
  return (
    order.paidAt != null ||
    order.paymentProofStatus === 'TERVERIFIKASI' ||
    order.paymentReviewStatus === 'DISETUJUI'
  )
}

export type PenilaianPembatalanArgs = OrderUntukPembatalan & {
  peran: PeranPembatal
  alasan?: unknown
  alasanTambahan?: unknown
  jumlahAdminUtama?: number
}

export type HasilPembatalan = {
  boleh: boolean
  alasan: string | null
  statusRefundAwal: StatusRefund
  perluAlasanTambahan: boolean
}

/**
 * Aturan pembatalan per peran (FR-CAN-001, BR-020, BR-007).
 * Admin Biasa berhenti di sebelum persetujuan final; Admin Utama boleh melanjutkan
 * pembatalan pesanan lunas. Karena sistem hanya memiliki 1 Admin Utama (BR-005),
 * pembatalan lunas oleh Admin Utama itu sendiri memerlukan alasan tambahan.
 */
export function penilaianPembatalan(args: PenilaianPembatalanArgs): HasilPembatalan {
  const tolak = (alasan: string): HasilPembatalan => ({
    boleh: false,
    alasan,
    statusRefundAwal: 'TIDAK_BERLAKU',
    perluAlasanTambahan: false,
  })

  if (STATUS_SELESAI_ATAU_BATAL.has(args.orderStatus)) {
    return tolak('Pesanan sudah selesai atau dibatalkan. Pembatalan bersifat final.')
  }

  const lunas = sudahDisetujuiFinal(args)

  if (args.peran === 'CUSTOMER') {
    if (lunas) {
      return tolak(
        'Pembayaran sudah disetujui final. Customer tidak dapat membatalkan sendiri; hubungi admin.'
      )
    }
    return {
      boleh: true,
      alasan: null,
      statusRefundAwal: 'TIDAK_BERLAKU',
      perluAlasanTambahan: false,
    }
  }

  if (args.peran === 'SYSTEM') {
    if (lunas) return tolak('Sistem tidak membatalkan pesanan yang sudah lunas')
    if (!alasanValid(args.alasan)) return tolak('Alasan pembatalan sistem wajib diisi')
    return {
      boleh: true,
      alasan: null,
      statusRefundAwal: 'TIDAK_BERLAKU',
      perluAlasanTambahan: false,
    }
  }

  if (args.peran !== 'ADMIN_BIASA' && args.peran !== 'ADMIN_UTAMA') {
    return tolak('Peran tidak memiliki hak untuk membatalkan pesanan')
  }

  const cekAlasan = validasiAlasanTeks(args.alasan)
  if (!cekAlasan.valid) return tolak(cekAlasan.alasan || 'Alasan pembatalan wajib diisi')

  if (args.peran === 'ADMIN_BIASA') {
    if (lunas) {
      return tolak('Hanya Admin Utama yang dapat membatalkan pesanan yang sudah lunas')
    }
    return {
      boleh: true,
      alasan: null,
      statusRefundAwal: 'TIDAK_BERLAKU',
      perluAlasanTambahan: false,
    }
  }

  const jumlahAdminUtama =
    typeof args.jumlahAdminUtama === 'number' ? args.jumlahAdminUtama : 1
  const perluAlasanTambahan = lunas && jumlahAdminUtama === 1
  if (perluAlasanTambahan && !alasanValid(args.alasanTambahan)) {
    return tolak(
      'Admin Utama tunggal yang membatalkan pesanan lunas wajib mengisi alasan tambahan'
    )
  }

  return {
    boleh: true,
    alasan: null,
    statusRefundAwal: lunas ? 'PERLU_DIPROSES' : 'TIDAK_BERLAKU',
    perluAlasanTambahan,
  }
}

// ==========================================
// Pelepasan stok tertahan: tepat 1x (BR-008, BR-010)
// ==========================================
export type BukuUntukRilis = {
  id: string
  status: string
  stockReserved: number
}

export type HasilRilisStok = {
  boleh: boolean
  alasan: string | null
  urutanBookId: string[]
  rilis: Array<{ bookId: string; quantity: number }>
  dilewati: Array<{ bookId: string; alasan: string }>
}

export function bukuMasihAktif(status: string): boolean {
  return status !== 'NONAKTIF'
}

/**
 * Rencana pelepasan stok dalam satu transaksi. Buku nonaktif dilewati (tidak menerima stok),
 * namun semua buku aktif diverifikasi lebih dulu agar tidak ada penurunan parsial.
 * Flag stockReleased yang sudah true menolak pelepasan kedua (anti-duplikat).
 */
export function rencanaRilisStok(args: {
  items: Array<{ bookId: string; quantity: number }>
  buku: Record<string, BukuUntukRilis>
  stockReleased: boolean
}): HasilRilisStok {
  const kosong: HasilRilisStok = {
    boleh: false,
    alasan: null,
    urutanBookId: [],
    rilis: [],
    dilewati: [],
  }
  if (args.stockReleased) {
    return { ...kosong, alasan: 'Stok pesanan ini sudah dilepaskan sebelumnya' }
  }
  if (!Array.isArray(args.items) || args.items.length === 0) {
    return { ...kosong, alasan: 'Item pesanan tidak ditemukan' }
  }

  const jumlahPerBuku = new Map<string, number>()
  for (const item of args.items) {
    const bookId = String(item.bookId || '')
    const quantity = Number(item.quantity)
    if (!bookId || !Number.isFinite(quantity) || quantity <= 0) {
      return { ...kosong, alasan: 'Kuantitas item pesanan tidak valid' }
    }
    jumlahPerBuku.set(bookId, (jumlahPerBuku.get(bookId) || 0) + quantity)
  }

  const urutanBookId = [...jumlahPerBuku.keys()].sort()
  const rilis: HasilRilisStok['rilis'] = []
  const dilewati: HasilRilisStok['dilewati'] = []

  for (const bookId of urutanBookId) {
    const buku = args.buku[bookId]
    const quantity = jumlahPerBuku.get(bookId) || 0
    if (!buku) {
      dilewati.push({ bookId, alasan: 'Buku tidak ditemukan' })
      continue
    }
    if (!bukuMasihAktif(buku.status)) {
      dilewati.push({ bookId, alasan: 'Buku tidak aktif sehingga stok tidak dikembalikan' })
      continue
    }
    if (!Number.isFinite(buku.stockReserved) || buku.stockReserved < quantity) {
      return {
        ...kosong,
        urutanBookId,
        alasan: `Stok tertahan buku ${buku.id} tidak mencukupi untuk dikembalikan`,
      }
    }
    rilis.push({ bookId, quantity })
  }

  return {
    boleh: true,
    alasan: null,
    urutanBookId,
    rilis,
    dilewati,
  }
}

// ==========================================
// Modul refund terpisah (BR-006, BR-020, FR-RFD-001)
// ==========================================
export type RingkasanRefund = {
  nominalDibayar: number
  totalDisetujui: number
  totalMenunggu: number
  sisa: number
  status: StatusRefund
}

export function statusRefundBerdasarkanNominal(args: {
  nominalDibayar: number
  totalDisetujui: number
  totalMenunggu?: number
}): StatusRefund {
  const dibayar = Math.max(0, Number(args.nominalDibayar) || 0)
  const disetujui = Math.max(0, Number(args.totalDisetujui) || 0)
  if (dibayar <= 0) return 'TIDAK_BERLAKU'
  if (disetujui >= dibayar) return 'SELESAI'
  if (disetujui > 0) return 'DIKEMBALIKAN_SEBAGIAN'
  return 'PERLU_DIPROSES'
}

export function ringkasanRefund(args: {
  nominalDibayar: number
  totalDisetujui: number
  totalMenunggu?: number
}): RingkasanRefund {
  const nominalDibayar = Math.max(0, Number(args.nominalDibayar) || 0)
  const totalDisetujui = Math.max(0, Number(args.totalDisetujui) || 0)
  const totalMenunggu = Math.max(0, Number(args.totalMenunggu) || 0)
  return {
    nominalDibayar,
    totalDisetujui,
    totalMenunggu,
    sisa: Math.max(0, nominalDibayar - totalDisetujui - totalMenunggu),
    status: statusRefundBerdasarkanNominal({
      nominalDibayar,
      totalDisetujui,
      totalMenunggu,
    }),
  }
}

export function validasiMetodeRefund(metode: unknown): {
  valid: boolean
  alasan: string | null
  metode: MetodeRefund | null
} {
  const nilai = teks(metode).toUpperCase()
  if ((METODE_REFUND as readonly string[]).includes(nilai)) {
    return { valid: true, alasan: null, metode: nilai as MetodeRefund }
  }
  return {
    valid: false,
    alasan: 'Metode refund wajib diisi: TRANSFER_BANK, TUNAI, QRIS, atau LAINNYA',
    metode: null,
  }
}

/** Nominal baru tidak boleh membuat total refund (disetujui + menunggu) melebihi pembayaran. */
export function validasiNominalRefund(args: {
  nominalDibayar: number
  totalDisetujui: number
  totalMenunggu?: number
  nominalBaru: number
}): { valid: boolean; alasan: string | null; sisa: number } {
  const ringkasan = ringkasanRefund({
    nominalDibayar: args.nominalDibayar,
    totalDisetujui: args.totalDisetujui,
    totalMenunggu: args.totalMenunggu || 0,
  })
  const nominal = Number(args.nominalBaru)
  if (!Number.isFinite(nominal) || !Number.isInteger(nominal) || nominal <= 0) {
    return { valid: false, alasan: 'Nominal refund harus bilangan bulat positif', sisa: ringkasan.sisa }
  }
  if (ringkasan.nominalDibayar <= 0) {
    return { valid: false, alasan: 'Tidak ada dana pembayaran yang dapat dikembalikan', sisa: 0 }
  }
  if (nominal > ringkasan.sisa) {
    return {
      valid: false,
      alasan: `Nominal refund melebihi sisa dana yang dapat dikembalikan (${ringkasan.sisa})`,
      sisa: ringkasan.sisa,
    }
  }
  return { valid: true, alasan: null, sisa: ringkasan.sisa }
}

// ==========================================
// Koreksi pesanan Selesai (FR-DONE-001)
// ==========================================
export type RiwayatStatusOrder = {
  domain: string
  oldStatus: string
  newStatus: string
  reason?: string | null
  createdAt: Date | string
}

function waktu(riwayat: RiwayatStatusOrder): number {
  const nilai = riwayat.createdAt instanceof Date ? riwayat.createdAt.getTime() : new Date(riwayat.createdAt).getTime()
  return Number.isFinite(nilai) ? nilai : 0
}

/** Ambil status sebelum transisi ke SELESAI dari riwayat yang benar-benar tercatat. */
export function statusSebelumSelesai(riwayat: RiwayatStatusOrder[]): string | null {
  const kandidat = (Array.isArray(riwayat) ? riwayat : [])
    .filter((item) => item.domain === 'ORDER' && item.newStatus === 'SELESAI')
    .sort((a, b) => waktu(b) - waktu(a))[0]
  if (!kandidat) return null
  return STATUS_SEBELUM_SELESAI_YANG_SAH.has(kandidat.oldStatus) ? kandidat.oldStatus : null
}

export type PenilaianKoreksiSelesaiArgs = {
  peran: PeranPembatal
  orderStatus: string
  stockSold: boolean
  alasan: unknown
  statusSebelumnya: string | null
}

export type HasilKoreksiSelesai = {
  valid: boolean
  alasan: string | null
  statusTujuan: string | null
}

export function validasiKoreksiSelesai(
  args: PenilaianKoreksiSelesaiArgs
): HasilKoreksiSelesai {
  const tolak = (alasan: string): HasilKoreksiSelesai => ({
    valid: false,
    alasan,
    statusTujuan: null,
  })
  if (args.peran !== 'ADMIN_UTAMA') {
    return tolak('Hanya Admin Utama yang dapat mengoreksi pesanan Selesai')
  }
  if (args.orderStatus !== 'SELESAI') {
    return tolak('Hanya pesanan berstatus Selesai yang dapat dikoreksi')
  }
  if (!args.stockSold) {
    return tolak('Stok pesanan ini sudah dikembalikan atau tidak pernah dikurangi saat Selesai')
  }
  const cekAlasan = validasiAlasanTeks(args.alasan)
  if (!cekAlasan.valid) return tolak(cekAlasan.alasan || 'Alasan koreksi wajib diisi')
  if (!args.statusSebelumnya || !STATUS_SEBELUM_SELESAI_YANG_SAH.has(args.statusSebelumnya)) {
    return tolak('Status sebelumnya tidak ditemukan di riwayat sehingga koreksi ditolak')
  }
  return { valid: true, alasan: null, statusTujuan: args.statusSebelumnya }
}

export type ItemKoreksi = { bookId: string; quantity: number }

/** Validasi all-or-nothing sebelum stockTotal & stockReserved dikembalikan dalam transaksi. */
export function validasiStokKoreksi(
  items: ItemKoreksi[],
  buku: Record<string, { id: string; status: string }>
): { valid: boolean; alasan: string | null; urutanBookId: string[] } {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, alasan: 'Item pesanan tidak ditemukan', urutanBookId: [] }
  }
  const jumlahPerBuku = new Map<string, number>()
  for (const item of items) {
    const bookId = String(item.bookId || '')
    const quantity = Number(item.quantity)
    if (!bookId || !Number.isFinite(quantity) || quantity <= 0) {
      return { valid: false, alasan: 'Kuantitas item pesanan tidak valid', urutanBookId: [] }
    }
    jumlahPerBuku.set(bookId, (jumlahPerBuku.get(bookId) || 0) + quantity)
  }
  const urutanBookId = [...jumlahPerBuku.keys()].sort()
  for (const bookId of urutanBookId) {
    if (!buku[bookId]) {
      return { valid: false, alasan: `Buku tidak ditemukan: ${bookId}`, urutanBookId }
    }
  }
  return { valid: true, alasan: null, urutanBookId }
}
