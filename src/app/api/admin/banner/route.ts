import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser, type SessionUser } from '@/lib/auth'

// Tipe minimal banner yang dikembalikan ke klien
type BannerRecord = {
  id: string
  title: string | null
  description: string | null
  imageUrl: string
  url: string | null
  sortOrder: number
  status: string
  submittedById: string
  rejectedById: string | null
  rejectedAt: Date | null
  rejectReason: string | null
  createdAt: Date
}

/**
 * Sembunyikan data sensitif dari Admin Biasa (GR-03):
 * - rejectReason hanya untuk Admin Utama
 * - identitas penolak (rejectedById) tidak pernah dikirim ke Admin Biasa
 */
function sanitizeBanner(banner: BannerRecord, role: SessionUser['role']) {
  const base = {
    id: banner.id,
    title: banner.title,
    description: banner.description,
    imageUrl: banner.imageUrl,
    url: banner.url,
    sortOrder: banner.sortOrder,
    status: banner.status,
    createdAt: banner.createdAt,
    submittedById: banner.submittedById,
  }

  if (role === 'ADMIN_UTAMA') {
    return {
      ...base,
      rejectedById: banner.rejectedById,
      rejectedAt: banner.rejectedAt,
      rejectReason: banner.rejectReason,
    }
  }

  return base
}

// POST /api/admin/banner - Admin mengajukan banner baru (status PENDING)
// Kuota: maksimal 3 PENDING per Admin Biasa
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json(
        { error: 'Hanya admin yang boleh mengajukan banner' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, imageUrl, url } = body

    if (!imageUrl || String(imageUrl).trim().length === 0) {
      return NextResponse.json({ error: 'Gambar banner wajib diunggah' }, { status: 400 })
    }

    const client = prisma()

    // Kuota 3 PENDING hanya berlaku untuk Admin Biasa
    if (user.role === 'ADMIN_BIASA') {
      const pendingCount = await client.banner.count({
        where: { submittedById: user.id, status: 'PENDING' },
      })

      if (pendingCount >= 3) {
        return NextResponse.json(
          { error: 'Kuota pengajuan banner PENDING maksimal 3 sudah tercapai' },
          { status: 403 }
        )
      }
    }

    const banner = await client.banner.create({
      data: {
        title: title ? String(title) : null,
        description: description ? String(description) : null,
        imageUrl: String(imageUrl).trim(),
        url: url ? String(url).trim() : null,
        status: 'PENDING',
        submittedById: user.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        banner: sanitizeBanner(banner as BannerRecord, user.role),
        message: 'Banner berhasil diajukan, menunggu persetujuan Admin Utama',
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Error creating banner:', error)
    return NextResponse.json({ error: 'Gagal membuat banner' }, { status: 500 })
  }
}

// GET /api/admin/banner - Daftar banner sesuai peran
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json(
        { error: 'Hanya admin yang boleh melihat daftar banner' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || ''

    const where: { submittedById?: string; status?: string } = {}

    // Admin Biasa hanya melihat banner miliknya sendiri
    if (user.role === 'ADMIN_BIASA') {
      where.submittedById = user.id
    }
    if (statusFilter) {
      where.status = statusFilter
    }

    const banners = await prisma().banner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      banners: (banners as BannerRecord[]).map((b) => sanitizeBanner(b, user.role)),
    })
  } catch (error: unknown) {
    console.error('Error fetching banners:', error)
    return NextResponse.json({ error: 'Gagal mengambil data banner' }, { status: 500 })
  }
}
