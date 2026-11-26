import { describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import { jalankanPengingat } from '@/lib/penjadwal'
import {
  jadwalPengingatBerikutnya,
  kunciPengingat,
  langkahPengingat,
  penilaianPengingat,
  pesanPengingat,
} from '@/lib/pengingat'

/**
 * Tahap 12 — pengingat 2 jam persisten (BR-025).
 * Langkah dihitung dari data tersimpan sehingga tetap berjalan setelah restart
 * dan segera berhenti setelah keputusan diambil.
 */
describe('Tahap 12 — pengingat persisten 2 jam', () => {
  it('menyelaraskan jadwal WIB dan menghitung langkah tanpa memori proses', () => {
    const t0 = new Date('2026-11-28T00:30:00.000Z') // 07.30 WIB
    expect(jadwalPengingatBerikutnya(t0).toISOString()).toBe('2026-11-28T01:00:00.000Z')

    const dibuat = new Date('2026-11-28T00:00:00.000Z')
    expect(langkahPengingat(dibuat, new Date(dibuat.getTime() + 10 * 60 * 1000))).toBe(1)
    expect(langkahPengingat(dibuat, new Date(dibuat.getTime() + 2 * 60 * 60 * 1000))).toBe(2)
    expect(langkahPengingat(dibuat, new Date(dibuat.getTime() + 5 * 60 * 60 * 1000))).toBe(3)

    expect(kunciPengingat('order-1', 'PENGINGAT_BUKTI', 1)).toBe(
      'pengingat:PENGINGAT_BUKTI:order-1:1'
    )
    expect(pesanPengingat('PENGINGAT_JADWAL', 'AB-001')).toContain('jadwal')

    const dasar = {
      type: 'PENGINGAT_BUKTI' as const,
      paymentProofStatus: 'MENUNGGU_VERIFIKASI',
    }
    expect(penilaianPengingat(dasar).masihPerlu).toBe(true)
    expect(penilaianPengingat({ ...dasar, paymentProofStatus: 'TERVERIFIKASI' }).harusBerhenti).toBe(true)
    expect(penilaianPengingat({ ...dasar, orderStatus: 'DIBATALKAN' }).harusBerhenti).toBe(true)
    expect(penilaianPengingat({ ...dasar, orderStatus: 'SELESAI' }).harusBerhenti).toBe(true)
    expect(
      penilaianPengingat({
        type: 'PENGINGAT_JADWAL',
        pickupStatus: 'DISETUJUI',
      }).harusBerhenti
    ).toBe(true)
  })

  it('lanjut setelah restart dan berhenti setelah bukti diputuskan (database nyata)', async () => {
    const db = prisma()
    const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const customer = await db.user.create({
      data: { email: `pengingat-cust-${unik}@example.test`, passwordHash: 'x', name: 'Customer Pengingat', role: 'CUSTOMER' },
    })
    const admin = await db.user.create({
      data: { email: `pengingat-admin-${unik}@example.test`, passwordHash: 'x', name: 'Admin Pengingat', role: 'ADMIN_BIASA' },
    })
    const t0 = new Date('2026-11-28T07:00:00.000Z')
    const order = await db.order.create({
      data: {
        orderNumber: `PG-${unik}`,
        idempotencyKey: `pengingat-${unik}`,
        customerId: customer.id,
        customerUserId: customer.id,
        orderStatus: 'MENUNGGU_PEMBAYARAN',
        paymentProofStatus: 'MENUNGGU_VERIFIKASI',
        paymentReviewStatus: 'BELUM_DIPERIKSA',
        pickupStatus: 'MENUNGGU_KONFIRMASI',
        refundStatus: 'TIDAK_BERLAKU',
        paymentMethod: 'QRIS',
        pickupSundayDate: new Date('2026-12-06T02:00:00.000Z'),
        paymentDeadline: new Date(t0.getTime() + 24 * 60 * 60 * 1000),
        totalAmount: 50000,
      },
    })
    const reminder = await db.scheduledReminder.create({
      data: {
        orderId: order.id,
        orderOrderId: order.id,
        type: 'PENGINGAT_BUKTI',
        jobKey: `uji-pengingat:${unik}`,
        intervalMenit: 120,
        zonaWaktu: 'Asia/Jakarta',
        nextRunAt: t0,
        isResolved: false,
        createdAt: t0,
      },
    })

    try {
      const pertama = await jalankanPengingat(t0)
      expect(pertama).toBeGreaterThanOrEqual(1)
      const notifPertama = await db.notification.findMany({
        where: { userId: admin.id, message: { contains: unik } },
      })
      expect(notifPertama).toHaveLength(1)
      expect(notifPertama[0].groupKey).toContain(':1')
      expect((await db.order.findUnique({ where: { id: order.id } }))?.reminderStep).toBe(1)

      // Dipanggil lagi pada waktu yang sama: belum jatuh tempo, tidak mengirim ganda.
      await jalankanPengingat(t0)
      expect(await db.notification.count({ where: { userId: admin.id, message: { contains: unik } } })).toBe(1)

      // Simulasikan restart: proses baru membaca antrean dari database.
      const setelahRestart = await jalankanPengingat(new Date(t0.getTime() + 2 * 60 * 60 * 1000))
      expect(setelahRestart).toBeGreaterThanOrEqual(1)
      const notifKedua = await db.notification.findMany({
        where: { userId: admin.id, message: { contains: unik } },
      })
      expect(notifKedua).toHaveLength(2)
      expect(notifKedua.some((n) => n.groupKey.includes(':2'))).toBe(true)
      const antrean = await db.scheduledReminder.findUnique({ where: { id: reminder.id } })
      expect(antrean?.terakhirDijalankan?.getTime()).toBe(t0.getTime() + 2 * 60 * 60 * 1000)

      // Keputusan dibuat → pengingat harus segera berhenti.
      await db.order.update({
        where: { id: order.id },
        data: { paymentProofStatus: 'TERVERIFIKASI', orderStatus: 'SUDAH_DIBAYAR' },
      })
      await jalankanPengingat(new Date(t0.getTime() + 4 * 60 * 60 * 1000))
      expect((await db.scheduledReminder.findUnique({ where: { id: reminder.id } }))?.isResolved).toBe(true)
      expect(await db.notification.count({ where: { userId: admin.id, message: { contains: unik } } })).toBe(2)
    } finally {
      await db.notification.deleteMany({ where: { message: { contains: unik } } })
      await db.notificationOutbox.deleteMany({ where: { message: { contains: unik } } })
      await db.scheduledReminder.deleteMany({ where: { jobKey: { contains: unik } } })
      await db.order.deleteMany({ where: { idempotencyKey: `pengingat-${unik}` } })
      await db.user.delete({ where: { id: customer.id } }).catch(() => undefined)
      await db.user.delete({ where: { id: admin.id } }).catch(() => undefined)
    }
  }, 60000)
})
