// src/lib/pembayaran.ts
// Logika murni Tahap 8 — Pembayaran QRIS, verifikasi 2 tahap, tenggat, jeda timer,
// multi-order, auto-cancel, dan isolasi data. Tanpa akses database agar mudah diuji.
// Referensi: BR-014 s.d. BR-017, BR-024, BR-025, FR-PAY-001..004, FR-DUE-001, OD-01, OD-03.

export const UKURAN_MAKSIMAL_FILE = 5 * 1024 * 1024 // 5 MB (OD-04)
export const TIPE_GAMBAR_DISETUJUI = ['image/jpeg', 'image/png', 'image/webp'] as const
export const EKSTENSI_DISETUJUI = ['jpg', 'jpeg', 'png', 'webp'] as const
export const TENGGAT_DEFAULT_JAM = 24
export const JEDA_PENGINGAT_JAM = 2

export type HasilValidasi = {
  valid: boolean
  alasan: string | null
}

export type BerkasUnggahan = {
  name?: string
  type?: string
  size?: number
}

function teks(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function keDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const hasil = value instanceof Date ? value : new Date(value)
  return Number.isNaN(hasil.getTime()) ? null : hasil
}

// ==========================================
// Validasi berkas (OD-04: JPG/PNG/WebP maks. 5MB)
// ==========================================
export function validasiFileGambar(file: BerkasUnggahan | null | undefined): HasilValidasi {
  if (!file) return { valid: false, alasan: 'Berkas gambar wajib diunggah' }

  const tipe = teks(file.type).toLowerCase()
  if (!(TIPE_GAMBAR_DISETUJUI as readonly string[]).includes(tipe)) {
    return { valid: false, alasan: 'Format gambar harus JPG, PNG, atau WebP' }
  }

  const nama = teks(file.name).toLowerCase()
  const ekstensi = nama.includes('.') ? nama.split('.').pop() || '' : ''
  const cocokEkstensi =
    tipe === 'image/png'
      ? ekstensi === 'png'
      : tipe === 'image/webp'
        ? ekstensi === 'webp'
        : ekstensi === 'jpg' || ekstensi === 'jpeg'
  if (!cocokEkstensi) {
    return { valid: false, alasan: 'Ekstensi berkas tidak sesuai dengan jenis gambarnya' }
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    return { valid: false, alasan: 'Berkas gambar tidak boleh kosong' }
  }
  if (file.size > UKURAN_MAKSIMAL_FILE) {
    return { valid: false, alasan: 'Ukuran gambar maksimal 5 MB' }
  }

  return { valid: true, alasan: null }
}

