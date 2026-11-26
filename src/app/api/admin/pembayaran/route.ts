// src/app/api/admin/pembayaran/route.ts
// Daftar antrean pembayaran untuk Admin Biasa & Admin Utama.
// GR-03: Admin Biasa tidak menerima field modal/laba maupun alasan sensitif tertentu.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { saringDataAdminBiasa } from '@/lib/pembayaran'
import { ambilBuktiTerkini } from '@/lib/pembayaranServer'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const orders = await prisma().order.findMany({
      where: {
        OR: [
          { paymentProofStatus: { in: ['MENUNGGU_VERIFIKASI', 'PERLU_BUKTI_BARU'] } },
          {
            paymentReviewStatus: {
              in: [
                'MENUNGGU_PUTUSAN_UTAMA',
                'DIKEMBALIKAN_KE_PEMERIKSA',
                'DIAMBIL_ALIH_UTAMA',
              ],
            },
          },
          { methodChangeStatus: 'MENUNGGU_PERSETUJUAN' },
          { orderStatus: 'MENUNGGU_PEMBAYARAN' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentProofStatus: true,
        paymentReviewStatus: true,
        paymentReviewerId: true,
        paymentRejectedCount: true,
        paymentRejectReason: true,
        proofRequestReason: true,
        proofDeadline: true,
        paymentDeadline: true,
        paymentMethod: true,
        totalAmount: true,
        pausedAt: true,
        pausedRemainingSeconds: true,
        methodChangeStatus: true,
        methodChangeTo: true,
        methodChangeReason: true,
        reminderStep: true,
        createdAt: true,
      },
    })

    const daftar = []
    for (const order of orders) {
      const bukti = await ambilBuktiTerkini(order.id)
      const item = {
        ...order,
        bukti: bukti
          ? {
              id: bukti.id,
              imageUrl: bukti.imageUrl,
              status: bukti.status,
              amount: bukti.amount,
              isLatest: bukti.isLatest,
              rejectionCount: bukti.rejectionCount,
              uploadedAt: bukti.uploadedAt,
            }
          : null,
      }
      daftar.push(user.role === 'ADMIN_BIASA' ? saringDataAdminBiasa(item) : item)
    }

    const ringkasan = {
      menungguPemeriksaan: orders.filter((o) => o.paymentProofStatus === 'MENUNGGU_VERIFIKASI').length,
      menungguPutusan: orders.filter((o) => o.paymentReviewStatus === 'MENUNGGU_PUTUSAN_UTAMA').length,
      perluTindakan: orders.filter((o) => o.paymentReviewStatus === 'DIKEMBALIKAN_KE_PEMERIKSA').length,
      pengajuanUbahMetode: orders.filter((o) => o.methodChangeStatus === 'MENUNGGU_PERSETUJUAN').length,
    }

    return NextResponse.json({
      daftar,
      ringkasan,
      hakAkses: {
        bisaPutusFinal: user.role === 'ADMIN_UTAMA',
        bisaKoreksi: user.role === 'ADMIN_UTAMA',
      },
    })
  } catch (error: any) {
    console.error('API GET /api/admin/pembayaran error:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar pembayaran' }, { status: 500 })
  }
}
