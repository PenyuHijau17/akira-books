import { describe, expect, it } from 'vitest'
import {
  kelompokkanNotifikasiPerTanggal,
  tautanDetailPesanan,
  type NotifikasiItem,
} from '@/lib/notifikasi'

const idPesanan = 'f85c0111-5bfc-42ef-b780-d9ada30cc60b'
const sekarang = new Date('2026-11-29T02:00:00.000Z') // 09.00 WIB

const item = (
  id: string,
  createdAt: string,
  isRead: boolean,
  tambahan: Partial<NotifikasiItem> = {}
): NotifikasiItem => ({
  id,
  message: `Notifikasi ${id}`,
  createdAt,
  isRead,
  ...tambahan,
})

describe('Tampilan inbox notifikasi', () => {
  it('mengelompokkan berdasarkan hari WIB tanpa judul "Lainnya"', () => {
    const grup = kelompokkanNotifikasiPerTanggal(
      [
        item('lama', '2026-11-27T01:00:00.000Z', true),
        item('baru', '2026-11-29T01:00:00.000Z', false),
        item('kemarin', '2026-11-28T10:00:00.000Z', false),
        item('baru-2', '2026-11-29T00:30:00.000Z', true),
      ],
      sekarang
    )

    expect(grup.map((g) => g.label)).toEqual(['Hari Ini', 'Kemarin', 'Sebelumnya'])
    expect(grup[0].jumlah).toBe(2)
    expect(grup[0].belumDibaca).toBe(1)
    expect(grup[1].items[0].id).toBe('kemarin')
    expect(grup.map((g) => String(g.label))).not.toContain('Lainnya')
    expect(grup[2].items[0].id).toBe('lama')
  })

  it('membuat tautan detail dari ID pesanan pada entitas maupun kunci grup', () => {
    expect(
      tautanDetailPesanan({
        kategori: 'JADWAL',
        entitasId: idPesanan,
        groupKey: null,
        message: 'Pengingat: jadwal pesanan AKB-20261128-194725 masih menunggu.',
      })
    ).toBe(`/pesanan/${idPesanan}`)

    expect(
      tautanDetailPesanan({
        kategori: 'UMUM',
        entitasId: null,
        groupKey: `pesanan:${idPesanan}:dibuat`,
        message: 'Pesanan AKB-20261128-194725 berhasil dibuat.',
      })
    ).toBe(`/pesanan/${idPesanan}`)
  })

  it('menghubungkan nomor pesanan ke daftar pesanan milik pengguna', () => {
    expect(
      tautanDetailPesanan(
        {
          kategori: 'PESANAN',
          entitasId: null,
          groupKey: null,
          message: 'Pesanan AKB-20261128-194725 menunggu pembayaran.',
        },
        [{ id: idPesanan, orderNumber: 'AKB-20261128-194725' }]
      )
    ).toBe(`/pesanan/${idPesanan}`)
  })

  it('tidak membuat tautan untuk notifikasi tanpa pesanan', () => {
    expect(
      tautanDetailPesanan({
        kategori: 'SISTEM',
        entitasId: 'uji-outbox-gagal',
        groupKey: 'outbox:gagal:uji-outbox-gagal',
        message: 'Pengiriman email gagal berulang.',
      })
    ).toBeNull()
  })
})
