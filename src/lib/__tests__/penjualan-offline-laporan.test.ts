import { describe, expect, it } from 'vitest'
import {
  bolehAksesLaporanKeuangan,
  bolehLihatModalLaba,
  hitungLabaKotor,
  parsePeriodeLaporan,
  penilaianPersetujuanKoreksi,
  penilaianUsulKoreksiHarga,
  rencanaPenjualanOffline,
  ringkasanLaba,
  validasiHargaSatuan,
} from '@/lib/penjualanOffline'
import { saringPenjualanUntukPeran } from '@/lib/penjualanServer'

const buku = {
  id: 'buku-1',
  code: 'BKU-1',
  title: 'Buku Uji',
  sellingPrice: 70000,
  costPrice: 30000,
  stockTotal: 5,
  stockReserved: 1,
  status: 'TERSEDIA',
  mergedIntoBookId: null,
}

describe('Tahap 11 — pencatatan penjualan offline (BR-012)', () => {
  it('menyiapkan rencana dengan stok tersedia dan urutan kunci konsisten', () => {
    const hasil = rencanaPenjualanOffline(
      [
        { bookId: 'buku-2', quantity: 1, actualSellingPrice: 50000 },
        { bookId: 'buku-1', quantity: 3, actualSellingPrice: 75000 },
      ],
      {
        'buku-1': buku,
        'buku-2': { ...buku, id: 'buku-2', stockTotal: 4, stockReserved: 0 },
      }
    )

    expect(hasil.valid).toBe(true)
    expect(hasil.rencana.map((r) => r.bookId)).toEqual(['buku-1', 'buku-2'])
    expect(hasil.rencana[0]).toMatchObject({
      quantity: 3,
      costPrice: 30000,
      stokSebelum: 5,
      stokSesudah: 2,
    })
  })

  it('menolak stok tidak mencukupi, buku nonaktif, duplikat judul, dan harga invalid', () => {
    expect(
      rencanaPenjualanOffline([{ bookId: 'buku-1', quantity: 5, actualSellingPrice: 75000 }], {
        'buku-1': buku,
      }).valid
    ).toBe(false)

    expect(
      rencanaPenjualanOffline([{ bookId: 'buku-1', quantity: 1, actualSellingPrice: 75000 }], {
        'buku-1': { ...buku, status: 'NONAKTIF' },
      }).valid
    ).toBe(false)

    expect(
      rencanaPenjualanOffline(
        [
          { bookId: 'buku-1', quantity: 1, actualSellingPrice: 75000 },
          { bookId: 'buku-1', quantity: 1, actualSellingPrice: 75000 },
        ],
        { 'buku-1': buku }
      ).valid
    ).toBe(false)

    expect(validasiHargaSatuan(0).valid).toBe(false)
    expect(validasiHargaSatuan(12500).valid).toBe(true)
  })
})

describe('Tahap 11 — kalkulasi laba historis vs hitung ulang (BR-021/BR-022)', () => {
  const item = { quantity: 2, actualSellingPrice: 75000, costPrice: 30000, bookId: 'buku-1' }

  it('menghitung laba kotor sesuai rumus', () => {
    expect(hitungLabaKotor(item)).toBe(90000)
  })

  it('memisahkan modal snapshot dari modal terbaru', () => {
    const ringkasan = ringkasanLaba([item], { 'buku-1': 40000 })
    expect(ringkasan.pendapatan).toBe(150000)
    expect(ringkasan.unit).toBe(2)
    expect(ringkasan.labaHistoris).toBe(90000)
    expect(ringkasan.labaHitungUlang).toBe(70000)
  })
})

