import { describe, expect, it } from 'vitest'
import {
  AMBANG_STOK_MENIPIS,
  daftarPintasanAdmin,
  hitungRingkasanBuku,
  saringRingkasanDashboardUntukPeran,
  tentukanTujuanSetelahLogin,
  type RingkasanDashboard,
} from '../admin-dashboard'

const ringkasanLengkap: RingkasanDashboard & Record<string, unknown> = {
  pembayaranMenungguVerifikasi: 3,
  jadwalMingguTerdekat: 4,
  tanggalMingguTerdekat: '2026-11-29',
  pembatalanRefundAktif: 2,
  judulTersedia: 40,
  stokMenipis: 6,
  tokoBuka: false,
  alasanLibur: 'Libur mingguan',
  // Field sensitif disisipkan sengaja untuk membuktikan penyaringan GR-03.
  costPrice: 99000,
  labaKotor: 125000,
  modalAktual: 88000,
}

describe('Dashboard Admin — redirect login (FR-ACC-001)', () => {
  it('mengarahkan Admin Biasa dan Admin Utama ke /admin', () => {
    expect(tentukanTujuanSetelahLogin('ADMIN_BIASA')).toBe('/admin')
    expect(tentukanTujuanSetelahLogin('ADMIN_UTAMA')).toBe('/admin')
  })

  it('mengarahkan Customer dan Pengunjung ke /katalog', () => {
    expect(tentukanTujuanSetelahLogin('CUSTOMER')).toBe('/katalog')
    expect(tentukanTujuanSetelahLogin('PENGUNGGUNG')).toBe('/katalog')
    expect(tentukanTujuanSetelahLogin(undefined)).toBe('/katalog')
  })
})

describe('Dashboard Admin — ringkasan buku', () => {
  it('menghitung judul tersedia dan stok menipis dari stok agregat', () => {
    const hasil = hitungRingkasanBuku([
      { status: 'TERSEDIA', stockTotal: 10, stockReserved: 2 },
      { status: 'TERSEDIA', stockTotal: 6, stockReserved: 2 }, // sisa 4 → menipis
      { status: 'TERSEDIA', stockTotal: 12, stockReserved: 2 }, // sisa 10 → aman
      { status: 'NONAKTIF', stockTotal: 1, stockReserved: 0 },
      { status: 'TERSEDIA', stockTotal: 3, stockReserved: 3 }, // habis ditahan
    ])
    expect(hasil).toEqual({ judulTersedia: 3, stokMenipis: 1 })
  })

  it('tidak menghitung ulang buku duplikat hasil merge (OD-02)', () => {
    const hasil = hitungRingkasanBuku([
      { status: 'TERSEDIA', stockTotal: 2, stockReserved: 0 },
      { status: 'TERSEDIA', stockTotal: 2, stockReserved: 0, mergedIntoBookId: 'buku-utama' },
    ])
    expect(hasil).toEqual({ judulTersedia: 1, stokMenipis: 1 })
    expect(AMBANG_STOK_MENIPIS).toBe(5)
  })
})

describe('Dashboard Admin — isolasi modal & laba (GR-03)', () => {
  it('membuang costPrice, laba, dan modal untuk Admin Biasa', () => {
    const hasil = saringRingkasanDashboardUntukPeran(ringkasanLengkap, 'ADMIN_BIASA')
    expect(hasil).toEqual({
      pembayaranMenungguVerifikasi: 3,
      jadwalMingguTerdekat: 4,
      tanggalMingguTerdekat: '2026-11-29',
      pembatalanRefundAktif: 2,
      judulTersedia: 40,
      stokMenipis: 6,
      tokoBuka: false,
      alasanLibur: 'Libur mingguan',
    })
    const payload = JSON.stringify(hasil)
    expect(payload).not.toContain('costPrice')
    expect(payload).not.toContain('laba')
    expect(payload).not.toContain('modal')
    expect(payload).not.toContain('99000')
    expect(payload).not.toContain('125000')
  })

  it('tetap menyaring field sensitif untuk Customer dan Pengunjung', () => {
    for (const peran of ['CUSTOMER', 'PENGUNGGUNG'] as const) {
      const payload = JSON.stringify(saringRingkasanDashboardUntukPeran(ringkasanLengkap, peran))
      expect(payload).not.toContain('costPrice')
      expect(payload).not.toContain('labaKotor')
    }
  })

  it('tidak menyertakan angka modal maupun laba walaupun untuk Admin Utama', () => {
    const hasil = saringRingkasanDashboardUntukPeran(ringkasanLengkap, 'ADMIN_UTAMA')
    expect(Object.keys(hasil)).not.toContain('costPrice')
    expect(Object.keys(hasil)).not.toContain('labaKotor')
    expect(hasil.tokoBuka).toBe(false)
  })
})

describe('Dashboard Admin — pintasan cepat', () => {
  it('menjadikan /admin sebagai pintasan pertama untuk kedua peran admin', () => {
    for (const peran of ['ADMIN_BIASA', 'ADMIN_UTAMA'] as const) {
      const pintasan = daftarPintasanAdmin(peran)
      expect(pintasan[0]).toEqual({
        href: '/admin',
        label: 'Dashboard Admin',
        deskripsi: 'Ringkasan operasional toko',
      })
      expect(pintasan.map((item) => item.href)).toEqual(
        expect.arrayContaining([
          '/admin/buku',
          '/admin/pembayaran',
          '/admin/jadwal',
          '/admin/penjualan-offline',
          '/admin/banner',
          '/admin/qris',
        ])
      )
    }
  })

  it('hanya menampilkan laporan & backup untuk Admin Utama', () => {
    const biasa = daftarPintasanAdmin('ADMIN_BIASA').map((item) => item.href)
    const utama = daftarPintasanAdmin('ADMIN_UTAMA').map((item) => item.href)
    expect(biasa).not.toContain('/admin/laporan')
    expect(biasa).not.toContain('/admin/backup')
    expect(utama).toContain('/admin/laporan')
    expect(utama).toContain('/admin/backup')
    expect(JSON.stringify(biasa)).not.toContain('laba')
  })

  it('tidak memberi pintasan admin kepada Customer dan Pengunjung', () => {
    expect(daftarPintasanAdmin('CUSTOMER')).toEqual([])
    expect(daftarPintasanAdmin('PENGUNGGUNG')).toEqual([])
  })
})
