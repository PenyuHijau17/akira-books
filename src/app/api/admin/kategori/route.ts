// src/app/api/admin/kategori/route.ts
// Daftar kategori buku untuk dropdown dan penambahan kategori cepat.
// GR-02: otorisasi server-side untuk Admin Biasa dan Admin Utama.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { butuhAksesAdmin } from '@/lib/rbac'
import { catatAudit } from '@/lib/pembayaranServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

// GET /api/admin/kategori — daftar kategori untuk dropdown.
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!butuhAksesAdmin(user.role)) return gagal('Hanya admin yang dapat melihat kategori', 403)

    const categories = await prisma().category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching kategori:', error)
    return gagal('Gagal mengambil daftar kategori', 500)
  }
}

// POST /api/admin/kategori — tambah kategori cepat (idempoten bila sudah ada).
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!butuhAksesAdmin(user.role)) return gagal('Hanya admin yang dapat menambah kategori', 403)

    const body = await request.json().catch(() => null)
    const nama = String(body?.name ?? '').trim()
    if (!nama) return gagal('Nama kategori wajib diisi', 400)
    if (nama.length > 80) return gagal('Nama kategori maksimal 80 karakter', 400)

    try {
      const kategori = await prisma().category.create({ data: { name: nama } })
      await catatAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'BUAT_KATEGORI',
        targetEntity: 'Category',
        targetId: kategori.id,
        oldValue: {},
        newValue: { id: kategori.id, name: kategori.name },
        reason: 'Penambahan kategori cepat dari panel buku',
      })
      return NextResponse.json(
        { success: true, category: kategori, message: 'Kategori berhasil ditambahkan' },
        { status: 201 }
      )
    } catch (error: any) {
      const bentrok =
        error?.code === 'P2002' || String(error?.message || '').includes('Unique constraint')
      if (bentrok) {
        const ada = await prisma().category.findUnique({ where: { name: nama } })
        if (ada) {
          return NextResponse.json({ success: true, category: ada, message: 'Kategori sudah tersedia' })
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Error creating kategori:', error)
    return gagal('Gagal menambah kategori', 500)
  }
}
