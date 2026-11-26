// src/app/api/pembayaran/bukti/[id]/route.ts
// Akses berkas bukti yang diamankan (AC-PAY-002).
// Customer hanya dapat melihat bukti yang teralokasi ke pesanan miliknya; admin berwenang boleh.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { bacaBerkas, mimeDariNama } from '@/lib/pembayaranServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }

    const { id } = await params
    const evidence = await prisma().paymentEvidence.findUnique({
      where: { id },
      select: { storageName: true },
    })
    if (!evidence) {
      return NextResponse.json({ error: 'Bukti tidak ditemukan' }, { status: 404 })
    }

    if (user.role === 'CUSTOMER') {
      // Model tidak mendefinisikan relasi Prisma; izin diperiksa eksplisit melalui alokasi.
      const daftar = await prisma().orderPaymentAllocation.findMany({
        where: { paymentEvidenceId: id },
        select: { orderId: true },
      })
      const milikSendiri = daftar.length
        ? await prisma().order.findFirst({
            where: { id: { in: daftar.map((a) => a.orderId) }, customerId: user.id },
            select: { id: true },
          })
        : null
      if (!milikSendiri) {
        return NextResponse.json({ error: 'Akses bukti ditolak' }, { status: 403 })
      }
    } else if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Akses bukti ditolak' }, { status: 403 })
    }

    const isi = await bacaBerkas('bukti', evidence.storageName)
    if (!isi) {
      return NextResponse.json({ error: 'Berkas bukti tidak tersedia' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(isi), {
      headers: {
        'Content-Type': mimeDariNama(evidence.storageName),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('API GET /api/pembayaran/bukti/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memuat bukti' }, { status: 500 })
  }
}
