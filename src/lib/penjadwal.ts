// src/lib/penjadwal.ts
// Pekerjaan terjadwal persisten (BR-025): auto-cancel atomik & pengingat 2 jam.
// Status pekerjaan disimpan di database sehingga tahan terhadap restart server/container.

import prisma from '@/lib/prisma'
import { bolehAutoCancel } from '@/lib/pembayaran'
import {
  buatNotifikasi,
  catatAudit,
  catatRiwayatStatus,
  selesaikanReminder,
} from '@/lib/pembayaranServer'

const ALASAN_AUTO_CANCEL = 'Batas Waktu Pembayaran Terlewati'

type BarisOrder = {
  id: string
  orderNumber: string
  orderStatus: string
  paymentDeadline: Date
  paymentProofStatus: string
  paymentReviewStatus: string
  pausedRemainingSeconds: number | null
  pausedAt: Date | null
  stockReleased: boolean
  autoCancelled: boolean
  customerId: string
}

/** Batalkan pesanan lewat tenggat tanpa bukti. Stok dilepas tepat satu kali. */
export async function jalankanAutoCancel(sekarang: Date = new Date()): Promise<number> {
  const client = prisma()
  const kandidat = await client.order.findMany({
    where: {
      orderStatus: 'MENUNGGU_PEMBAYARAN',
      paymentDeadline: { lte: sekarang },
      stockReleased: false,
      autoCancelled: false,
    },
    select: {
      id: true,
      orderNumber: true,
      orderStatus: true,
      paymentDeadline: true,
      paymentProofStatus: true,
      paymentReviewStatus: true,
      pausedRemainingSeconds: true,
      pausedAt: true,
      stockReleased: true,
      autoCancelled: true,
      customerId: true,
    },
    take: 100,
  }) as unknown as BarisOrder[]

  let dibatalkan = 0

  for (const kandidatOrder of kandidat) {
    const berhasil = await client.$transaction(
      async (tx: any) => {
        // Kunci baris order: sinkron dengan unggah bukti yang memakai kunci yang sama.
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${kandidatOrder.id} FOR UPDATE
        `
        if (terkunci.length === 0) return false

        const order = await tx.order.findUnique({ where: { id: kandidatOrder.id } })
        if (!order || order.orderStatus !== 'MENUNGGU_PEMBAYARAN') return false

        const alokasi = await tx.orderPaymentAllocation.findMany({
          where: { orderId: order.id },
          select: { paymentEvidenceId: true },
        })
        const bukti = alokasi.length
          ? await tx.paymentEvidence.findMany({
              where: {
            id: {
              in: alokasi.map(
                (a: { paymentEvidenceId: string }) => a.paymentEvidenceId
              ),
            },
          },
              select: { uploadedAt: true },
            })
          : []
        const daftarBukti = bukti as Array<{ uploadedAt: Date }>
        const uploadTerakhir = daftarBukti.reduce<Date | null>((terbaru, item) => {
          if (!terbaru || item.uploadedAt.getTime() > terbaru.getTime()) {
            return item.uploadedAt
          }
          return terbaru
        }, null)

        if (
          !bolehAutoCancel({
            orderStatus: order.orderStatus,
            paymentDeadline: order.paymentDeadline,
            sekarang,
            uploadedAt: uploadTerakhir,
            pausedAt: order.pausedAt,
            pausedRemainingSeconds: order.pausedRemainingSeconds,
            stockReleased: order.stockReleased,
            autoCancelled: order.autoCancelled,
          })
        ) {
          return false
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'DIBATALKAN',
            cancelReason: ALASAN_AUTO_CANCEL,
            autoCancelled: true,
            stockReleased: true,
            paymentReviewStatus: 'DITOLAK_FINAL',
            paymentRejectReason: ALASAN_AUTO_CANCEL,
          },
        })

        const items = await tx.orderItem.findMany({ where: { orderId: order.id } })
        for (const item of [...items].sort((a, b) => a.bookId.localeCompare(b.bookId))) {
          const bukuTerkunci = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "Book" WHERE id = ${item.bookId} FOR UPDATE
          `
          if (bukuTerkunci.length === 0) continue

          const buku = await tx.book.findUnique({ where: { id: item.bookId } })
          if (!buku) continue

          const dilepas = Math.min(item.quantity, Math.max(0, buku.stockReserved))
          if (dilepas > 0) {
            await tx.book.update({
              where: { id: buku.id },
              data: { stockReserved: { decrement: dilepas } },
            })
            await tx.stockMovement.create({
              data: {
                bookId: buku.id,
                type: 'MASUK',
                quantity: dilepas,
                reason: `Auto-cancel pesanan ${order.orderNumber}`,
                createdBy: 'SYSTEM',
              },
            })
          }
        }

        await catatRiwayatStatus({
          orderId: order.id,
          domain: 'ORDER',
          oldStatus: 'MENUNGGU_PEMBAYARAN',
          newStatus: 'DIBATALKAN',
          reason: ALASAN_AUTO_CANCEL,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          client: tx,
        })

        await catatAudit({
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'AUTO_CANCEL_PEMBAYARAN',
          targetEntity: 'Order',
          targetId: order.id,
          oldValue: { orderStatus: 'MENUNGGU_PEMBAYARAN' },
          newValue: { orderStatus: 'DIBATALKAN', alasan: ALASAN_AUTO_CANCEL },
          reason: ALASAN_AUTO_CANCEL,
          client: tx,
        })

        await buatNotifikasi({
          userId: order.customerId,
          groupKey: `auto-cancel:${order.id}`,
          message: `Pesanan ${order.orderNumber} dibatalkan otomatis karena batas waktu pembayaran terlewati.`,
          client: tx,
        })

        await selesaikanReminder({
          orderId: order.id,
          types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN'],
          client: tx,
        })

        return true
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )
    if (berhasil) dibatalkan += 1
  }

  return dibatalkan
}

