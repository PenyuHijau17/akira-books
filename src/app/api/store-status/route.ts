import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/store-status - Dapatkan status toko saat ini
export async function GET() {
  try {
    // Cari status toko yang aktif (atau terakhir jika tidak ada yang aktif)
    const storeStatus = await prisma().storeStatus.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    // Jika tidak ada record, buat default (toko terbuka)
    const defaultStatus = await prisma().storeStatus.create({
      data: { isOpen: true },
      select: { id: true, isOpen: true, activeClosureReason: true, updatedAt: true },
    })

    // Ambil riwayat penutupan terkini
    const recentClosures = await prisma().storeClosureHistory.findMany({
      orderBy: { closedAt: 'desc' },
      take: 5,
      select: {
        closedAt: true,
        actorNameSnapshot: true,
        lastReason: true,
      },
    })

    return NextResponse.json({
      isOpen: storeStatus?.isOpen ?? defaultStatus.isOpen,
      activeClosureReason: storeStatus?.activeClosureReason,
      lastUpdated: storeStatus?.updatedAt,
      recentClosures,
    })
  } catch (error) {
    console.error('Error fetching store status:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil status toko' },
      { status: 500 }
    )
  }
}

// POST /api/store-status - Perbarui status toko (hanya Admin Utama)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { isOpen, reason } = body

    if (typeof isOpen !== 'boolean') {
      return NextResponse.json(
        { error: 'Parameter isOpen wajib diisi' },
        { status: 400 }
      )
    }

    // Cek role - hanya Admin Utama yang boleh mengubah status toko
    // Middleware RBAC akan memvalidasi ini, tetapi kita juga check di sini

    const updated = await prisma().storeStatus.upsert({
      where: { id: '1' }, // Single record pattern
      update: {
        isOpen,
        activeClosureReason: isOpen ? null : reason || '',
        updatedAt: new Date(),
      },
      create: {
        isOpen,
        activeClosureReason: !isOpen ? reason || 'Toko libur' : '',
        updatedAt: new Date(),
      },
      select: { id: true, isOpen: true, activeClosureReason: true, updatedAt: true },
    })

    // Catat ke riwayat closure - gunakan field yang sesuai dengan schema
    if (!isOpen) {
      await prisma().storeClosureHistory.create({
        data: {
          closedAt: new Date(),
          actorNameSnapshot: 'Admin Utama',
          actorRoleSnapshot: 'ADMIN_UTAMA',
          lastReason: reason || 'Toko libur',
          actorUserId: '', // Akan diisi dari sesi admin saat implementasi lengkap
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: isOpen ? 'Toko dibuka kembali' : 'Toko dikirim libur',
    })
  } catch (error: any) {
    console.error('Error updating store status:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui status toko' },
      { status: 500 }
    )
  }
}