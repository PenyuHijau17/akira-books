import { describe, expect, it } from 'vitest'
import {
  bolehBacaNotifikasi,
  formatBadgeBelumDibaca,
  kategoriDariKunci,
  kelompokkanNotifikasi,
  type NotifikasiItem,
} from '@/lib/notifikasi'
import { saringNotifikasiUntukPeran } from '@/lib/notifikasiServer'

/**
 * Tahap 12 — pengelompokan notifikasi sejenis, isolasi penerima, dan GR-03.
 * Logika murni: tidak bergantung pada database.
 */
describe('Tahap 12 — pengelompokan & isolasi notifikasi', () => {
  const dasar = (id: string, jam: number, kategori: string, entitasId: string, isRead: boolean): NotifikasiItem => ({
    id,
    kategori,
    entitasId,
    groupKey: `${kategori}:${entitasId}:${id}`,
    message: `Notifikasi ${id}`,
    isRead,
    createdAt: new Date(Date.UTC(2026, 10, 28, jam, 0, 0)),
  })

  it('mengelompokkan notifikasi sejenis per entitas tanpa menghilangkan detail', () => {
    const grup = kelompokkanNotifikasi([
      dasar('a', 1, 'PEMBAYARAN', 'order-1', false),
      dasar('b', 2, 'PEMBAYARAN', 'order-1', false),
      dasar('c', 3, 'JADWAL', 'order-1', true),
      dasar('d', 4, 'PEMBAYARAN', 'order-1', true),
      dasar('e', 5, 'PEMBAYARAN', 'order-2', false),
    ])

    expect(grup.length).toBe(3)
    expect(grup[0].kunci).toBe('PEMBAYARAN:order-2')
    expect(grup[0].jumlah).toBe(1)
    const gabungan = grup.find((g) => g.kunci === 'PEMBAYARAN:order-1')
    expect(gabungan?.jumlah).toBe(3)
    expect(gabungan?.belumDibaca).toBe(2)
    expect(gabungan?.items.map((i) => i.id)).toEqual(['d', 'b', 'a'])
    expect(gabungan?.items.every((i) => typeof i.message === 'string')).toBe(true)
    expect(grup.find((g) => g.kunci === 'JADWAL:order-1')?.belumDibaca).toBe(0)
  })

  it('mengambil kategori dari kunci lama dan memberi label Bahasa Indonesia', () => {
    expect(kategoriDariKunci('jadwal:setuju:order-1')).toBe('JADWAL')
    expect(kategoriDariKunci('pengingat:PENGINGAT_BUKTI:order-1:1')).toBe('PEMBAYARAN')
    expect(kategoriDariKunci('koreksi-offline:usul:x')).toBe('PENJUALAN')
    expect(kategoriDariKunci('pesanan:baru:x')).toBe('PESANAN')
    expect(kategoriDariKunci(null)).toBe('UMUM')

    const grup = kelompokkanNotifikasi(
      [
        {
          id: 'lama',
          groupKey: 'jadwal:setuju:order-1',
          message: 'Jadwal disetujui',
          createdAt: '2026-11-28T01:00:00.000Z',
          isRead: false,
        },
      ],
      { kategoriDifromKunci: true }
    )
    expect(grup[0].label).toBe('Jadwal Pengambilan')
  })

  it('hanya mengizinkan pemilik akun membaca notifikasi', () => {
    expect(bolehBacaNotifikasi({ id: 'user-1' }, { userId: 'user-1' })).toBe(true)
    expect(bolehBacaNotifikasi({ id: 'user-1' }, { userId: 'user-2' })).toBe(false)
    expect(bolehBacaNotifikasi(null, { userId: 'user-1' })).toBe(false)
    expect(bolehBacaNotifikasi({ id: 'user-1' }, null)).toBe(false)
  })

  it('membatasi badge dan membuang field modal/laba untuk peran bukan Admin Utama', () => {
    expect(formatBadgeBelumDibaca(0)).toBe('')
    expect(formatBadgeBelumDibaca(7)).toBe('7')
    expect(formatBadgeBelumDibaca(150)).toBe('99+')

    const payload = {
      message: 'Penjualan selesai',
      metadata: { costPrice: 20000, labaHistoris: 50000, total: 70000 },
    }
    const untukBiasa = saringNotifikasiUntukPeran(payload, 'ADMIN_BIASA') as typeof payload
    expect(untukBiasa.metadata).toEqual({ total: 70000 })
    const untukCustomer = saringNotifikasiUntukPeran(payload, 'CUSTOMER') as typeof payload
    expect(JSON.stringify(untukCustomer)).not.toContain('costPrice')
    const untukUtama = saringNotifikasiUntukPeran(payload, 'ADMIN_UTAMA') as typeof payload
    expect(untukUtama.metadata.total).toBe(70000)
  })
})
