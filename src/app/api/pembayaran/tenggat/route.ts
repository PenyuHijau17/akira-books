// src/app/api/pembayaran/tenggat/route.ts
// Customer mengajukan perpanjangan tenggat. Pengajuan TIDAK menjeda timer (BR-016).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { hitungTenggatPerpanjangan } from '@/lib/pembayaran'
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

    const orderId = String(body.orderId || '')
    const alasan = String(body.alasan || '').trim()
    const jamTambahan = Number(body.jamTambahan ?? 24)
    if (!orderId) return gagal('Pesanan wajib dipilih', 400)
    if (alasan.length < 3) return gagal('Alasan perpanjangan wajib diisi', 400)
    if (!Number.isFinite(jamTambahan) || jamTambahan <= 0 || jamTambahan > 168) {
      return gagal('Tambahan waktu harus antara 1 dan 168 jam', 400)
    }

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

        const sudahAda = await tx.paymentDeadlineExtension.findFirst({
          where: { orderId, status: 'MENUNGGU_PERSETUJUAN' },
        })
        if (sudahAda) {
          throw new Error('Masih ada pengajuan perpanjangan yang menunggu keputusan')
        }

        const tenggatDiajukan = hitungTenggatPerpanjangan(
          order.paymentDeadline,
          jamTambahan,
          sekarang
        )

        await tx.paymentDeadlineExtension.create({
          data: {
            orderId,
            requestedById: user.id,
            oldDeadline: order.paymentDeadline,
            proposedDeadline: tenggatDiajukan,
            reason: alasan.slice(0, 300),
            status: 'MENUNGGU_PERSETUJUAN',
          },
        })

        await catatRiwayatStatus({
          orderId,
          domain: 'PAYMENT',
          oldStatus: order.paymentProofStatus,
          newStatus: order.paymentProofStatus,
          reason: `Pengajuan perpanjangan tenggat ${jamTambahan} jam (tidak menjeda timer)`,
          actorId: user.id,
          actorRole: 'CUSTOMER',
          client: tx,
        })

        await notifikasiAdmins({
          groupKey: `tenggat:pengajuan:${orderId}:${sekarang.getTime()}`,
          message: `Customer mengajukan perpanjangan tenggat ${jamTambahan} jam untuk pesanan ${order.orderNumber}.`,
          client: tx,
        })

        return { orderId, oldDeadline: order.paymentDeadline, proposedDeadline: tenggatDiajukan }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({
      success: true,
      pesan: 'Pengajuan perpanjangan dikirim. Hitung mundur tetap berjalan.',
      pengajuan: hasil,
    })
  } catch (error: any) {
    console.error('API POST /api/pembayaran/tenggat error:', error)
    return gagal(error?.message || 'Gagal mengajukan perpanjangan', 409)
  }
}
