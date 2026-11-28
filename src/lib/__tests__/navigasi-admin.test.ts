import { describe, it, expect } from 'vitest'
import {
  MENU_ADMIN,
  MODUL_PENJUALAN,
  adalahRutePenjualan,
  badgeUntukModul,
  daftarMenuAdmin,
  daftarModulPenjualan,
  ringkasBadgeDashboard,
  statusQrisDariRespons,
  tautanSedangAktif,
} from '@/lib/navigasiAdmin'

describe('Navigasi admin ringkas (Header + hub Penjualan)', () => {
  it('menyediakan delapan menu utama dan enam modul penjualan', () => {
    expect(MENU_ADMIN).toHaveLength(8)
    expect(MODUL_PENJUALAN).toHaveLength(6)
    expect(MENU_ADMIN.map((m) => m.label)).toEqual([
      'Dashboard Admin',
      'Kelola Buku',
      'Penjualan',
      'Banner Promo',
      'Laporan Keuangan',
      'Peringatan Notifikasi',
      'Backup & Pemulihan',
      'Kelola Pengguna',
    ])
  })

  it('menyembunyikan menu khusus Admin Utama dari Admin Biasa', () => {
    const biasa = daftarMenuAdmin('ADMIN_BIASA').map((m) => m.href)
    const utama = daftarMenuAdmin('ADMIN_UTAMA').map((m) => m.href)

    expect(biasa).toHaveLength(5)
    expect(biasa).not.toContain('/admin/laporan')
    expect(biasa).not.toContain('/admin/backup')
    expect(biasa).not.toContain('/admin/pengguna')
    expect(utama).toHaveLength(8)
    expect(utama).toContain('/admin/laporan')
    expect(utama).toContain('/admin/backup')
    expect(utama).toContain('/admin/pengguna')

    expect(daftarModulPenjualan('ADMIN_BIASA').map((m) => m.href)).not.toContain('/admin/qris')
    expect(daftarModulPenjualan('ADMIN_UTAMA').map((m) => m.href)).toContain('/admin/qris')
    expect(daftarMenuAdmin('CUSTOMER')).toEqual([])
  })

  it('menyorot Penjualan pada hub dan seluruh sub-halamannya', () => {
    for (const jalur of [
      '/admin/penjualan',
      '/admin/pembayaran',
      '/admin/jadwal',
      '/admin/pembatalan',
      '/admin/refund',
      '/admin/penjualan-offline',
      '/admin/qris',
    ]) {
      expect(adalahRutePenjualan(jalur)).toBe(true)
      expect(tautanSedangAktif(jalur, '/admin/penjualan')).toBe(true)
      expect(tautanSedangAktif(jalur, '/admin/buku')).toBe(false)
    }

    expect(adalahRutePenjualan('/admin/buku')).toBe(false)
    expect(tautanSedangAktif('/admin/buku', '/admin')).toBe(false)
    expect(tautanSedangAktif('/admin', '/admin')).toBe(true)
    expect(tautanSedangAktif('/admin/buku', '/admin/buku')).toBe(true)
  })

  it('membuang modal/laba saat meringkas respons dashboard (GR-03)', () => {
    const ringkasan = ringkasBadgeDashboard({
      ringkasan: {
        pembayaranMenungguVerifikasi: 3,
        jadwalMingguTerdekat: 5,
        pembatalanRefundAktif: 2,
        costPrice: 999000,
        laba: 888000,
        daftarBuku: [{ title: 'Rahasia', costPrice: 123 }],
      },
      pintasan: [{ label: 'Laporan', costPrice: 456 }],
    })

    expect(ringkasan).toEqual({ pembayaran: 3, jadwal: 5, pembatalanRefund: 2 })
    expect(Object.keys(ringkasan).some((k) => /cost|laba/i.test(k))).toBe(false)
    expect(ringkasBadgeDashboard(null)).toEqual({
      pembayaran: 0,
      jadwal: 0,
      pembatalanRefund: 0,
    })
    expect(ringkasBadgeDashboard({ ringkasan: { pembayaranMenungguVerifikasi: -4 } }).pembayaran).toBe(0)
  })

  it('menentukan badge antrean dan status QRIS dengan aman', () => {
    const kosong = { pembayaran: 0, jadwal: 0, pembatalanRefund: 0 }
    const penuh = { pembayaran: 4, jadwal: 2, pembatalanRefund: 1 }

    expect(badgeUntukModul('/admin/pembayaran', penuh, null)).toEqual({
      teks: '4 menunggu',
      variant: 'warning',
    })
    expect(badgeUntukModul('/admin/jadwal', kosong, null)?.teks).toBe('Antrean kosong')
    expect(badgeUntukModul('/admin/refund', penuh, null)?.teks).toBe('1 aktif')
    expect(badgeUntukModul('/admin/penjualan-offline', penuh, null)).toBeNull()

    expect(statusQrisDariRespons({ aktif: { id: 'qris-1' } })).toBe('aktif')
    expect(statusQrisDariRespons({ aktif: null })).toBe('kosong')
    expect(badgeUntukModul('/admin/qris', kosong, 'terkunci')).toEqual({
      teks: 'Khusus Admin Utama',
      variant: 'neutral',
    })
    expect(badgeUntukModul('/admin/qris', kosong, 'aktif')?.variant).toBe('success')
  })
})
