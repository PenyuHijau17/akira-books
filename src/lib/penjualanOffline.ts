// src/lib/penjualanOffline.ts
// Logika murni Tahap 11: penjualan offline, koreksi harga, laba kotor, dan periode laporan.
// Tidak mengakses database agar dapat diuji secara unit (GR-10).
// Referensi: FR-OFF-001, FR-REP-001, BR-012, BR-021, BR-022, BR-024, BR-009/NFR-06.

export type BukuPenjualan = {
  id: string
  code?: string | null
  title?: string | null
  sellingPrice?: number | null
  costPrice: number
  stockTotal: number
  stockReserved: number
  status?: string | null
  mergedIntoBookId?: string | null
}

export type ItemPenjualanMasuk = {
  bookId: string
  quantity: number
  actualSellingPrice: number
}

export type RencanaItemPenjualan = {
  bookId: string
  code: string
  title: string
  quantity: number
  actualSellingPrice: number
  costPrice: number
  stokSebelum: number
  stokSesudah: number
}

export type ItemLaba = {
  bookId?: string
  quantity: number
  actualSellingPrice: number
  costPrice: number
}

export type PeriodeLaporan = {
  jenis: 'harian' | 'bulanan' | 'tahunan'
  mulai: Date
  sampai: Date
  label: string
}

const ROLE_ADMIN = new Set(['ADMIN_BIASA', 'ADMIN_UTAMA'])

/** GR-03/BR-004: hanya Admin Utama yang boleh melihat modal & laba. */
export function bolehLihatModalLaba(peran: string | null | undefined): boolean {
  return peran === 'ADMIN_UTAMA'
}

/** FR-REP-001: laporan keuangan khusus Admin Utama (403 di server untuk peran lain). */
export function bolehAksesLaporanKeuangan(peran: string | null | undefined): boolean {
  return peran === 'ADMIN_UTAMA'
}

/** Harga satuan harus bilangan bulat positif. */
export function validasiHargaSatuan(harga: number): { valid: boolean; alasan?: string } {
  if (!Number.isInteger(harga) || harga <= 0) {
    return { valid: false, alasan: 'Harga jual per unit harus bilangan bulat lebih dari 0' }
  }
  return { valid: true }
}

/**
 * Rencana penjualan offline: agregat per judul, urutan kunci konsisten (anti-deadlock),
 * dan jaminan (stockTotal - stockReserved) >= kuantitas sebelum transaksi (BR-012).
 */
export function rencanaPenjualanOffline(
  items: ItemPenjualanMasuk[],
  bukuMap: Record<string, BukuPenjualan | null | undefined>
): {
  valid: boolean
  alasan?: string
  rencana: RencanaItemPenjualan[]
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, alasan: 'Minimal satu buku harus dicatat', rencana: [] }
  }

  const sudah = new Set<string>()
  for (const item of items) {
    if (sudah.has(item.bookId)) {
      return {
        valid: false,
        alasan: 'Judul buku yang sama tidak boleh dimasukkan dua kali; gabungkan kuantitasnya',
        rencana: [],
      }
    }
    sudah.add(item.bookId)

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { valid: false, alasan: 'Kuantitas harus bilangan bulat minimal 1', rencana: [] }
    }
    const cekHarga = validasiHargaSatuan(Number(item.actualSellingPrice))
    if (!cekHarga.valid) return { valid: false, alasan: cekHarga.alasan, rencana: [] }
  }

  const rencana: RencanaItemPenjualan[] = []
  // Urutkan bookId agar SELECT ... FOR UPDATE selalu memakai urutan yang sama.
  for (const item of [...items].sort((a, b) => a.bookId.localeCompare(b.bookId))) {
    const buku = bukuMap[item.bookId]
    if (!buku) {
      return {
        valid: false,
        alasan: `Buku dengan ID ${item.bookId} tidak ditemukan`,
        rencana: [],
      }
    }
    if (buku.mergedIntoBookId || (buku.status && !['TERSEDIA', 'SEDANG_DIPESAN'].includes(buku.status))) {
      return {
        valid: false,
        alasan: `Buku "${buku.title || item.bookId}" tidak dapat dijual`,
        rencana: [],
      }
    }

    const tersedia = Math.max(0, Number(buku.stockTotal) - Number(buku.stockReserved))
    if (tersedia < item.quantity) {
      return {
        valid: false,
        alasan: `Stok buku "${buku.title || item.bookId}" tidak mencukupi (tersedia ${tersedia}, diminta ${item.quantity})`,
        rencana: [],
      }
    }

    rencana.push({
      bookId: buku.id,
      code: buku.code || '',
      title: buku.title || '',
      quantity: item.quantity,
      actualSellingPrice: Number(item.actualSellingPrice),
      costPrice: Number(buku.costPrice || 0),
      stokSebelum: Number(buku.stockTotal),
      stokSesudah: Number(buku.stockTotal) - item.quantity,
    })
  }

  return { valid: true, rencana }
}

