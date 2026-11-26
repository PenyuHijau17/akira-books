// src/app/api/pembatalan/route.ts
// Pembatalan pesanan oleh Customer pemilik pesanan (FR-CAN-001).
// Hanya boleh sebelum pembayaran disetujui final; stok tertahan dilepaskan tepat 1x.
// GR-02/GR-03: otorisasi & isolasi data di server, tanpa field modal/laba.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { penilaianPembatalan } from '@/lib/pembatalan'
import { lepaskanStokTertahan, notifikasiPembatalan } from '@/lib/pembatalanServer'
import { tutupUsulanTertunda } from '@/lib/jadwalServer'
import { catatRiwayatStatus, selesaikanReminder } from '@/lib/pembayaranServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') return gagal('Tidak diizinkan', 401)

    const body = await request.json().catch(() => null)
    const orderId = String(body?.orderId || '').trim()
    if (!orderId) return gagal('Identifier pesanan wajib diisi', 400)

    const alasan = String(body?.alasan || '').trim() || 'Customer membatalkan pesanan sendiri'
    const sekarang = new Date()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) return { sudahDibatalkan: true, pesanan: null }

        const order = await tx.order.findFirst({
          where: { id: orderId, customerId: user.id },
          select: {
            id: true,
            orderNumber: true,
            customerId: true,
            orderStatus: true,
            paymentProofStatus: true,
            paymentReviewStatus: true,
            paidAt: true,
            stockReleased: true,
            cancelReason: true,
          },
        })
        if (!order) return { sudahDibatalkan: true, pesanan: null }

        if (order.orderStatus === 'DIBATALKAN') {
          return {
            sudahDibatalkan: true,
            pesanan: {
              id: order.id,
              orderStatus: order.orderStatus,
              stockReleased: order.stockReleased,
              cancelReason: order.cancelReason,
            },
          }
        }

        const penilaian = penilaianPembatalan({
          peran: 'CUSTOMER',
          orderStatus: order.orderStatus,
          paymentProofStatus: order.paymentProofStatus,
          paymentReviewStatus: order.paymentReviewStatus,
          paidAt: order.paidAt,
        })
        if (!penilaian.boleh) throw new Error(penilaian.alasan || 'Pembatalan ditolak')
        if (order.stockReleased) {
          throw new Error('Stok pesanan ini sudah dilepaskan sebelumnya')
        }

        const stok = await lepaskanStokTertahan({
          client: tx,
          order: { id: order.id, orderNumber: order.orderNumber },
          actorId: user.id,
          sekarang,
          alasan,
          stockReleased: order.stockReleased,
        })

        await tutupUsulanTertunda(tx, order.id, user.id, 'CUSTOMER', 'Pesanan dibatalkan customer')
        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'DIBATALKAN',
            cancelReason: alasan,
            cancelReasonTambahan: null,
            cancelledAt: sekarang,
            cancelledById: user.id,
            cancelledByRole: 'CUSTOMER',
            stockReleased: true,
            stockReleasedAt: sekarang,
            stockReleasedById: user.id,
            refundStatus: 'TIDAK_BERLAKU',
            noShowHoldDeadline: null,
          },
        })
        await catatRiwayatStatus({
          orderId: order.id,
          domain: 'ORDER',
          oldStatus: order.orderStatus,
          newStatus: 'DIBATALKAN',
          reason: alasan,
          actorId: user.id,
          actorRole: 'CUSTOMER',
          client: tx,
        })
        await selesaikanReminder({
          orderId: order.id,
          types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN', 'PENGINGAT_JADWAL'],
          client: tx,
        })

        const keteranganStok =
          stok.dilewati.length > 0
            ? `Stok dikembalikan untuk ${stok.rilis.length} judul aktif; ${stok.dilewati.length} judul dilewati karena buku tidak aktif.`
            : `Stok tertahan dikembalikan untuk ${stok.rilis.length} judul.`
        await notifikasiPembatalan({
          client: tx,
          customerId: order.customerId,
          orderNumber: order.orderNumber,
          actorName: user.name || user.email,
          sekarang,
          alasan,
          keteranganStok,
        })

        const terkini = await tx.order.findUnique({
          where: { id: order.id },
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            refundStatus: true,
            cancelReason: true,
            stockReleased: true,
            cancelledAt: true,
          },
        })
        return { sudahDibatalkan: false, pesanan: terkini, stok }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    if (hasil.sudahDibatalkan && !hasil.pesanan) return gagal('Pesanan tidak ditemukan', 404)
    return NextResponse.json({
      success: true,
      pesan: hasil.sudahDibatalkan
        ? 'Pesanan sudah dibatalkan sebelumnya. Tidak ada perubahan baru.'
        : 'Pesanan berhasil dibatalkan dan stok tertahan dikembalikan.',
      ...hasil,
    })
  } catch (error: any) {
    console.error('API POST /api/pembatalan error:', error)
    return gagal(error?.message || 'Gagal membatalkan pesanan', 409)
  }
}
