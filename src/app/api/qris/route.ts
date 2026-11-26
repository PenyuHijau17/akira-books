// src/app/api/qris/route.ts
// QRIS aktif untuk halaman pembayaran Customer. Tidak mengungkap riwayat/akses admin.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }

    const aktif = await prisma().qrisConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imageUrl: true,
        keterangan: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      qris: aktif
        ? {
            ...aktif,
            pesan:
              'Transfer QRIS dilakukan di luar sistem. Unggah bukti transfer setelah pembayaran.',
          }
        : null,
    })
  } catch (error: any) {
    console.error('API GET /api/qris error:', error)
    return NextResponse.json({ error: 'Gagal memuat QRIS' }, { status: 500 })
  }
}
