// src/lib/__tests__/detail-pesanan.test.ts
// Regresi kerapian detail pesanan Customer: refund, penguncian pengajuan, dan redaksi WIB.

import { describe, expect, it } from 'vitest'
import {
  TEKS_BATAS_PENGAMBILAN,
  formatPengambilanRingkas,
  jadwalMenungguKonfirmasi,
  metodeMenungguKonfirmasi,
  statusRefundBerlaku,
  tenggatMenungguKonfirmasi,
} from '../detailPesanan'

describe('Ringkasan detail pesanan Customer', () => {
  it('menyembunyikan status refund yang tidak berlaku', () => {
    expect(statusRefundBerlaku('TIDAK_BERLAKU')).toBe(false)
    expect(statusRefundBerlaku(null)).toBe(false)
    expect(statusRefundBerlaku(undefined)).toBe(false)
  })

  it('tetap menampilkan refund yang sedang atau pernah diproses', () => {
    for (const status of [
      'PERLU_DIPROSES',
      'MENUNGGU_PERSETUJUAN',
      'DIKEMBALIKAN_SEBAGIAN',
      'SELESAI',
      'DITOLAK',
    ]) {
      expect(statusRefundBerlaku(status)).toBe(true)
    }
  })
})

describe('Penguncian pengajuan yang menunggu konfirmasi', () => {
  it('mengunci jadwal saat status menunggu konfirmasi admin', () => {
    expect(jadwalMenungguKonfirmasi({ pickupStatus: 'MENUNGGU_KONFIRMASI' })).toBe(true)
  })

  it('mengunci jadwal saat pengajuan sendiri masih tertunda', () => {
    expect(
      jadwalMenungguKonfirmasi({
        pickupStatus: 'PERUBAHAN_MENUNGGU_PERSETUJUAN',
        usulanTertunda: { jenis: 'PENGAJUAN_CUSTOMER', status: 'MENUNGGU_PERSETUJUAN' },
      })
    ).toBe(true)
  })

  it('membuka form jadwal setelah pengajuan diputuskan', () => {
    expect(jadwalMenungguKonfirmasi({ pickupStatus: 'DISETUJUI', usulanTertunda: null })).toBe(false)
  })

  it('mengunci metode dan tenggat yang masih menunggu', () => {
    expect(metodeMenungguKonfirmasi('MENUNGGU_PERSETUJUAN')).toBe(true)
    expect(metodeMenungguKonfirmasi('DISETUJUI')).toBe(false)
    expect(
      tenggatMenungguKonfirmasi([
        { status: 'DITOLAK' },
        { status: 'MENUNGGU_PERSETUJUAN' },
      ])
    ).toBe(true)
    expect(tenggatMenungguKonfirmasi([{ status: 'DISETUJUI' }])).toBe(false)
    expect(tenggatMenungguKonfirmasi(null)).toBe(false)
  })
})

describe('Redaksi batas pengambilan', () => {
  it('menyatakan batas tutup, bukan jam buka', () => {
    expect(
      formatPengambilanRingkas('2026-11-29T02:00:00.000Z', () => 'Minggu, 29 November 2026')
    ).toBe('Minggu, 29 November 2026 (ditutup pukul 09.00 WIB)')
    expect(TEKS_BATAS_PENGAMBILAN).toBe(
      'Batas waktu pengambilan ditutup pukul 09.00 WIB (tanpa pilihan jam tertentu).'
    )
  })
})
