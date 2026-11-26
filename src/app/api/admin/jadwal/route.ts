// src/app/api/admin/jadwal/route.ts
// Antrean jadwal pengambilan untuk Admin Biasa & Admin Utama (Tahap 9).
// GR-02: otorisasi server. GR-03: tidak ada field modal/laba.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { daftarTanggalMinggu } from '@/lib/jadwal'
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
  pickupStatus: true,
  pickupSundayDate: true,
  pickupGroupId: true,
  noShowAt: true,
  noShowHoldDeadline: true,
  noShowReason: true,
  noShowCount: true,
  completedAt: true,
  stockSold: true,
  totalAmount: true,
  paymentMethod: true,
  createdAt: true,
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Silakan masuk terlebih dahulu', 401)
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return gagal('Akses ditolak', 403)
    }

    const orders = await prisma().order.findMany({
      where: {
        pickupStatus: { in: ['MENUNGGU_KONFIRMASI', 'PERUBAHAN_MENUNGGU_PERSETUJUAN', 'TIDAK_HADIR'] },
        orderStatus: { notIn: ['SELESAI', 'DIBATALKAN'] },
      },
      orderBy: [{ pickupSundayDate: 'asc' }, { createdAt: 'asc' }],
      select: PILIHAN_ORDER,
    })

    const siapSelesai = await prisma().order.findMany({
      where: {
        orderStatus: { in: ['MENUNGGU_DIAMBIL', 'SUDAH_DIBAYAR'] },
        paymentProofStatus: 'TERVERIFIKASI',
        stockSold: false,
      },
      orderBy: { pickupSundayDate: 'asc' },
      select: PILIHAN_ORDER,
      take: 50,
    })

    const ids = [...new Set([...orders, ...siapSelesai].map((o) => o.id))]
    const usulan = ids.length
      ? await prisma().jadwalPerubahan.findMany({
          where: { orderId: { in: ids }, status: 'MENUNGGU_PERSETUJUAN' },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : []

    const daftar = [...orders, ...siapSelesai]
      .filter((order, indeks, semua) => semua.findIndex((o) => o.id === order.id) === indeks)
      .map((order) => ({
        ...order,
        usulan: usulan.filter((u) => u.orderId === order.id)[0] || null,
      }))

    const ringkasan = {
      menungguKonfirmasi: orders.filter((o) => o.pickupStatus === 'MENUNGGU_KONFIRMASI').length,
      perubahan: orders.filter((o) => o.pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN').length,
      tidakHadir: orders.filter((o) => o.pickupStatus === 'TIDAK_HADIR').length,
      siapSelesai: siapSelesai.length,
    }

    return NextResponse.json(
      saringFieldModal({
        daftar,
        ringkasan,
        daftarMinggu: daftarTanggalMinggu(),
        hakAkses: { bisaSelesaikan: true },
      })
    )
  } catch (error: any) {
    console.error('API GET /api/admin/jadwal error:', error)
    return gagal(error?.message || 'Gagal memuat antrean jadwal', 500)
  }
}