/** BR-021: Laba kotor = kuantitas x (harga jual aktual - modal per unit). */
export function hitungLabaKotor(item: ItemLaba): number {
  return Number(item.quantity) * (Number(item.actualSellingPrice) - Number(item.costPrice))
}

/**
 * Pisahkan laba historis (modal snapshot saat transaksi) dari hitung ulang
 * memakai modal per unit terbaru (BR-022).
 */
export function ringkasanLaba(
  items: ItemLaba[],
  costTerkini: Record<string, number> = {}
): {
  pendapatan: number
  unit: number
  labaHistoris: number
  labaHitungUlang: number
} {
  let pendapatan = 0
  let unit = 0
  let labaHistoris = 0
  let labaHitungUlang = 0

  for (const item of items) {
    const jumlah = Number(item.quantity)
    pendapatan += jumlah * Number(item.actualSellingPrice)
    unit += jumlah
    labaHistoris += hitungLabaKotor(item)
    const idBuku = item.bookId || ''
    const modalTerkini =
      typeof costTerkini[idBuku] === 'number'
        ? Number(costTerkini[idBuku])
        : Number(item.costPrice)
    labaHitungUlang += hitungLabaKotor({
      ...item,
      costPrice: modalTerkini,
    })
  }

  return { pendapatan, unit, labaHistoris, labaHitungUlang }
}

/** FR-OFF-001: semua admin boleh mengusulkan koreksi, dengan alasan wajib. */
export function penilaianUsulKoreksiHarga(args: {
  peran: string | null | undefined
  alasan: string
  hargaLama: number
  hargaBaru: number
}): { valid: boolean; alasan?: string } {
  if (!ROLE_ADMIN.has(String(args.peran))) {
    return { valid: false, alasan: 'Hanya admin yang dapat mengusulkan koreksi harga' }
  }
  if (String(args.alasan || '').trim().length < 3) {
    return { valid: false, alasan: 'Alasan koreksi wajib diisi minimal 3 karakter' }
  }
  const cekHarga = validasiHargaSatuan(Number(args.hargaBaru))
  if (!cekHarga.valid) return { valid: false, alasan: cekHarga.alasan }
  if (Number(args.hargaBaru) === Number(args.hargaLama)) {
    return { valid: false, alasan: 'Harga baru harus berbeda dengan harga lama' }
  }
  return { valid: true }
}

/** FR-OFF-001: koreksi berlaku hanya setelah disetujui Admin Utama. */
export function penilaianPersetujuanKoreksi(args: {
  peran: string | null | undefined
  status: string
  aksi: 'SETUJUI_KOREKSI' | 'TOLAK_KOREKSI'
  alasan?: string
}): { valid: boolean; alasan?: string } {
  if (args.peran !== 'ADMIN_UTAMA') {
    return { valid: false, alasan: 'Hanya Admin Utama yang dapat memutuskan koreksi harga' }
  }
  if (args.status !== 'MENUNGGU_PERSETUJUAN') {
    return { valid: false, alasan: 'Koreksi sudah diputuskan atau dibatalkan' }
  }
  if (args.aksi === 'TOLAK_KOREKSI' && String(args.alasan || '').trim().length < 3) {
    return { valid: false, alasan: 'Alasan penolakan wajib diisi minimal 3 karakter' }
  }
  return { valid: true }
}

