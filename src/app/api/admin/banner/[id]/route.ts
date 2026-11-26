import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser, type SessionUser } from '@/lib/auth'
import type { Prisma } from '@/generated/prisma/client'

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

/**
 * Catat aksi Admin Utama ke AdminAuditLog (append-only, GR-06).
 * Kegagalan audit tidak boleh menggagalkan aksi utama, tetapi dicatat di log server.
 */
async function catatAudit(
  client: ReturnType<typeof prisma>,
  user: SessionUser,
  action: string,
  targetId: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  reason?: string | null
) {
  try {
    await client.adminAuditLog.create({
      data: {
        actorId: user.id,
        actorRoleSnapshot: user.role,
        action,
        targetEntity: 'Banner',
        targetId,
        oldValue: oldValue as Prisma.InputJsonValue,
        newValue: newValue as Prisma.InputJsonValue,
        reason: reason ?? null,
      },
    })
  } catch (err) {
    console.error('Gagal mencatat audit banner:', err)
  }
}

function snapshot(banner: BannerRecord) {
  return {
    status: banner.status,
    title: banner.title,
    description: banner.description,
    imageUrl: banner.imageUrl,
    url: banner.url,
    sortOrder: banner.sortOrder,
  }
}

// GET /api/admin/banner/[id] - Detail banner
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id: bannerId } = await params
    const banner = await prisma().banner.findUnique({ where: { id: bannerId } })

    if (!banner) {
      return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })
    }

    // Admin Biasa hanya boleh melihat banner miliknya sendiri
    if (user.role === 'ADMIN_BIASA' && banner.submittedById !== user.id) {
      return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      banner: sanitizeBanner(banner as BannerRecord, user.role),
    })
  } catch (error: unknown) {
    console.error('Error fetching banner:', error)
    return NextResponse.json({ error: 'Gagal mengambil data banner' }, { status: 500 })
  }
}