describe('Tahap 11 — usul & persetujuan koreksi harga offline (FR-OFF-001)', () => {
  const dasar = { peran: 'ADMIN_BIASA', alasan: 'Harga kesepakatan lapak', hargaLama: 70000 }

  it('admin boleh mengusulkan dengan alasan wajib dan harga berbeda', () => {
    expect(penilaianUsulKoreksiHarga({ ...dasar, hargaBaru: 75000 }).valid).toBe(true)
    expect(penilaianUsulKoreksiHarga({ ...dasar, alasan: '', hargaBaru: 75000 }).valid).toBe(false)
    expect(penilaianUsulKoreksiHarga({ ...dasar, hargaBaru: 70000 }).valid).toBe(false)
    expect(
      penilaianUsulKoreksiHarga({ ...dasar, peran: 'CUSTOMER', hargaBaru: 75000 }).valid
    ).toBe(false)
  })

  it('hanya Admin Utama yang dapat memutuskan dan penolakan wajib beralasan', () => {
    const pengajuan = {
      peran: 'ADMIN_UTAMA',
      status: 'MENUNGGU_PERSETUJUAN',
      aksi: 'SETUJUI_KOREKSI' as const,
    }
    expect(penilaianPersetujuanKoreksi(pengajuan).valid).toBe(true)
    expect(
      penilaianPersetujuanKoreksi({ ...pengajuan, peran: 'ADMIN_BIASA' }).valid
    ).toBe(false)
    expect(
      penilaianPersetujuanKoreksi({ ...pengajuan, status: 'DISETUJUI' }).valid
    ).toBe(false)
    expect(
      penilaianPersetujuanKoreksi({
        ...pengajuan,
        aksi: 'TOLAK_KOREKSI',
        alasan: '',
      }).valid
    ).toBe(false)
    expect(
      penilaianPersetujuanKoreksi({
        ...pengajuan,
        aksi: 'TOLAK_KOREKSI',
        alasan: 'Harga tidak sesuai nota',
      }).valid
    ).toBe(true)
  })
})

describe('Tahap 11 — isolasi modal & laporan (GR-03)', () => {
  it('Admin Biasa ditolak untuk laporan dan modal/laba', () => {
    expect(bolehAksesLaporanKeuangan('ADMIN_BIASA')).toBe(false)
    expect(bolehAksesLaporanKeuangan('CUSTOMER')).toBe(false)
    expect(bolehAksesLaporanKeuangan('ADMIN_UTAMA')).toBe(true)
    expect(bolehLihatModalLaba('ADMIN_BIASA')).toBe(false)
    expect(bolehLihatModalLaba('ADMIN_UTAMA')).toBe(true)
  })

  it('menyangkirkan seluruh field modal/laba dari payload Admin Biasa secara rekursif', () => {
    const hasil = saringPenjualanUntukPeran(
      {
        penjualan: { id: 's1', pendapatan: 100000, labaHistoris: 40000 },
        items: [{ costPrice: 20000, snapshotCostPrice: 20000, actualSellingPrice: 50000 }],
      },
      'ADMIN_BIASA'
    ) as any

    expect(hasil.penjualan.pendapatan).toBe(100000)
    expect(hasil.penjualan.labaHistoris).toBeUndefined()
    expect(hasil.items[0].actualSellingPrice).toBe(50000)
    expect(hasil.items[0].costPrice).toBeUndefined()
    expect(hasil.items[0].snapshotCostPrice).toBeUndefined()
  })

  it('Admin Utama tetap menerima laba historis dan snapshot modal', () => {
    const data = {
      penjualan: { id: 's1', pendapatan: 100000, labaHistoris: 40000 },
      items: [{ costPrice: 20000, actualSellingPrice: 50000 }],
    }
    expect(saringPenjualanUntukPeran(data, 'ADMIN_UTAMA')).toEqual(data)
  })
})

describe('Tahap 11 — periode laporan WIB (BR-009/NFR-06)', () => {
  const sekarang = new Date('2026-11-25T18:30:00.000Z') // 26 Nov 2026 01.30 WIB

  it('batas harian mengikuti hari WIB, bukan UTC', () => {
    const periode = parsePeriodeLaporan('harian', undefined, sekarang)
    expect(periode.label).toBe('26-11-2026')
    expect(periode.mulai.toISOString()).toBe('2026-11-25T17:00:00.000Z')
    expect(periode.sampai.toISOString()).toBe('2026-11-26T17:00:00.000Z')
  })

  it('batas bulanan dan tahunan mencakup seluruh periode WIB', () => {
    const bulan = parsePeriodeLaporan('bulanan', '2026-11', sekarang)
    expect(bulan.mulai.toISOString()).toBe('2026-10-31T17:00:00.000Z')
    expect(bulan.sampai.toISOString()).toBe('2026-11-30T17:00:00.000Z')

    const tahun = parsePeriodeLaporan('tahunan', '2026', sekarang)
    expect(tahun.mulai.toISOString()).toBe('2025-12-31T17:00:00.000Z')
    expect(tahun.sampai.toISOString()).toBe('2026-12-31T17:00:00.000Z')
  })

  it('menolak tanggal tidak valid dan jenis periode unknown', () => {
    expect(() => parsePeriodeLaporan('harian', '2026-02-31', sekarang)).toThrow()
    expect(() => parsePeriodeLaporan('bulanan', '2026-13', sekarang)).toThrow()
    expect(() => parsePeriodeLaporan('mingguan', '2026', sekarang)).toThrow()
  })
})
