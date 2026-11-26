// src/app/api/pesanan/[id]/route.ts
// Detail satu pesanan. Hanya pemilik pesanan (Customer) yang boleh mengakses.
// GR-03: field modal/laba tidak pernah dikirim ke Customer.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { saringFieldModal } from '@/lib/pesanan'
import { daftarTanggalMinggu } from '@/lib/jadwal'
import {
  anggotaGrupJadwal,
  riwayatJadwalLengkap,
} from '@/lib/jadwalServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params

    const pesanan = await prisma().order.findFirst({
      where: { id, customerId: user.id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentProofStatus: true,
        pickupStatus: true,
        refundStatus: true,
        paymentMethod: true,
        pickupSundayDate: true,
        pickupGroupId: true,
        noShowAt: true,
        noShowHoldDeadline: true,
        noShowReason: true,
        noShowCount: true,
        completedAt: true,
        paymentDeadline: true,
        paymentReviewStatus: true,
        paymentRejectedCount: true,
        paymentRejectReason: true,
        proofRequestReason: true,
        proofDeadline: true,
        paidAt: true,
        paymentRecordedMethod: true,
        methodChangeStatus: true,
        methodChangeTo: true,
        methodChangeReason: true,
        methodChangeRequestedAt: true,
        pausedRemainingSeconds: true,
        pausedAt: true,
        cancelReason: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!pesanan) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    const orderItems = await prisma().orderItem.findMany({
      where: { orderId: pesanan.id },
      select: {
        id: true,
        bookId: true,
        quantity: true,
        snapshotCode: true,
        snapshotTitle: true,
        snapshotSellingPrice: true,
        subtotal: true,
      },
    })

    // Riwayat bukti (AC-PAY-002): hanya bukti milik pesanan ini yang dikirim.
    const alokasi = await prisma().orderPaymentAllocation.findMany({
      where: { orderId: pesanan.id },
      select: { paymentEvidenceId: true, allocatedAmount: true },
    })
    const idBukti = [...new Set(alokasi.map((a) => a.paymentEvidenceId))]
    const riwayatBukti = idBukti.length
      ? await prisma().paymentEvidence.findMany({
          where: { id: { in: idBukti } },
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            imageUrl: true,
            status: true,
            amount: true,
            isLatest: true,
            rejectionReason: true,
            proofRequestReason: true,
            uploadedAt: true,
          },
        })
      : []

    const [perubahanMetode, perpanjangan, riwayatJadwal, anggotaGabungan] = await Promise.all([
      prisma().paymentMethodChangeRequest.findMany({
        where: { orderId: pesanan.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma().paymentDeadlineExtension.findMany({
        where: { orderId: pesanan.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      riwayatJadwalLengkap(prisma(), pesanan.id),
      anggotaGrupJadwal(prisma(), pesanan),
    ])

    return NextResponse.json({
      pesanan: saringFieldModal({
        ...pesanan,
        orderItems,
        riwayatBukti,
        alokasi,
        perubahanMetode,
        perpanjangan,
        riwayatJadwal,
        anggotaGabungan,
      }),
      usulanJadwalTertunda: riwayatJadwal.find((u) => u.status === 'MENUNGGU_PERSETUJUAN') || null,
      daftarMinggu: daftarTanggalMinggu(),
    })
  } catch (error: any) {
    console.error('API GET /api/pesanan/[id] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal mengambil detail pesanan' },
      { status: 500 }
    )
  }
}