/** Pengingat 2 jam: anti-duplikasi via groupKey dan tetap jalan setelah restart. */
export async function jalankanPengingat(sekarang: Date = new Date()): Promise<number> {
  const client = prisma()
  const reminders = await client.scheduledReminder.findMany({
    where: { isResolved: false, nextRunAt: { lte: sekarang } },
    orderBy: { nextRunAt: 'asc' },
    take: 100,
  })

  let terkirim = 0

  for (const reminder of reminders) {
    if (!reminder.orderId) {
      await client.scheduledReminder.update({
        where: { id: reminder.id },
        data: { isResolved: true },
      })
      continue
    }

    const order = await client.order.findUnique({ where: { id: reminder.orderId } })
    if (!order) {
      await client.scheduledReminder.update({
        where: { id: reminder.id },
        data: { isResolved: true },
      })
      continue
    }

    const masihPerlu =
      reminder.type === 'PENGINGAT_BUKTI'
        ? order.paymentProofStatus === 'MENUNGGU_VERIFIKASI'
        : order.paymentReviewStatus === 'MENUNGGU_PUTUSAN_UTAMA'

    if (!masihPerlu) {
      await selesaikanReminder({
        orderId: order.id,
        types: [reminder.type as 'PENGINGAT_BUKTI' | 'PENGINGAT_PUTUSAN'],
      })
      continue
    }

    const langkah = (order.reminderStep || 0) + 1
    const groupKey = `pengingat:${reminder.type}:${order.id}:${langkah}`
    const pesan =
      reminder.type === 'PENGINGAT_BUKTI'
        ? `Pengingat: bukti pembayaran pesanan ${order.orderNumber} belum diperiksa.`
        : `Pengingat: putusan final pembayaran pesanan ${order.orderNumber} belum diambil.`

    const penerima = await client.user.findMany({
      where: {
        role:
          reminder.type === 'PENGINGAT_PUTUSAN'
            ? 'ADMIN_UTAMA'
            : { in: ['ADMIN_BIASA', 'ADMIN_UTAMA'] },
        isActive: true,
      },
      select: { id: true },
    })

    for (const admin of penerima) {
      const dibuat = await buatNotifikasi({
        userId: admin.id,
        groupKey: `${groupKey}:${admin.id}`,
        message: pesan,
      })
      if (dibuat) terkirim += 1
    }

    await client.order.update({
      where: { id: order.id },
      data: { reminderStep: langkah },
    })
    await client.scheduledReminder.update({
      where: { id: reminder.id },
      data: { nextRunAt: new Date(sekarang.getTime() + 2 * 60 * 60 * 1000) },
    })
  }

  return terkirim
}

export async function jalankanTugasPembayaran(
  sekarang: Date = new Date()
): Promise<{ dibatalkan: number; pengingat: number }> {
  const dibatalkan = await jalankanAutoCancel(sekarang)
  const pengingat = await jalankanPengingat(sekarang)
  return { dibatalkan, pengingat }
}

/** Interval in-process; statusnya tetap berasal dari database sehingga aman restart. */
export function mulaiPenjadwalPembayaran(): void {
  const globalData = globalThis as unknown as Record<string, unknown>
  if (globalData.__akiraPenjadwalPembayaran) return
  globalData.__akiraPenjadwalPembayaran = true

  const interval = setInterval(() => {
    jalankanTugasPembayaran().catch((error) => {
      console.error('[PENJADWAL PEMBAYARAN] gagal:', error)
    })
  }, 60_000)
  ;(interval as unknown as { unref?: () => void }).unref?.()
  globalData.__akiraPenjadwalInterval = interval
  console.log('[PENJADWAL PEMBAYARAN] aktif (auto-cancel + pengingat 2 jam)')
}
