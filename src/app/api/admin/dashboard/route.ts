// src/app/api/admin/dashboard/route.ts
// Ringkasan operasional untuk Dashboard Admin (/admin).
// GR-02: sesi & peran divalidasi di server. GR-03: tidak ada field modal/laba.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  AMBANG_STOK_MENIPIS,
  daftarPintasanAdmin,
  hitungRingkasanBuku,
  saringRingkasanDashboardUntukPeran,
} from '@/lib/admin-dashboard'
import { daftarTanggalMinggu } from '@/lib/jadwal'
import { tanggalMingguKeDate } from '@/lib/pesanan'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function GET(request: Request) {
  try {
    const pengguna = await getSessionUser(request)
    if (!pengguna) return gagal('Silakan masuk terlebih dahulu', 401)
    if (pengguna.role !== 'ADMIN_BIASA' && pengguna.role !== 'ADMIN_UTAMA') {
      return gagal('Akses ditolak', 403)
    }

    const db = prisma()
    const mingguTerdekat = daftarTanggalMinggu(1)[0] ?? null
    const tanggalJadwal = mingguTerdekat ? tanggalMingguKeDate(mingguTerdekat) : null
    const statusAktif = { notIn: ['SELESAI', 'DIBATALKAN'] }

    const [pembayaran, jadwal, pembatalanRefund, buku, statusToko] = await Promise.all([
      // Sama dengan antrean /admin/pembayaran: bukti menunggu atau sudah perlu putusan.
      db.order.count({
        where: {
          orderStatus: statusAktif,
          OR: [
            { paymentProofStatus: { in: ['MENUNGGU_VERIFIKASI', 'PERLU_BUKTI_BARU'] } },
            {
              paymentReviewStatus: {
                in: ['MENUNGGU_PUTUSAN_UTAMA', 'DIKEMBALIKAN_KE_PEMERIKSA', 'DIAMBIL_ALIH_UTAMA'],
              },
            },
          ],
        },
      }),
      tanggalJadwal
        ? db.order.count({
            where: { orderStatus: statusAktif, pickupSundayDate: tanggalJadwal },
          })
        : Promise.resolve(0),
      // Pembatalan/refund aktif = refund belum selesai. Status refund disimpan terpisah (GR-05).
      db.order.count({
        where: {
          orderStatus: { not: 'SELESAI' },
          refundStatus: { in: ['PERLU_DIPROSES', 'DIKEMBALIKAN_SEBAGIAN'] },
        },
      }),
      // Select sengaja tanpa costPrice / snapshotCostPrice (GR-03).
      db.book.findMany({
        select: {
          status: true,
          stockTotal: true,
          stockReserved: true,
          mergedIntoBookId: true,
        },
      }),
      db.storeStatus.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { isOpen: true, activeClosureReason: true },
      }),
    ])

    const ringkasan = saringRingkasanDashboardUntukPeran(
      {
        ...hitungRingkasanBuku(buku),
        pembayaranMenungguVerifikasi: pembayaran,
        jadwalMingguTerdekat: jadwal,
        tanggalMingguTerdekat: mingguTerdekat,
        pembatalanRefundAktif: pembatalanRefund,
        tokoBuka: statusToko?.isOpen ?? true,
        alasanLibur: statusToko?.isOpen === false ? statusToko.activeClosureReason ?? null : null,
      },
      pengguna.role
    )

    return NextResponse.json({
      ringkasan,
      pintasan: daftarPintasanAdmin(pengguna.role),
      ambangStokMenipis: AMBANG_STOK_MENIPIS,
    })
  } catch (error: unknown) {
    console.error('API GET /api/admin/dashboard error:', error)
    return gagal('Gagal memuat ringkasan dashboard', 500)
  }
}
