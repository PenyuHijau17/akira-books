import { describe, it, expect } from 'vitest'
import {
  bukuDapatDijual,
  hitungPenyesuaianKeranjang,
  hitungStokTersedia,
  hitungTotalKeranjang,
  pesanPenyesuaianKeranjang,
  type BukuUntukKeranjang,
} from '../keranjang'

const buku = (overrides: Partial<BukuUntukKeranjang> = {}): BukuUntukKeranjang => ({
  id: 'buku-1',
  code: 'AKB-001',
  title: 'Buku Uji',
  sellingPrice: 50000,
  stockTotal: 10,
  stockReserved: 0,
  status: 'TERSEDIA',
  ...overrides,
})

describe('Tahap 7 — Penyesuaian keranjang saat stok berubah (BR-012)', () => {
  it('menghitung stok tersedia sebagai stok total dikurangi stok tertahan', () => {
    expect(hitungStokTersedia(buku({ stockTotal: 10, stockReserved: 3 }))).toBe(7)
    expect(hitungStokTersedia(buku({ stockTotal: 2, stockReserved: 5 }))).toBe(0)
    expect(hitungStokTersedia(null)).toBe(0)
  })

  it('menolak buku yang tidak dijual atau sudah digabung', () => {
    expect(bukuDapatDijual(buku())).toBe(true)
    expect(bukuDapatDijual(buku({ status: 'NONAKTIF' }))).toBe(false)
    expect(bukuDapatDijual(buku({ status: 'TERJUAL' }))).toBe(false)
    expect(bukuDapatDijual(buku({ mergedIntoBookId: 'buku-utama' }))).toBe(false)
  })

  it('mengurangi kuantitas ketika stok tersedia lebih kecil dari isi keranjang', () => {
    const penyesuaian = hitungPenyesuaianKeranjang(
      [{ id: 'item-1', bookId: 'buku-1', quantity: 5 }],
      { 'buku-1': buku({ stockTotal: 10, stockReserved: 8 }) }
    )

    expect(penyesuaian).toHaveLength(1)
    expect(penyesuaian[0]).toMatchObject({
      jenis: 'DIKURANGI',
      kuantitasLama: 5,
      kuantitasBaru: 2,
      stokTersedia: 2,
    })
  })

  it('menghapus item saat stok habis akibat penjualan offline', () => {
    const penyesuaian = hitungPenyesuaianKeranjang(
      [{ id: 'item-1', bookId: 'buku-1', quantity: 2 }],
      { 'buku-1': buku({ stockTotal: 7, stockReserved: 7 }) }
    )

    expect(penyesuaian).toHaveLength(1)
    expect(penyesuaian[0].jenis).toBe('DIHAPUS')
    expect(penyesuaian[0].kuantitasBaru).toBe(0)
    expect(penyesuaian[0].alasan.toLowerCase()).toContain('stok')
  })

  it('menghapus item ketika buku tidak lagi ditemukan di katalog', () => {
    const penyesuaian = hitungPenyesuaianKeranjang(
      [{ id: 'item-2', bookId: 'buku-hilang', quantity: 1 }],
      {}
    )

    expect(penyesuaian).toHaveLength(1)
    expect(penyesuaian[0].jenis).toBe('DIHAPUS')
    expect(penyesuaian[0].alasan).toContain('katalog')
  })

  it('tidak menyesuaikan item yang masih valid', () => {
    const penyesuaian = hitungPenyesuaianKeranjang(
      [{ id: 'item-3', bookId: 'buku-1', quantity: 2 }],
      { 'buku-1': buku({ stockTotal: 5, stockReserved: 0 }) }
    )

    expect(penyesuaian).toHaveLength(0)
  })

  it('menghasilkan notifikasi yang meminta tinjau ulang sebelum checkout', () => {
    const penyesuaian = hitungPenyesuaianKeranjang(
      [{ id: 'item-1', bookId: 'buku-1', quantity: 4 }],
      { 'buku-1': buku({ title: 'Laskar Pelangi', stockTotal: 3, stockReserved: 1 }) }
    )

    const pesan = pesanPenyesuaianKeranjang(penyesuaian, {
      'buku-1': 'Laskar Pelangi',
    })

    expect(pesan).toContain('Laskar Pelangi')
    expect(pesan).toContain('disesuaikan dari 4 menjadi 2')
    expect(pesan.toLowerCase()).toContain('tinjau')
    expect(pesan.toLowerCase()).toContain('checkout')
  })

  it('menghitung total keranjang memakai harga jual terkini', () => {
    const total = hitungTotalKeranjang(
      [
        { id: 'item-1', bookId: 'buku-1', quantity: 2 },
        { id: 'item-2', bookId: 'buku-2', quantity: 1 },
      ],
      {
        'buku-1': buku({ sellingPrice: 50000 }),
        'buku-2': buku({ id: 'buku-2', sellingPrice: 75000 }),
      }
    )

    expect(total).toBe(175000)
  })
})
