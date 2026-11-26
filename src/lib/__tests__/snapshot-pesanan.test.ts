import { describe, it, expect } from 'vitest'
import {
  buatNomorPesanan,
  daftarMingguBerikutnya,
  hitungSnapshotPesanan,
  tanggalMingguKeDate,
  validasiTanggalMinggu,
  type SnapshotItemPesanan,
} from '../pesanan'
import type { BukuUntukKeranjang } from '../keranjang'

const buku = (overrides: Partial<BukuUntukKeranjang> = {}): BukuUntukKeranjang => ({
  id: 'buku-1',
  code: 'AKB-001',
  title: 'Buku Uji',
  sellingPrice: 50000,
  stockTotal: 10,
  stockReserved: 0,
  ...overrides,
})

describe('Tahap 7 — Snapshot pesanan (BR-011)', () => {
  it('membekukan judul, kode, harga satuan, kuantitas, dan subtotal', () => {
    const hasil = hitungSnapshotPesanan(
      [
        { id: 'item-1', bookId: 'buku-1', quantity: 2 },
        { id: 'item-2', bookId: 'buku-2', quantity: 1 },
      ],
      {
        'buku-1': buku({ title: 'Laskar Pelangi', code: 'LP-001', sellingPrice: 95000 }),
        'buku-2': buku({ id: 'buku-2', title: 'Sang Pemimpi', code: 'SP-002', sellingPrice: 88000 }),
      }
    )

    expect(hasil.items).toHaveLength(2)
    expect(hasil.items[0]).toEqual<SnapshotItemPesanan>({
      bookId: 'buku-1',
      snapshotCode: 'LP-001',
      snapshotTitle: 'Laskar Pelangi',
      snapshotSellingPrice: 95000,
      snapshotCostPrice: 0,
      quantity: 2,
      subtotal: 190000,
    })
    expect(hasil.items[1].subtotal).toBe(88000)
    expect(hasil.total).toBe(278000)
  })

  it('tidak mengubah snapshot ketika data katalog berubah', () => {
    const items = [{ id: 'item-1', bookId: 'buku-1', quantity: 3 }]
    const awal = hitungSnapshotPesanan(items, {
      'buku-1': buku({ title: 'Judul Awal', sellingPrice: 40000 }),
    })
    const setelah = hitungSnapshotPesanan(items, {
      'buku-1': buku({ title: 'Judul Baru', sellingPrice: 99999 }),
    })

    expect(awal.items[0].snapshotTitle).toBe('Judul Awal')
    expect(awal.items[0].snapshotSellingPrice).toBe(40000)
    expect(awal.total).toBe(120000)
    expect(setelah.total).not.toBe(awal.total)
  })

  it('membuat nomor pesanan dengan tanggal WIB dan urutan acak', () => {
    const nomor = buatNomorPesanan(
      new Date('2026-11-26T18:30:00.000Z'),
      () => 0.5
    )

    expect(nomor).toBe('AKB-20261127-550000')
  })

  it('hanya menerima tanggal pengambilan Minggu di masa depan (BR-018)', () => {
    const sekarang = new Date('2026-11-23T00:00:00.000Z') // Senin WIB

    expect(validasiTanggalMinggu('2026-11-29', sekarang).valid).toBe(true)
    expect(validasiTanggalMinggu('2026-11-23', sekarang).valid).toBe(false)
    expect(validasiTanggalMinggu('2026-11-22', sekarang).valid).toBe(false)
    expect(validasiTanggalMinggu('tanggal-invalid', sekarang).valid).toBe(false)
  })

  it('mengubah tanggal Minggu menjadi pukul 09.00 WIB', () => {
    const tanggal = tanggalMingguKeDate('2026-11-29')

    expect(tanggal.toISOString()).toBe('2026-11-29T02:00:00.000Z')
  })

  it('menyediakan daftar Minggu berikutnya untuk pilihan checkout', () => {
    const daftar = daftarMingguBerikutnya(4, new Date('2026-11-23T00:00:00.000Z'))

    expect(daftar).toHaveLength(4)
    expect(daftar[0]).toBe('2026-11-29')
    expect(daftar.every((tanggal) => validasiTanggalMinggu(tanggal, new Date('2026-11-23T00:00:00.000Z')).valid)).toBe(true)
  })
})
