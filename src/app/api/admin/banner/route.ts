import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Helper: ambil user role dari session
const getUserRole = (): 'ADMIN_BIASA' | 'ADMIN_UTAMA' | 'PENGUNGGUNG' | 'CUSTOMER' => {
  return 'ADMIN_BIASA' // Default untuk testing; di implementasi nyoba dari session
}

// POST /api/admin/banner - Admin Biasa mengajukan banner baru
// Kuota maksimal 3 Pending per Admin Biasa
export async function POST(request: Request) {
  try {
    const role = getUserRole()

    // Hanya Admin Biasa yang boleh ajukan
    if (role !== 'ADMIN_BIASA') {
      return NextResponse.json(
        { error: 'Hanya Admin Biasa yang boleh mengajukan banner' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, imageUrl, url } = body

    // Validasi: gambar wajib
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Gambar banner wajib diunggah' },
        { status: 400 }
      )
    }

    // Cek kuota: Admin Biasa boleh maksimal 3 pending
    const pendingCount = await ((prisma as any).banner.count({
      where: {
        submittedById: 'admin-session-id',
        status: 'PENDING',
      },
    })) as number

    if (pendingCount >= 3) {
      return NextResponse.json(
        { error: 'Kuota pengajuan banner PENDING maksimal 3 sudah tercapai' },
        { status: 403 }
      )
    }

    // Buat banner dengan status PENDING
    const banner = await ((prisma as any).banner.create({
      data: {
        title,
        description,
        imageUrl,
        url,
        status: 'PENDING',
        submittedById: 'admin-session-id',
      },
    })) as any

    return NextResponse.json({
      success: true,
      banner,
      message: 'Banner berhasil diajukan, menunggu persetujuan Admin Utama',
    })
  } catch (error: any) {
    console.error('Error creating banner:', error)
    return NextResponse.json(
      { error: 'Gagal membuat banner' },
      { status: 500 }
    )
  }
}

// GET /api/admin/banner - Daftar banner (dilihat berdasarkan peran)
export async function GET(request: Request) {
  try {
    const role = getUserRole()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || ''

    const where: any = {}

    // Jika Admin Biasa, hanya lihat pending-nya sendiri
    if (role === 'ADMIN_BIASA') {
      where.submittedById = 'admin-session-id'
      if (statusFilter) {
        where.status = statusFilter
      }
    }
    // Jika Admin Utama, boleh filter semua status
    else if (role === 'ADMIN_UTAMA') {
      if (statusFilter) {
        where.status = statusFilter
      }
    }
    // Pengunjung/Customer tidak boleh lihat daftar banner

    const banners = await ((prisma as any).banner.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })) as any[]

    return NextResponse.json({ banners })
  } catch (error: any) {
    console.error('Error fetching banners:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data banner' },
      { status: 500 }
    )
  }
}