import { describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import {
  daftarOutboxGagal,
  enqueueOutbox,
  jalankanOutbox,
  tandaiOutboxDitindaklanjuti,
} from '@/lib/notifikasiServer'
import {
  jedaRetryMenit,
  kunciPengiriman,
  penilaianEskalasi,
  penilaianPengirimanOutbox,
} from '@/lib/outbox'

/**
 * Tahap 12 — outbox persisten: retry bertahap, idempotent delivery key, dan eskalasi
 * ke Admin Utama setelah batas retry. Database nyata dipakai untuk anti-duplikasi.
 */
describe('Tahap 12 — outbox retry & eskalasi', () => {
  it('memakai backoff bertahap dan kunci pengiriman deterministik', () => {
    expect(jedaRetryMenit(1)).toBe(5)
    expect(jedaRetryMenit(2)).toBe(15)
    expect(jedaRetryMenit(3)).toBe(45)
    expect(jedaRetryMenit(99)).toBe(360)

    const kunci = kunciPengiriman({
      kanal: 'EMAIL',
      userId: 'u1',
      groupKey: 'g1',
      kategori: 'PEMBAYARAN',
      entitasId: 'o1',
    })
    expect(kunci).toBe(kunciPengiriman({
      kanal: 'EMAIL',
      userId: 'u1',
      groupKey: 'g1',
      kategori: 'PEMBAYARAN',
      entitasId: 'o1',
    }))

    const t0 = new Date('2026-11-28T00:00:00.000Z')
    const pertama = penilaianPengirimanOutbox({
      attempts: 0,
      maxAttempts: 3,
      kirim: { berhasil: false, error: 'Gagal' },
      sekarang: t0,
    })
    expect(pertama.status).toBe('PENDING')
    expect(pertama.nextAttemptAt.getTime() - t0.getTime()).toBe(5 * 60 * 1000)
    const akhir = penilaianPengirimanOutbox({
      attempts: 2,
      maxAttempts: 3,
      kirim: { berhasil: false, error: 'Gagal' },
      sekarang: t0,
    })
    expect(akhir.status).toBe('GAGAL')
    expect(akhir.butuhEskalasi).toBe(true)
    expect(penilaianEskalasi(2, 3)).toBe(false)
    expect(penilaianEskalasi(3, 3)).toBe(true)
  })

  it('mengabaikan enqueue ganda, retry hingga gagal final, lalu eskalasi sekali', async () => {
    const db = prisma()
    const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const customer = await db.user.create({
      data: { email: `outbox-cust-${unik}@example.test`, passwordHash: 'x', name: 'Customer Outbox', role: 'CUSTOMER' },
    })
    const adminUtama = await db.user.create({
      data: { email: `outbox-admin-${unik}@example.test`, passwordHash: 'x', name: 'Admin Utama Uji', role: 'ADMIN_UTAMA' },
    })
    const deliveryKey = `uji-outbox-gagal-${unik}`
    const inAppKey = `uji-outbox-inapp-${unik}`
    const idUsers = [customer.id, adminUtama.id]

    try {
      const pertama = await enqueueOutbox({
        userId: customer.id,
        groupKey: `uji:inapp:${unik}`,
        message: 'Notifikasi dalam aplikasi',
        kanal: 'IN_APP',
        deliveryKey: inAppKey,
      })
      const kedua = await enqueueOutbox({
        userId: customer.id,
        groupKey: `uji:inapp:${unik}`,
        message: 'Notifikasi dalam aplikasi',
        kanal: 'IN_APP',
        deliveryKey: inAppKey,
      })
      expect(kedua).toBeNull()
      expect(pertama?.deliveryKey).toBe(inAppKey)
      expect(await db.notificationOutbox.count({ where: { deliveryKey: inAppKey } })).toBe(1)

      const t0 = new Date('2026-11-28T07:00:00.000Z')
      await db.notificationOutbox.create({
        data: {
          deliveryKey,
          userId: customer.id,
          kanal: 'EMAIL',
          kategori: 'PEMBAYARAN',
          entitasId: 'order-uji',
          message: `Pengingat pembayaran ${unik}`,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 3,
          nextAttemptAt: t0,
        },
      })

      const kirimGagal = () => ({ berhasil: false as const, error: 'SMTP uji gagal' })
      const hasil1 = await jalankanOutbox({ sekarang: t0, kirim: kirimGagal })
      expect(hasil1.terkirim).toBe(0)
      expect((await db.notificationOutbox.findUnique({ where: { deliveryKey } }))?.attempts).toBe(1)

      const hasil2 = await jalankanOutbox({
        sekarang: new Date(t0.getTime() + 5 * 60 * 1000),
        kirim: kirimGagal,
      })
      expect(hasil2.diproses).toBe(1)
      expect((await db.notificationOutbox.findUnique({ where: { deliveryKey } }))?.attempts).toBe(2)

      const hasil3 = await jalankanOutbox({
        sekarang: new Date(t0.getTime() + 20 * 60 * 1000),
        kirim: kirimGagal,
      })
      expect(hasil3.gagal).toBe(1)
      expect(hasil3.eskalasi).toBe(1)
      const final = await db.notificationOutbox.findUnique({ where: { deliveryKey } })
      expect(final?.status).toBe('GAGAL')
      expect(final?.attempts).toBe(3)
      expect(final?.escalationNotified).toBe(true)

      const eskalasi = await db.notification.findMany({
        where: { userId: adminUtama.id, groupKey: 'outbox:gagal:EMAIL' },
      })
      expect(eskalasi).toHaveLength(1)
      expect(eskalasi[0].message).toContain('Admin Utama')
      expect(eskalasi[0].message).not.toContain('Kunci pengiriman:')
      expect(eskalasi[0].message).not.toContain(deliveryKey)
      expect((await daftarOutboxGagal()).some((x) => x.deliveryKey === deliveryKey)).toBe(true)

      // Status GAGAL tidak diproses ulang → tidak ada notifikasi eskalasi kedua.
      const ulang = await jalankanOutbox({
        sekarang: new Date(t0.getTime() + 60 * 60 * 1000),
        kirim: () => ({ berhasil: true }),
      })
      expect(ulang.diproses).toBe(0)
      expect(await db.notification.count({
        where: { userId: adminUtama.id, groupKey: 'outbox:gagal:EMAIL' },
      })).toBe(1)

      const ditindaklanjuti = await tandaiOutboxDitindaklanjuti({
        id: final!.id,
        actorId: adminUtama.id,
        peran: 'ADMIN_UTAMA',
        catatan: 'Sudah dihubungi via telepon',
      })
      expect(ditindaklanjuti.status).toBe('DITINDAKLANJUTI')
      const audit = await db.adminAuditLog.findFirst({
        where: { targetEntity: 'NotificationOutbox', targetId: final!.id },
      })
      expect(audit?.action).toBe('TINDAK_LANJUT_OUTBOX_GAGAL')
    } finally {
      await db.notification.deleteMany({ where: { userId: { in: idUsers } } })
      await db.notificationOutbox.deleteMany({ where: { userId: { in: idUsers } } })
      for (const id of idUsers) {
        await db.user.delete({ where: { id } }).catch(() => undefined)
      }
    }
  }, 60000)
})