function bagianWIB(tanggal: Date): { tahun: number; bulan: number; hari: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const bagian: Record<string, string> = {}
  for (const part of formatter.formatToParts(tanggal)) {
    if (part.type !== 'literal') bagian[part.type] = part.value
  }
  return {
    tahun: Number(bagian.year),
    bulan: Number(bagian.month),
    hari: Number(bagian.day),
  }
}

/** Awal hari WIB (UTC+7) untuk tanggal lokal yang diberikan. */
function awalWIB(tahun: number, bulan: number, hari: number): Date {
  return new Date(Date.UTC(tahun, bulan - 1, hari, -7))
}

/** Tolak tanggal seperti 2026-02-31 yang dinormalisasi JavaScript. */
function tanggalValid(tahun: number, bulan: number, hari: number): boolean {
  const uji = new Date(Date.UTC(tahun, bulan - 1, hari))
  return (
    uji.getUTCFullYear() === tahun &&
    uji.getUTCMonth() === bulan - 1 &&
    uji.getUTCDate() === hari
  )
}

/**
 * Batas periode [mulai, sampai) dalam WIB. Nilai kosong memakai tanggal server hari ini WIB.
 * Format: harian YYYY-MM-DD, bulanan YYYY-MM, tahunan YYYY.
 */
export function parsePeriodeLaporan(
  jenis: string,
  nilai?: string | null,
  sekarang: Date = new Date()
): PeriodeLaporan {
  const tipe = String(jenis || 'harian').toLowerCase()
  const hariIni = bagianWIB(sekarang)

  if (tipe === 'harian') {
    const teks = String(nilai || '').trim()
    const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(teks)
    const tahun = cocok ? Number(cocok[1]) : hariIni.tahun
    const bulan = cocok ? Number(cocok[2]) : hariIni.bulan
    const hari = cocok ? Number(cocok[3]) : hariIni.hari
    if (!tanggalValid(tahun, bulan, hari)) {
      throw new Error('Tanggal harian tidak valid (gunakan YYYY-MM-DD)')
    }
    const mulai = awalWIB(tahun, bulan, hari)
    const sampai = awalWIB(tahun, bulan, hari + 1)
    return {
      jenis: 'harian',
      mulai,
      sampai,
      label: `${String(hari).padStart(2, '0')}-${String(bulan).padStart(2, '0')}-${tahun}`,
    }
  }

  if (tipe === 'bulanan') {
    const teks = String(nilai || '').trim()
    const cocok = /^(\d{4})-(\d{2})$/.exec(teks)
    const tahun = cocok ? Number(cocok[1]) : hariIni.tahun
    const bulan = cocok ? Number(cocok[2]) : hariIni.bulan
    if (bulan < 1 || bulan > 12) {
      throw new Error('Bulan tidak valid (gunakan YYYY-MM)')
    }
    return {
      jenis: 'bulanan',
      mulai: awalWIB(tahun, bulan, 1),
      sampai: awalWIB(tahun, bulan + 1, 1),
      label: `${String(bulan).padStart(2, '0')}-${tahun}`,
    }
  }

  if (tipe === 'tahunan') {
    const teks = String(nilai || '').trim()
    const cocok = /^(\d{4})$/.exec(teks)
    const tahun = cocok ? Number(cocok[1]) : hariIni.tahun
    return {
      jenis: 'tahunan',
      mulai: awalWIB(tahun, 1, 1),
      sampai: awalWIB(tahun + 1, 1, 1),
      label: String(tahun),
    }
  }

  throw new Error('Jenis periode tidak dikenali (harian/bulanan/tahunan)')
}
