import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/kbanner - Carousel banner aktif untuk publik
export async function GET(request: Request) {
  try {
    // Hanya tampilkan banner dengan status ACTIVE
    const banners = await ((prisma as any).banner.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    })) as any[]

    return NextResponse.json({ banners })
  } catch (error: any) {
    console.error('Error fetching public banners:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data banner' },
      { status: 500 }
    )
  }
}