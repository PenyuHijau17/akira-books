// src/app/api/admin/pembatalan/route.ts
// Antrean pembatalan & koreksi Selesai untuk Admin Biasa/Admin Utama (Tahap 10).
// GR-02: otorisasi server. GR-03: tidak ada field modal/laba. GR-06: audit append-only.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ringkasanRefundOrder } from '@/lib/pembatalanServer'
import { saringFieldModal } from '@/lib/pesanan'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

const PILIHAN_ORDER = {
  id: true,
  orderNumber: true,
  customerId: true,
  orderStatus: true,
  paymentProofStatus: true,
  paymentReviewStatus: true,
  paidAt: true,
  refundStatus: true,
  refundNominal: true,
  totalAmount: true,
  pickupStatus: true,
  pickupSundayDate: true,
  cancelledAt: true,
  cancelledById: true,
  cancelledByRole: true,
  cancelReason: true,
  cancelReasonTambahan: true,
  stockReleased: true,
  stockReleasedAt: true,
  stockSold: true,
  completedAt: true,
  koreksiSelesaiAt: true,
  koreksiSelesaiById: true,
  createdAt: true,
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Silakan masuk terlebih dahulu', 401)
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return gagal('Akses ditolak', 403)
    }

    const db = prisma()
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: PILIHAN_ORDER,
    })
    const daftar = await Promise.all(
      orders.map(async (order: any) => ({
        ...order,
        ringkasanRefund: await ringkasanRefundOrder(db, order),
      }))
    )

    const ringkasan = {
      aktif: daftar.filter((o: any) => !['DIBATALKAN', 'SELESAI'].includes(o.orderStatus)).length,
      dibatalkan: daftar.filter((o: any) => o.orderStatus === 'DIBATALKAN').length,
      selesai: daftar.filter((o: any) => o.orderStatus === 'SELESAI').length,
      perluRefund: daftar.filter((o: any) => o.refundStatus === 'PERLU_DIPROSES').length,
    }

    return NextResponse.json(
      saringFieldModal({
        daftar,
        ringkasan,
        hakAkses: { bisaKoreksi: user.role === 'ADMIN_UTAMA' },
      })
    )
  } catch (error: any) {
    console.error('API GET /api/admin/pembatalan error:', error)
    return gagal(error?.message || 'Gagal memuat daftar pembatalan', 500)
  }
}
