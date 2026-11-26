// src/app/api/qris/gambar/[id]/route.ts
// Melayani gambar QRIS dari penyimpanan privat. Tidak ada berkas di folder public.

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
    const qris = await prisma().qrisConfig.findUnique({
      where: { id },
      select: { storageName: true },
    })
    if (!qris) {
      return NextResponse.json({ error: 'Gambar QRIS tidak ditemukan' }, { status: 404 })
    }

    const isi = await bacaBerkas('qris', qris.storageName)
    if (!isi) {
      return NextResponse.json({ error: 'Berkas QRIS tidak tersedia' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(isi), {
      headers: {
        'Content-Type': mimeDariNama(qris.storageName),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('API GET /api/qris/gambar/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memuat gambar QRIS' }, { status: 500 })
  }
}
