// src/lib/keranjang.ts
// Logika murni Keranjang Belanja (Tahap 7) — tanpa akses database agar mudah diuji.
// Referensi: FR-ORD-001, BR-010 (keranjang tanpa hold), BR-012 (sinkronisasi stok).

export type BukuUntukKeranjang = {
  id: string
  code?: string | null
  title?: string | null
  sellingPrice?: number | null
  stockTotal: number
  stockReserved: number
  status?: string | null
  mergedIntoBookId?: string | null
}

export type ItemKeranjang = {
  id: string
  bookId: string
  quantity: number
}

export type JenisPenyesuaian = 'DIHAPUS' | 'DIKURANGI'

export type PenyesuaianKeranjang = {
  itemId: string
  bookId: string
  jenis: JenisPenyesuaian
  kuantitasLama: number
  kuantitasBaru: number
  stokTersedia: number
  alasan: string
}

/** Stok yang benar-benar bisa dijual = stok total - stok tertahan (tidak pernah negatif). */
export function hitungStokTersedia(buku: BukuUntukKeranjang | null | undefined): number {
  if (!buku) return 0
  return Math.max(0, buku.stockTotal - buku.stockReserved)
}

/** Apakah buku masih boleh dijual (bukan nonaktif/terjual/duplikat yang sudah digabung). */
export function bukuDapatDijual(buku: BukuUntukKeranjang | null | undefined): boolean {
  if (!buku) return false
  if (buku.mergedIntoBookId) return false
  if (!buku.status) return true
  return buku.status === 'TERSEDIA' || buku.status === 'SEDANG_DIPESAN'
}

/**
 * Hitung penyesuaian keranjang berdasarkan stok terkini (BR-012).
 * - Buku hilang / tidak dijual / stok habis  -> item DIHAPUS
 * - Kuantitas melebihi stok tersedia          -> item DIKURANGI
 * - Selain itu tidak berubah
 */
export function hitungPenyesuaianKeranjang(
  items: ItemKeranjang[],
  bukuMap: Record<string, BukuUntukKeranjang | null | undefined>
): PenyesuaianKeranjang[] {
  const hasil: PenyesuaianKeranjang[] = []

  for (const item of items) {
    const buku = bukuMap[item.bookId]

    if (!buku) {
      hasil.push({
        itemId: item.id,
        bookId: item.bookId,
        jenis: 'DIHAPUS',
        kuantitasLama: item.quantity,
        kuantitasBaru: 0,
        stokTersedia: 0,
        alasan: 'Buku tidak tersedia lagi di katalog',
      })
      continue
    }

    if (!bukuDapatDijual(buku)) {
      hasil.push({
        itemId: item.id,
        bookId: item.bookId,
        jenis: 'DIHAPUS',
        kuantitasLama: item.quantity,
        kuantitasBaru: 0,
        stokTersedia: 0,
        alasan: 'Buku sudah tidak dijual',
      })
      continue
    }

    const tersedia = hitungStokTersedia(buku)

    if (tersedia <= 0) {
      hasil.push({
        itemId: item.id,
        bookId: item.bookId,
        jenis: 'DIHAPUS',
        kuantitasLama: item.quantity,
        kuantitasBaru: 0,
        stokTersedia: 0,
        alasan: 'Stok buku habis',
      })
      continue
    }

    if (item.quantity > tersedia) {
      hasil.push({
        itemId: item.id,
        bookId: item.bookId,
        jenis: 'DIKURANGI',
        kuantitasLama: item.quantity,
        kuantitasBaru: tersedia,
        stokTersedia: tersedia,
        alasan: `Kuantitas disesuaikan menjadi ${tersedia} sesuai stok tersedia`,
      })
    }
  }

  return hasil
}

/** Total harga keranjang memakai harga jual terkini (bukan snapshot). */
export function hitungTotalKeranjang(
  items: ItemKeranjang[],
  bukuMap: Record<string, BukuUntukKeranjang | null | undefined>
): number {
  return items.reduce((total, item) => {
    const buku = bukuMap[item.bookId]
    const harga = buku?.sellingPrice ?? 0
    return total + harga * item.quantity
  }, 0)
}

/** Pesan notifikasi yang jelas untuk Customer saat keranjang disesuaikan otomatis. */
export function pesanPenyesuaianKeranjang(
  penyesuaian: PenyesuaianKeranjang[],
  judulMap: Record<string, string | null | undefined> = {}
): string {
  if (penyesuaian.length === 0) return ''

  const rincian = penyesuaian
    .map((p) => {
      const judul = judulMap[p.bookId] || 'Buku'
      if (p.jenis === 'DIHAPUS') {
        return `"${judul}" dihapus dari keranjang (${p.alasan.toLowerCase()})`
      }
      return `"${judul}" disesuaikan dari ${p.kuantitasLama} menjadi ${p.kuantitasBaru}`
    })
    .join('; ')

  return `Keranjang Anda disesuaikan karena perubahan stok: ${rincian}. Mohon tinjau dan setujui ulang keranjang sebelum checkout.`
}

/** Ringkasan perubahan untuk ditampilkan di UI. */
export function ringkasPerubahanStok(penyesuaian: PenyesuaianKeranjang[]): string[] {
  return penyesuaian.map((p) =>
    p.jenis === 'DIHAPUS'
      ? `Item dihapus: ${p.alasan}`
      : `Kuantitas dikurangi dari ${p.kuantitasLama} menjadi ${p.kuantitasBaru}`
  )
}