// PUT /api/admin/banner/[id] - Aksi terhadap banner
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id: bannerId } = await params
    const body = await request.json()
    const { action, rejectReason, sortOrder, title, description, imageUrl, url } = body

    const client = prisma()
    const banner = await client.banner.findUnique({ where: { id: bannerId } })

    if (!banner) {
      return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })
    }

    const bannerRec = banner as BannerRecord

    // ===== Batal mandiri oleh Admin Biasa (PENDING -> CANCELLED, tanpa notifikasi) =====
    if (action === 'cancel') {
      if (bannerRec.submittedById !== user.id && user.role !== 'ADMIN_UTAMA') {
        return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })
      }
      if (bannerRec.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Hanya banner berstatus Menunggu yang dapat dibatalkan' },
          { status: 400 }
        )
      }

      const updated = await client.banner.update({
        where: { id: bannerId },
        data: { status: 'CANCELLED' },
      })

      return NextResponse.json({
        success: true,
        banner: sanitizeBanner(updated as BannerRecord, user.role),
      })
    }

    // ===== Aksi lain hanya untuk Admin Utama =====
    if (user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json(
        { error: 'Hanya Admin Utama yang boleh melakukan aksi ini' },
        { status: 403 }
      )
    }

    const currentStatus = bannerRec.status

    // Kuota maksimal 7 banner ACTIVE (tanpa penggantian otomatis)
    if (action === 'activate' || action === 'approve') {
      const activeCount = await client.banner.count({ where: { status: 'ACTIVE' } })
      if (activeCount >= 7) {
        return NextResponse.json(
          { error: 'Kuota banner AKTIF maksimal 7 sudah tercapai' },
          { status: 403 }
        )
      }
    }

    // Larangan mengubah konten banner yang sudah terbit
    if (currentStatus === 'ACTIVE' && action === 'edit') {
      return NextResponse.json(
        {
          error:
            'Banner yang sudah terbit tidak bisa diedit kontennya. Nonaktifkan terlebih dahulu.',
        },
        { status: 403 }
      )
    }

    // Larangan duplikat kombinasi imageUrl + url pada banner ACTIVE lain
    if (action === 'activate' || action === 'approve') {
      const targetImage = imageUrl ? String(imageUrl) : bannerRec.imageUrl
      const targetUrl = url ? String(url) : bannerRec.url

      if (targetImage) {
        const duplicate = await client.banner.count({
          where: {
            status: 'ACTIVE',
            id: { not: bannerId },
            imageUrl: targetImage,
            url: targetUrl ?? null,
          },
        })
        if (duplicate > 0) {
          return NextResponse.json(
            { error: 'Kombinasi gambar + URL duplikat sudah ada di banner aktif lain' },
            { status: 403 }
          )
        }
      }
    }

    let updated

    switch (action) {
      case 'approve': {
        if (currentStatus !== 'PENDING') {
          return NextResponse.json(
            { error: 'Hanya banner Menunggu yang bisa disetujui' },
            { status: 400 }
          )
        }
        updated = await client.banner.update({
          where: { id: bannerId },
          data: {
            status: 'ACTIVE',
            sortOrder: sortOrder !== undefined ? Number(sortOrder) : bannerRec.sortOrder,
            rejectedById: null,
            rejectedAt: null,
            rejectReason: null,
          },
        })
        break
      }

      case 'reject': {
        if (currentStatus !== 'PENDING') {
          return NextResponse.json(
            { error: 'Hanya banner Menunggu yang bisa ditolak' },
            { status: 400 }
          )
        }
        updated = await client.banner.update({
          where: { id: bannerId },
          data: {
            status: 'REJECTED',
            rejectedById: user.id,
            rejectedAt: new Date(),
            rejectReason: rejectReason ? String(rejectReason) : 'Tidak ada alasan',
          },
        })
        break
      }

      case 'activate': {
        if (currentStatus !== 'INACTIVE') {
          return NextResponse.json(
            { error: 'Hanya banner Nonaktif yang bisa diaktifkan' },
            { status: 400 }
          )
        }
        updated = await client.banner.update({
          where: { id: bannerId },
          data: { status: 'ACTIVE' },
        })
        break
      }

      case 'deactivate': {
        if (currentStatus !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Hanya banner Aktif yang bisa dinonaktifkan' },
            { status: 400 }
          )
        }
        updated = await client.banner.update({
          where: { id: bannerId },
          data: { status: 'INACTIVE' },
        })
        break
      }

      case 'sort': {
        updated = await client.banner.update({
          where: { id: bannerId },
          data: {
            sortOrder:
              sortOrder !== undefined ? Number(sortOrder) : bannerRec.sortOrder,
          },
        })
        break
      }

      case 'edit': {
        updated = await client.banner.update({
          where: { id: bannerId },
          data: {
            title: title !== undefined ? String(title) : bannerRec.title,
            description:
              description !== undefined ? String(description) : bannerRec.description,
            imageUrl: imageUrl !== undefined ? String(imageUrl) : bannerRec.imageUrl,
            url: url !== undefined ? String(url) : bannerRec.url,
          },
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
    }

    // Audit hanya untuk aksi Admin Utama (append-only)
    await catatAudit(
      client,
      user,
      action,
      bannerId,
      snapshot(bannerRec),
      snapshot(updated as BannerRecord),
      rejectReason ? String(rejectReason) : null
    )

    return NextResponse.json({
      success: true,
      banner: sanitizeBanner(updated as BannerRecord, user.role),
    })
  } catch (error: unknown) {
    console.error('Error updating banner:', error)
    return NextResponse.json({ error: 'Gagal memperbarui banner' }, { status: 500 })
  }
}

// DELETE /api/admin/banner/[id] - Admin Utama: hapus permanen
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json(
        { error: 'Hanya Admin Utama yang boleh menghapus banner' },
        { status: 403 }
      )
    }

    const { id: bannerId } = await params
    const client = prisma()

    const banner = await client.banner.findUnique({ where: { id: bannerId } })
    if (!banner) {
      return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })
    }

    await client.banner.delete({ where: { id: bannerId } })

    await catatAudit(
      client,
      user,
      'delete',
      bannerId,
      snapshot(banner as BannerRecord),
      {},
      null
    )

    return NextResponse.json({
      success: true,
      message: 'Banner berhasil dihapus permanen',
    })
  } catch (error: unknown) {
    console.error('Error deleting banner:', error)
    return NextResponse.json({ error: 'Gagal menghapus banner' }, { status: 500 })
  }
}
