import { describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import {
  bersihkanPesanNotifikasi,
  kunciBakuNotifikasi,
} from '@/lib/notifikasiKunci'
import {
  bersihkanDuplikatNotifikasi,
  simpanNotifikasiBaku,
} from '@/lib/notifikasiPenyimpanan'
import { tandaiNotifikasiDibaca } from '@/lib/notifikasiServer'

const idPesanan = 'f85c0111-5bfc-42ef-b780-d9ada30cc60b'

describe('Anti-bengkak notifikasi', () => {
  it('membuang langkah, userId, dan deliveryKey dari kunci', () => {
    const userId = '3f8fc77b-8479-4fe5-8512-d126cde0f313'
    const pengingat = kunciBakuNotifikasi({
      groupKey: `pengingat:PENGINGAT_BUKTI:${idPesanan}:7:${userId}`,
      kategori: 'PEMBAYARAN',
      entitasId: idPesanan,
      userId,
    })
    expect(pengingat.groupKey).toBe(`pengingat:PENGINGAT_BUKTI:${idPesanan}`)
    expect(pengingat.jenis).toBe('PENGINGAT_BUKTI')

    const outbox = kunciBakuNotifikasi({
      groupKey: 'outbox:gagal:uji-outbox-gagal-2026',
      kategori: 'SISTEM',
    })
    expect(outbox.groupKey).toBe('outbox:gagal:EMAIL')

    // Usul dan keputusan koreksi yang sama harus menimpa satu sama lain.
    const idKoreksi = 'aaaaaaaa-1111-2222-3333-444444444444'
    const usul = kunciBakuNotifikasi({
      groupKey: `koreksi-offline:usul:${idKoreksi}`,
      kategori: 'PENJUALAN',
    })
    const keputusan = kunciBakuNotifikasi({
      groupKey: `koreksi-offline:keputusan:${idKoreksi}:1234567890`,
      kategori: 'PENJUALAN',
    })
    expect(usul.groupKey).toBe(`koreksi-offline:KOREKSI_OFFLINE:${idKoreksi}`)
    expect(keputusan.groupKey).toBe(usul.groupKey)

    expect(bersihkanPesanNotifikasi('Kunci pengiriman: abc-123. Pesanan siap diproses.')).toBe(
      'Pesanan siap diproses.'
    )
  })

  it('menimpa baris lama dan membersihkan duplikat (database nyata)', async () => {
    const db = prisma()
    const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const user = await db.user.create({
      data: {
        email: `deduplikasi-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Uji Deduplikasi',
        role: 'ADMIN_BIASA',
      },
    })

    try {
      const kunciMentah = (langkah: number) =>
        `pengingat:PENGINGAT_JADWAL:${idPesanan}:${langkah}:${user.id}`

      await simpanNotifikasiBaku({
        userId: user.id,
        groupKey: kunciMentah(1),
        message: 'Pengingat pertama.',
        kategori: 'JADWAL',
        entitasId: idPesanan,
        client: db,
      })
      await simpanNotifikasiBaku({
        userId: user.id,
        groupKey: kunciMentah(2),
        message: 'Pengingat terbaru.',
        kategori: 'JADWAL',
        entitasId: idPesanan,
        client: db,
      })

      const pengingat = await db.notification.findMany({
        where: { userId: user.id, groupKey: `pengingat:PENGINGAT_JADWAL:${idPesanan}` },
      })
      expect(pengingat).toHaveLength(1)
      expect(pengingat[0].message).toBe('Pengingat terbaru.')

      await tandaiNotifikasiDibaca({ userId: user.id, ids: [pengingat[0].id], client: db })
      await simpanNotifikasiBaku({
        userId: user.id,
        groupKey: kunciMentah(3),
        message: 'Pengingat terbaru.',
        kategori: 'JADWAL',
        entitasId: idPesanan,
        client: db,
      })
      expect(
        (await db.notification.findUnique({ where: { id: pengingat[0].id } }))?.isRead
      ).toBe(false)

      // Jenis kejadian berbeda pada pesanan yang sama tetap dua baris.
      await simpanNotifikasiBaku({
        userId: user.id,
        groupKey: `pengingat:PENGINGAT_BUKTI:${idPesanan}:1:${user.id}`,
        message: 'Bukti belum diperiksa.',
        kategori: 'PEMBAYARAN',
        entitasId: idPesanan,
        client: db,
      })
      expect(await db.notification.count({ where: { userId: user.id } })).toBe(2)

      // Dua deliveryKey berbeda tetap satu peringatan sistem.
      for (const kunci of ['uji-a', 'uji-b']) {
        await simpanNotifikasiBaku({
          userId: user.id,
          groupKey: `outbox:gagal:${kunci}`,
          message: `Kunci pengiriman: ${kunci}. Pengiriman email gagal.`,
          kategori: 'SISTEM',
          kanal: 'EMAIL',
          client: db,
        })
      }
      const sistem = await db.notification.findMany({
        where: { userId: user.id, groupKey: 'outbox:gagal:EMAIL' },
      })
      expect(sistem).toHaveLength(1)
      expect(sistem[0].message).toBe('Pengiriman email gagal.')

      // Duplikat lama yang ditulis langsung tetap dibersihkan.
      await db.notification.create({
        data: {
          userId: user.id,
          userUserId: user.id,
          groupKey: 'outbox:gagal:legacy',
          kategori: 'SISTEM',
          message: 'Peringatan lama.',
        },
      })
      const hasil = await bersihkanDuplikatNotifikasi({ userId: user.id, client: db })
      expect(hasil.dihapus).toBeGreaterThanOrEqual(1)
      expect(
        await db.notification.count({
          where: { userId: user.id, groupKey: 'outbox:gagal:EMAIL' },
        })
      ).toBe(1)
    } finally {
      await db.notification.deleteMany({ where: { userId: user.id } })
      await db.user.delete({ where: { id: user.id } }).catch(() => undefined)
    }
  }, 60000)
})
