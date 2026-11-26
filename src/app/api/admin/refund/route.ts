// src/app/api/admin/refund/route.ts
// Modul Refund terpisah dari status pembatalan (FR-RFD-001, BR-006, BR-020).
// Admin Biasa/Utama dapat melihat; hanya Admin Utama yang memproses/menyetujui.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { METODE_REFUND } from '@/lib/pembatalan'
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
  refundStatus: true,
  refundNominal: true,
  paidAt: true,
  totalAmount: true,
  paymentProofStatus: true,
  cancelledAt: true,
  cancelReason: true,
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
      where: {
        orderStatus: 'DIBATALKAN',
        refundStatus: { in: ['PERLU_DIPROSES', 'DIKEMBALIKAN_SEBAGIAN', 'SELESAI'] },
      },
      orderBy: { cancelledAt: 'desc' },
      take: 100,
      select: PILIHAN_ORDER,
    })
    const daftar = await Promise.all(
      orders.map(async (order: any) => ({
        ...order,
        ringkasanRefund: await ringkasanRefundOrder(db, order),
      }))
    )

    return NextResponse.json(
      saringFieldModal({
        daftar,
        ringkasan: {
          perluDiproses: daftar.filter((o: any) => o.refundStatus === 'PERLU_DIPROSES').length,
          sebagian: daftar.filter((o: any) => o.refundStatus === 'DIKEMBALIKAN_SEBAGIAN').length,
          selesai: daftar.filter((o: any) => o.refundStatus === 'SELESAI').length,
        },
        metode: METODE_REFUND,
        hakAkses: {
          bisaAjukan: user.role === 'ADMIN_BIASA' || user.role === 'ADMIN_UTAMA',
          bisaMemproses: user.role === 'ADMIN_UTAMA',
        },
      })
    )
  } catch (error: any) {
    console.error('API GET /api/admin/refund error:', error)
    return gagal(error?.message || 'Gagal memuat daftar refund', 500)
  }
}
