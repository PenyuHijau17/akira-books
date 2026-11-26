import { describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import {
  daftarNotifikasiPengguna,
  tandaiNotifikasiDibaca,
} from '@/lib/notifikasiServer'

/**
 * Tahap 12 — penandaan baca satuan/mark all dan isolasi ketat antar pemilik akun.
 * Menggunakan database nyata (BR-002/BR-003/GR-03).
 */
describe('Tahap 12 — baca notifikasi & isolasi pengguna (database nyata)', () => {
  it('hanya mengubah notifikasi milik akun sendiri dan menyaring modal/laba', async () => {
    const db = prisma()
    const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

    const [customerA, customerB, adminBiasa] = await Promise.all([
      db.user.create({
        data: { email: `notif-a-${unik}@example.test`, passwordHash: 'x', name: 'Penerima A', role: 'CUSTOMER' },
      }),
      db.user.create({
        data: { email: `notif-b-${unik}@example.test`, passwordHash: 'x', name: 'Penerima B', role: 'CUSTOMER' },
      }),
      db.user.create({
        data: { email: `notif-admin-${unik}@example.test`, passwordHash: 'x', name: 'Admin Biasa', role: 'ADMIN_BIASA' },
      }),
    ])
    const idUsers = [customerA.id, customerB.id, adminBiasa.id]

    try {
      await db.notification.create({
        data: {
          userId: customerA.id,
          userUserId: customerA.id,
          groupKey: `uji-notif:a:${unik}`,
          kategori: 'PESANAN',
          entitasId: 'order-a',
          message: 'Notifikasi milik A',
        },
      })
      const notifB = await db.notification.create({
        data: {
          userId: customerB.id,
          userUserId: customerB.id,
          groupKey: `uji-notif:b:${unik}`,
          kategori: 'PESANAN',
          entitasId: 'order-b',
          message: 'Notifikasi milik B',
        },
      })
      await db.notification.create({
        data: {
          userId: adminBiasa.id,
          userUserId: adminBiasa.id,
          groupKey: `uji-notif:admin:${unik}`,
          kategori: 'PENJUALAN',
          entitasId: 'sale-1',
          message: 'Notifikasi admin',
          metadata: { total: 90000, costPrice: 40000, labaHistoris: 50000 } as any,
        },
      })

      const inboxA = await daftarNotifikasiPengguna({ userId: customerA.id, peran: 'CUSTOMER' })
      expect(inboxA.belumDibaca).toBe(1)
      expect(inboxA.daftar).toHaveLength(1)
      expect(inboxA.daftar[0].message).toBe('Notifikasi milik A')

      const inboxAdmin = await daftarNotifikasiPengguna({ userId: adminBiasa.id, peran: 'ADMIN_BIASA' })
      expect(JSON.stringify(inboxAdmin)).not.toContain('costPrice')
      expect(JSON.stringify(inboxAdmin)).not.toContain('labaHistoris')
      expect(JSON.stringify(inboxAdmin)).toContain('90000')

      const notifA = await db.notification.findFirstOrThrow({
        where: { userId: customerA.id, groupKey: `uji-notif:a:${unik}` },
      })

      // Sisipkan id milik pengguna lain: tetap tidak boleh berubah.
      const diubah = await tandaiNotifikasiDibaca({
        userId: customerA.id,
        ids: [notifA.id, notifB.id],
      })
      expect(diubah).toBe(1)
      expect((await db.notification.findUnique({ where: { id: notifA.id } }))?.isRead).toBe(true)
      expect((await db.notification.findUnique({ where: { id: notifB.id } }))?.isRead).toBe(false)

      const semuaDiubah = await tandaiNotifikasiDibaca({ userId: customerB.id, semua: true })
      expect(semuaDiubah).toBe(1)
      expect((await db.notification.findUnique({ where: { id: notifB.id } }))?.isRead).toBe(true)

      const setelahA = await daftarNotifikasiPengguna({ userId: customerA.id, peran: 'CUSTOMER' })
      expect(setelahA.belumDibaca).toBe(0)
      expect((await daftarNotifikasiPengguna({ userId: customerB.id, peran: 'CUSTOMER' })).belumDibaca).toBe(0)
    } finally {
      await db.notification.deleteMany({ where: { userId: { in: idUsers } } })
      await db.notificationOutbox.deleteMany({ where: { userId: { in: idUsers } } })
      for (const id of idUsers) {
        await db.user.delete({ where: { id } }).catch(() => undefined)
      }
    }
  }, 60000)
})
