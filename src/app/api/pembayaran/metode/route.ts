// src/app/api/pembayaran/metode/route.ts
// Customer mengajukan/membatalkan perubahan metode pembayaran (FR-PAY-004).
// Hanya pengajuan yang menunggu keputusan yang menjeda timer (BR-016).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { jedaTimer, lanjutkanTimer } from '@/lib/pembayaran'
import { catatRiwayatStatus, notifikasiAdmins } from '@/lib/pembayaranServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return gagal('Anda harus login sebagai Customer', 401)
    }

    const body = await request.json().catch(() => null)
    if (!body) return gagal('Data pengajuan tidak valid', 400)

    const aksi = String(body.action || 'AJUKAN').toUpperCase()
    const orderId = String(body.orderId || '')
    if (!orderId) return gagal('Pesanan wajib dipilih', 400)

    const sekarang = new Date()
    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')

        const order = await tx.order.findUnique({ where: { id: orderId } })
        if (!order || order.customerId !== user.id) {
          throw new Error('Pesanan tidak ditemukan atau bukan milik Anda')
        }
        if (order.orderStatus !== 'MENUNGGU_PEMBAYARAN') {
          throw new Error('Pesanan tidak dalam status Menunggu Pembayaran')
        }

        if (aksi === 'BATAL') {
          if (order.methodChangeStatus !== 'MENUNGGU_PERSETUJUAN') {
            throw new Error('Tidak ada pengajuan ubah metode yang menunggu')
          }
          const lanjut = lanjutkanTimer({
            paymentDeadline: order.paymentDeadline,
            sekarang,
            pausedRemainingSeconds: order.pausedRemainingSeconds,
            pausedAt: order.pausedAt,
          })
          await tx.paymentMethodChangeRequest.updateMany({
            where: { orderId, status: 'MENUNGGU_PERSETUJUAN' },
            data: { status: 'DIBATALKAN', decidedAt: sekarang },
          })
          await tx.order.update({
            where: { id: orderId },
            data: {
              methodChangeStatus: 'DIBATALKAN',
              methodChangeTo: null,
              methodChangeReason: null,
              methodChangeDecidedAt: sekarang,
              ...lanjut,
            },
          })
          return { dibatalkan: true, sisaDetik: lanjut.paymentDeadline }
        }

        if (aksi !== 'AJUKAN') throw new Error('Aksi tidak dikenali')
        if (order.methodChangeStatus === 'MENUNGGU_PERSETUJUAN') {
          throw new Error('Masih ada pengajuan ubah metode yang menunggu keputusan')
        }
        if (order.paymentProofStatus === 'TERVERIFIKASI') {
          throw new Error('Pembayaran sudah disetujui; ubah metode hanya melalui koreksi Admin Utama')
        }

        const metodeBaru = String(body.metodeBaru || '')
        if (metodeBaru !== 'QRIS' && metodeBaru !== 'TUNAI_CFD') {
          throw new Error('Metode pembayaran tidak valid')
        }
        if (metodeBaru === order.paymentMethod) {
          throw new Error('Metode pembayaran tidak berubah')
        }

        const jeda = jedaTimer({
          paymentDeadline: order.paymentDeadline,
          sekarang,
          pausedRemainingSeconds: order.pausedRemainingSeconds,
          pausedAt: order.pausedAt,
        })

        await tx.paymentMethodChangeRequest.create({
          data: {
            orderId,
            requestedById: user.id,
            fromMethod: order.paymentMethod,
            toMethod: metodeBaru,
            reason: String(body.alasan || '').slice(0, 300) || null,
            status: 'MENUNGGU_PERSETUJUAN',
          },
        })
        await tx.order.update({
          where: { id: orderId },
          data: {
            methodChangeStatus: 'MENUNGGU_PERSETUJUAN',
            methodChangeTo: metodeBaru,
            methodChangeReason: String(body.alasan || '').slice(0, 300) || null,
            methodChangeRequestedAt: sekarang,
            methodChangeDecidedAt: null,
            methodChangeDecidedById: null,
            pausedRemainingSeconds: jeda.pausedRemainingSeconds,
            pausedAt: jeda.pausedAt,
          },
        })

        await catatRiwayatStatus({
          orderId,
          domain: 'PAYMENT',
          oldStatus: order.paymentProofStatus,
          newStatus: order.paymentProofStatus,
          reason: `Pengajuan ubah metode ke ${metodeBaru}; hitung mundur dijeda`,
          actorId: user.id,
          actorRole: 'CUSTOMER',
          client: tx,
        })

        await notifikasiAdmins({
          groupKey: `metode:diubah:${orderId}:${sekarang.getTime()}`,
          message: `Customer mengajukan perubahan metode pembayaran pesanan ${order.orderNumber} menjadi ${metodeBaru}.`,
          client: tx,
        })

        return {
          dibatalkan: false,
          sisaDetik: jeda.pausedRemainingSeconds,
          pesan: 'Pengajuan dikirim. Hitung mundur pembayaran dijeda sampai ada keputusan.',
        }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({ success: true, ...hasil })
  } catch (error: any) {
    console.error('API POST /api/pembayaran/metode error:', error)
    return gagal(error?.message || 'Gagal memproses pengajuan metode', 409)
  }
}