/** Cek tanda tangan biner agar berkas tidak sekadar mengganti ekstensi. */
export function validasiTandaTanganGambar(
  byteArray: Uint8Array,
  tipe: string
): HasilValidasi {
  const b = byteArray
  const dimulai = (...tanda: number[]) =>
    tanda.every((nilai, indeks) => b[indeks] === nilai)

  if (tipe === 'image/png') {
    return dimulai(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
      ? { valid: true, alasan: null }
      : { valid: false, alasan: 'Isi berkas bukan gambar PNG yang sah' }
  }
  if (tipe === 'image/jpeg') {
    return dimulai(0xff, 0xd8, 0xff)
      ? { valid: true, alasan: null }
      : { valid: false, alasan: 'Isi berkas bukan gambar JPEG yang sah' }
  }
  if (tipe === 'image/webp') {
    return dimulai(0x52, 0x49, 0x46, 0x46) &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      ? { valid: true, alasan: null }
      : { valid: false, alasan: 'Isi berkas bukan gambar WebP yang sah' }
  }
  return { valid: false, alasan: 'Jenis gambar tidak dikenali' }
}

// ==========================================
// Tindakan sensitif: konfirmasi + kata sandi + OTP (FR-PAY-001)
// ==========================================
export function validasiKonfirmasiSensitif(input: {
  konfirmasi?: string
  password?: string
  otp?: string
}): HasilValidasi {
  if (teks(input.konfirmasi).toUpperCase() !== 'YA') {
    return { valid: false, alasan: 'Konfirmasi tertulis wajib diisi dengan "YA"' }
  }
  if (!teks(input.password)) {
    return { valid: false, alasan: 'Kata sandi wajib diisi ulang' }
  }
  if (!/^\d{6}$/.test(teks(input.otp))) {
    return { valid: false, alasan: 'OTP 6 digit wajib diisi' }
  }
  return { valid: true, alasan: null }
}

export function pesanPeringatanQris(jumlahPesananAktif: number): string | null {
  if (jumlahPesananAktif <= 0) return null
  return (
    `Ada ${jumlahPesananAktif} pesanan dengan status Menunggu Pembayaran yang ` +
    'mungkin sudah menggunakan QRIS lama. Setelah diganti, pelanggan akan mendapat notifikasi.'
  )
}

// ==========================================
// Tenggat, jeda timer, dan pengingat (BR-009, BR-016, BR-025)
// ==========================================
type WaktuTimer = {
  paymentDeadline: Date | string
  sekarang?: Date | string
  pausedRemainingSeconds?: number | null
  pausedAt?: Date | string | null
}

export function hitungSisaDetik(args: WaktuTimer): number {
  const sekarang = keDate(args.sekarang) ?? new Date()
  const deadline = keDate(args.paymentDeadline)
  if (!deadline) return 0

  if (args.pausedAt && typeof args.pausedRemainingSeconds === 'number') {
    return Math.max(0, Math.floor(args.pausedRemainingSeconds))
  }
  return Math.max(0, Math.floor((deadline.getTime() - sekarang.getTime()) / 1000))
}

/** Jeda hanya terjadi pada pengajuan ubah metode pembayaran yang masih menunggu keputusan. */
export function jedaTimer(args: WaktuTimer): {
  pausedRemainingSeconds: number
  pausedAt: Date
} {
  const sekarang = keDate(args.sekarang) ?? new Date()
  if (args.pausedAt && typeof args.pausedRemainingSeconds === 'number') {
    return {
      pausedRemainingSeconds: Math.max(0, Math.floor(args.pausedRemainingSeconds)),
      pausedAt: keDate(args.pausedAt) ?? sekarang,
    }
  }
  return {
    pausedRemainingSeconds: hitungSisaDetik({ ...args, sekarang }),
    pausedAt: sekarang,
  }
}

/** Lanjutkan dari sisa waktu. Dipakai saat pengajuan ubah metode ditolak/dibatalkan. */
export function lanjutkanTimer(args: WaktuTimer): {
  paymentDeadline: Date
  pausedRemainingSeconds: null
  pausedAt: null
} {
  const sekarang = keDate(args.sekarang) ?? new Date()
  const sisa = hitungSisaDetik({ ...args, sekarang })
  return {
    paymentDeadline: new Date(sekarang.getTime() + sisa * 1000),
    pausedRemainingSeconds: null,
    pausedAt: null,
  }
}

/** Perpanjangan tenggat tidak menjeda timer: dihitung dari tenggat lama, bukan dari sekarang. */
export function hitungTenggatPerpanjangan(
  paymentDeadline: Date | string,
  jamTambahan: number,
  sekarang: Date | string = new Date()
): Date {
  const deadline = keDate(paymentDeadline) ?? keDate(sekarang)!
  const sekarangDate = keDate(sekarang)!
  const dasar = deadline.getTime() > sekarangDate.getTime() ? deadline : sekarangDate
  return new Date(dasar.getTime() + Math.max(0, jamTambahan) * 60 * 60 * 1000)
}

// ==========================================
// Bukti tepat waktu & race condition upload vs auto-cancel (BR-015)
// ==========================================
export function buktiTepatWaktu(
  uploadedAt: Date | string | null | undefined,
  paymentDeadline: Date | string
): boolean {
  const unggah = keDate(uploadedAt)
  const deadline = keDate(paymentDeadline)
  if (!unggah || !deadline) return false
  return unggah.getTime() <= deadline.getTime()
}

type PenilaianAutoCancel = {
  orderStatus: string
  paymentDeadline: Date | string
  sekarang?: Date | string
  uploadedAt?: Date | string | null
  pausedAt?: Date | string | null
  pausedRemainingSeconds?: number | null
  stockReleased?: boolean
  autoCancelled?: boolean
}

/**
 * Auto-cancel hanya boleh saat: pesanan masih menunggu bayar, timer tidak dijeda,
 * tenggat sudah lewat, belum ada bukti sah yang masuk sebelum tenggat, dan stok
 * belum dilepas. Keputusan murni ini dipakai worker + divalidasi ulang dalam transaksi.
 */
export function bolehAutoCancel(args: PenilaianAutoCancel): boolean {
  if (args.stockReleased || args.autoCancelled) return false
  if (args.orderStatus !== 'MENUNGGU_PEMBAYARAN') return false
  if (args.pausedAt && typeof args.pausedRemainingSeconds === 'number') return false
  if (buktiTepatWaktu(args.uploadedAt, args.paymentDeadline)) return false

  const deadline = keDate(args.paymentDeadline)
  const sekarang = keDate(args.sekarang) ?? new Date()
  if (!deadline) return false
  return deadline.getTime() <= sekarang.getTime()
}

// ==========================================
// Multi-order QRIS (OD-03)
// ==========================================
export function validasiAlokasiMultiOrder(args: {
  orders: Array<{ id: string; totalAmount: number }>
  totalTransfer: number
}): {
  valid: boolean
  alasan: string | null
  alokasi: Array<{ orderId: string; allocatedAmount: number }>
} {
  const alokasi: Array<{ orderId: string; allocatedAmount: number }> = []
  if (!Array.isArray(args.orders) || args.orders.length === 0) {
    return { valid: false, alasan: 'Pilih minimal satu pesanan', alokasi }
  }
  if (!Number.isFinite(args.totalTransfer) || args.totalTransfer <= 0) {
    return { valid: false, alasan: 'Nominal transfer harus lebih dari nol', alokasi }
  }

  const dilihat = new Set<string>()
  let jumlah = 0
  for (const order of args.orders) {
    if (!teks(order.id)) {
      return { valid: false, alasan: 'Ada pesanan tanpa identitas', alokasi: [] }
    }
    if (dilihat.has(order.id)) {
      return { valid: false, alasan: 'Pesanan tidak boleh dihitung dua kali', alokasi: [] }
    }
    dilihat.add(order.id)
    if (!Number.isFinite(order.totalAmount) || order.totalAmount <= 0) {
      return { valid: false, alasan: 'Nominal pesanan tidak valid', alokasi: [] }
    }
    jumlah += order.totalAmount
    alokasi.push({ orderId: order.id, allocatedAmount: order.totalAmount })
  }

  if (jumlah !== args.totalTransfer) {
    return {
      valid: false,
      alasan: `Total transfer belum sesuai. Total pesanan ${jumlah}, nominal transfer ${args.totalTransfer}`,
      alokasi: [],
    }
  }
  return { valid: true, alasan: null, alokasi }
}

// ==========================================
// State machine verifikasi 2 tahap (BR-014, FR-PAY-003)
// ==========================================
export type StateVerifikasi = {
  orderStatus: string
  paymentProofStatus: string
  paymentReviewStatus: string
  paymentReviewerId: string | null
  paymentRejectedCount: number
}

export type HasilVerifikasi = {
  boleh: boolean
  alasan: string | null
  state: StateVerifikasi
  statusBuktiAkhir: string
}

type Aktor = { id: string; role: string }

function salin(state: StateVerifikasi): StateVerifikasi {
  return { ...state }
}

function gagal(state: StateVerifikasi, alasan: string): HasilVerifikasi {
  return { boleh: false, alasan, state: salin(state), statusBuktiAkhir: state.paymentProofStatus }
}

/** Tahap 1 — Admin Biasa meneruskan atau menolak dengan alasan. */
export function ajukanPemeriksaanAwal(
  state: StateVerifikasi,
  actor: Aktor,
  keputusan: 'DITERUSKAN' | 'DITOLAK',
  alasan?: string
): HasilVerifikasi {
  if (actor.role !== 'ADMIN_BIASA') {
    return gagal(state, 'Hanya Admin Biasa yang dapat melakukan pemeriksaan awal')
  }
  const kembaliKePemeriksa = state.paymentReviewStatus === 'DIKEMBALIKAN_KE_PEMERIKSA'
  if (
    state.paymentReviewStatus !== 'BELUM_DIPERIKSA' &&
    !kembaliKePemeriksa
  ) {
    return gagal(state, 'Bukti ini tidak sedang menunggu pemeriksaan awal')
  }
  if (kembaliKePemeriksa && state.paymentReviewerId !== actor.id) {
    return gagal(state, 'Bukti dikembalikan ke pemeriksa awal yang sama')
  }

  const baru = salin(state)
  baru.paymentReviewerId = actor.id

  if (keputusan === 'DITERUSKAN') {
    baru.paymentReviewStatus = 'MENUNGGU_PUTUSAN_UTAMA'
    baru.paymentProofStatus = 'MENUNGGU_VERIFIKASI'
    return {
      boleh: true,
      alasan: null,
      state: baru,
      statusBuktiAkhir: 'MENUNGGU_VERIFIKASI',
    }
  }

  if (!teks(alasan)) {
    return gagal(state, 'Penolakan pemeriksaan awal wajib disertai alasan')
  }
  baru.paymentReviewStatus = 'BELUM_DIPERIKSA'
  baru.paymentReviewerId = null
  baru.paymentProofStatus = 'PERLU_BUKTI_BARU'
  return {
    boleh: true,
    alasan: null,
    state: baru,
    statusBuktiAkhir: 'PERLU_BUKTI_BARU',
  }
}

/** Status pesanan mengikuti OD-01: jadwal disetujui dulu → Menunggu Diambil. */
export function statusPesananSetelahLunas(
  pickupStatus: string
): 'SUDAH_DIBAYAR' | 'MENUNGGU_DIAMBIL' {
  return pickupStatus === 'DISETUJUI' ? 'MENUNGGU_DIAMBIL' : 'SUDAH_DIBAYAR'
}

/**
 * Tahap 2 — Hanya Admin Utama. Tolak ke-1 kembali ke pemeriksa awal yang sama;
 * tolak ke-2 langsung diambil alih Admin Utama. Tidak ada persetujuan otomatis.
 */
export function putuskanFinal(
  state: StateVerifikasi,
  actor: Aktor,
  keputusan: 'DISETUJUI' | 'DITOLAK',
  alasan: string | undefined,
  pickupStatus: string
): HasilVerifikasi {
  if (actor.role !== 'ADMIN_UTAMA') {
    return gagal(state, 'Hanya Admin Utama yang dapat memutuskan pembayaran akhir')
  }
  if (
    state.paymentReviewStatus !== 'MENUNGGU_PUTUSAN_UTAMA' &&
    state.paymentReviewStatus !== 'DIAMBIL_ALIH_UTAMA'
  ) {
    return gagal(state, 'Bukti belum mendapat pemeriksaan awal dari Admin Biasa')
  }

  const baru = salin(state)

  if (keputusan === 'DISETUJUI') {
    baru.paymentReviewStatus = 'DISETUJUI'
    baru.paymentProofStatus = 'TERVERIFIKASI'
    baru.orderStatus = statusPesananSetelahLunas(pickupStatus)
    return {
      boleh: true,
      alasan: null,
      state: baru,
      statusBuktiAkhir: 'TERVERIFIKASI',
    }
  }

  if (!teks(alasan)) {
    return gagal(state, 'Penolakan final wajib disertai alasan')
  }

  baru.paymentRejectedCount = state.paymentRejectedCount + 1
  // BR-014: tolak ke-1 wajib kembali ke pemeriksa awal yang sama,
  // sehingga ID pemeriksa awal tidak boleh ditimpa oleh Admin Utama.
  // (Admin Utama tercatat terpisah di PaymentVerificationRecord + AuditLog.)

  if (baru.paymentRejectedCount === 1) {
    baru.paymentReviewStatus = 'DIKEMBALIKAN_KE_PEMERIKSA'
    baru.paymentProofStatus = 'MENUNGGU_VERIFIKASI'
  } else {
    baru.paymentReviewStatus = 'DIAMBIL_ALIH_UTAMA'
    baru.paymentProofStatus = 'PERLU_BUKTI_BARU'
  }

  return {
    boleh: true,
    alasan: null,
    state: baru,
    statusBuktiAkhir: baru.paymentProofStatus,
  }
}

/** Admin berwenang meminta bukti baru dengan alasan + tenggat pengganti. */
export function mintaBuktiBaru(
  state: StateVerifikasi,
  actor: Aktor,
  alasan: string | undefined,
  tenggatBaru: Date | string | undefined,
  sekarang: Date | string = new Date()
): HasilVerifikasi & { tenggatBaru: Date | null } {
  if (actor.role !== 'ADMIN_BIASA' && actor.role !== 'ADMIN_UTAMA') {
    return { ...gagal(state, 'Akses ditolak'), tenggatBaru: null }
  }
  if (!teks(alasan)) {
    return { ...gagal(state, 'Alasan permintaan bukti baru wajib diisi'), tenggatBaru: null }
  }
  const deadline = keDate(tenggatBaru)
  const waktu = keDate(sekarang) ?? new Date()
  if (!deadline || deadline.getTime() <= waktu.getTime()) {
    return {
      ...gagal(state, 'Tenggat pengganti harus lebih lambat dari waktu sekarang'),
      tenggatBaru: null,
    }
  }

  const baru = salin(state)
  baru.paymentReviewStatus = 'BELUM_DIPERIKSA'
  baru.paymentReviewerId = null
  baru.paymentProofStatus = 'PERLU_BUKTI_BARU'
  return {
    boleh: true,
    alasan: null,
    state: baru,
    statusBuktiAkhir: 'PERLU_BUKTI_BARU',
    tenggatBaru: deadline,
  }
}

/** Setelah tolak ke-1, Admin Utama dapat mengambil alih kasus. */
export function ambilAlih(
  state: StateVerifikasi,
  actor: Aktor
): HasilVerifikasi {
  if (actor.role !== 'ADMIN_UTAMA') {
    return gagal(state, 'Hanya Admin Utama yang dapat mengambil alih kasus')
  }
  if (state.paymentRejectedCount < 1) {
    return gagal(state, 'Belum ada penolakan final yang dapat diambil alih')
  }
  const baru = salin(state)
  baru.paymentReviewStatus = 'DIAMBIL_ALIH_UTAMA'
  baru.paymentReviewerId = actor.id
  return {
    boleh: true,
    alasan: null,
    state: baru,
    statusBuktiAkhir: baru.paymentProofStatus,
  }
}

export function bolehUnggahUlang(statusBukti: string): boolean {
  return statusBukti === 'MENUNGGU_VERIFIKASI' || statusBukti === 'PERLU_BUKTI_BARU'
}

/** Status yang mengizinkan unggah bukti (pertama kali maupun penggantian). */
export function bolehUnggahBukti(statusBukti: string): boolean {
  return (
    statusBukti === 'BELUM_DIUNGGAH' ||
    statusBukti === 'MENUNGGU_VERIFIKASI' ||
    statusBukti === 'PERLU_BUKTI_BARU'
  )
}

// ==========================================
// Koreksi & pembayaran langsung CFD (BR-017, FR-PAY-004)
// ==========================================
const FIELD_NOMINAL = new Set([
  'totalAmount',
  'allocatedAmount',
  'amount',
  'subtotal',
  'snapshotSellingPrice',
  'refundAmount',
])

export function validasiKoreksi(args: {
  actorRole: string
  alasan?: string
  perubahan: Record<string, unknown>
}): HasilValidasi {
  if (args.actorRole !== 'ADMIN_UTAMA') {
    return { valid: false, alasan: 'Hanya Admin Utama yang dapat mengoreksi pembayaran' }
  }
  if (teks(args.alasan).length < 3) {
    return { valid: false, alasan: 'Alasan koreksi wajib diisi (minimal 3 karakter)' }
  }
  for (const kunci of Object.keys(args.perubahan)) {
    if (FIELD_NOMINAL.has(kunci)) {
      return { valid: false, alasan: 'Nominal uang yang sudah disetujui tidak boleh diubah' }
    }
  }
  if (Object.prototype.hasOwnProperty.call(args.perubahan, 'paymentMethod')) {
    const metode = args.perubahan.paymentMethod
    if (metode !== 'QRIS' && metode !== 'TUNAI_CFD') {
      return { valid: false, alasan: 'Metode pembayaran tidak dikenali' }
    }
  }
  return { valid: true, alasan: null }
}

export function validasiBayarCfd(args: {
  actorRole: string
  orderStatus: string
}): HasilValidasi {
  if (args.actorRole !== 'ADMIN_BIASA' && args.actorRole !== 'ADMIN_UTAMA') {
    return { valid: false, alasan: 'Hanya admin yang dapat mencatat pembayaran CFD' }
  }
  if (args.orderStatus !== 'MENUNGGU_PEMBAYARAN') {
    return { valid: false, alasan: 'Pesanan tidak dalam status Menunggu Pembayaran' }
  }
  return { valid: true, alasan: null }
}

// ==========================================
// Isolasi data sensitif (GR-03, BR-004)
// ==========================================
const FIELD_SENSITIF = new Set([
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

function buangSensitif(nilai: unknown): unknown {
  if (nilai instanceof Date) return nilai
  if (Array.isArray(nilai)) return nilai.map(buangSensitif)
  if (nilai && typeof nilai === 'object') {
    const hasil: Record<string, unknown> = {}
    for (const [kunci, isi] of Object.entries(nilai as Record<string, unknown>)) {
      if (FIELD_SENSITIF.has(kunci)) continue
      hasil[kunci] = buangSensitif(isi)
    }
    return hasil
  }
  return nilai
}

/** Admin Biasa tidak boleh menerima field modal/laba dalam bentuk apa pun. */
export function saringDataAdminBiasa<T>(data: T): T {
  return buangSensitif(data) as T
}

// ==========================================
// Label UI (Bahasa Indonesia)
// ==========================================
const LABEL_REVIEW: Record<string, string> = {
  BELUM_DIPERIKSA: 'Belum Diperiksa',
  MENUNGGU_PUTUSAN_UTAMA: 'Menunggu Putusan Admin Utama',
  DIKEMBALIKAN_KE_PEMERIKSA: 'Dikembalikan ke Pemeriksa Awal',
  DIAMBIL_ALIH_UTAMA: 'Diambil Alih Admin Utama',
  DISETUJUI: 'Disetujui',
}

export function labelStatusReview(status: string): string {
  return LABEL_REVIEW[status] || status
}
