import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/kbanner - Carousel banner aktif untuk publik
// Hanya mengembalikan field yang aman ditampilkan (tanpa data internal/audit).
export async function GET() {
  try {
    const banners = await prisma().banner.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        url: true,
        sortOrder: true,
      },
    })

    return NextResponse.json({ banners })
  } catch (error: unknown) {
    console.error('Error fetching public banners:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data banner' },
      { status: 500 }
    )
  }
}
